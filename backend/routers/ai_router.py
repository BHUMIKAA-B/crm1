"""AI routes — listing assistant + smart property search.

Smart search works in two modes:
1. LLM mode  — when EMERGENT_LLM_KEY (or OPENAI_API_KEY) is set and litellm is available.
2. Regex mode — always available; parses common patterns like "2 BHK in Bangalore under 80 lakhs".
"""
from __future__ import annotations

import json
import os
import re
from fastapi import APIRouter, HTTPException

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
except ModuleNotFoundError:
    LlmChat = None
    UserMessage = None

try:
    import litellm
    _LITELLM_OK = True
except Exception:
    _LITELLM_OK = False

import db
from models import (
    ListingAssistantRequest,
    ListingAssistantResponse,
    SmartSearchRequest,
    SmartSearchResponse,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])

MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-4-5"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _llm_key() -> str:
    """Return the best available LLM key, or raise 503."""
    if LlmChat is None or UserMessage is None:
        raise HTTPException(
            status_code=503,
            detail="Emergent AI package not available; AI assistant is offline",
        )
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="EMERGENT_LLM_KEY not configured")
    return key


def _any_llm_key() -> str | None:
    """Return an LLM API key from any source, or None."""
    return (
        os.environ.get("EMERGENT_LLM_KEY")
        or os.environ.get("OPENAI_API_KEY")
        or os.environ.get("ANTHROPIC_API_KEY")
    )


def _extract_json(text: str) -> dict:
    """Best-effort extraction of the last JSON object in a reply."""
    if not text:
        return {}
    m = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    candidates = re.findall(r"\{(?:[^{}]|(?:\{[^{}]*\}))*\}", text, re.DOTALL)
    for cand in reversed(candidates):
        try:
            return json.loads(cand)
        except Exception:
            continue
    return {}


def _strip_json_block(text: str) -> str:
    return re.sub(r"```json.*?```", "", text, flags=re.DOTALL).strip()


# ── Regex-based search parser (works without any API key) ─────────────────────

_CITIES = [
    "bangalore", "bengaluru", "mumbai", "delhi", "hyderabad", "chennai", "pune",
    "kolkata", "ahmedabad", "jaipur", "surat", "lucknow", "kanpur", "nagpur",
    "indore", "thane", "bhopal", "visakhapatnam", "pimpri", "patna", "vadodara",
    "ghaziabad", "ludhiana", "agra", "nashik", "faridabad", "meerut", "rajkot",
    "kalyan", "vasai", "noida", "gurugram", "gurgaon", "navi mumbai", "mysuru",
    "mysore", "coimbatore", "kochi", "cochin", "mangalore", "hubli", "dharwad",
    "chandigarh", "dehradun", "bhubaneswar", "guwahati", "thiruvananthapuram",
    "thrissur", "tiruchirappalli", "tirupur", "madurai", "salem", "warangal",
    "whitefield", "koramangala", "indiranagar", "hsr layout", "hebbal",
    "marathahalli", "electronic city", "sarjapur", "yelahanka",
]

_CATEGORY_MAP = {
    "apartment": "apartment", "flat": "apartment", "bhk": "apartment",
    "villa": "residential", "house": "residential", "bungalow": "residential",
    "duplex": "residential", "residential": "residential",
    "commercial": "commercial", "office": "commercial", "shop": "commercial",
    "showroom": "commercial", "retail": "commercial",
    "plot": "plot", "land": "plot", "site": "plot",
    "agriculture": "agriculture", "farm": "agriculture", "farmhouse": "agriculture",
    "rental": "rental", "rent": "rental", "pg": "rental",
    "industrial": "industrial", "warehouse": "industrial", "factory": "industrial",
    "construction": "construction_interior", "interior": "construction_interior",
}

_FURNISHING_MAP = {
    "furnished": "furnished", "semi furnished": "semi-furnished",
    "semi-furnished": "semi-furnished", "unfurnished": "unfurnished",
    "fully furnished": "furnished",
}


def _parse_price(num_str: str, unit: str) -> float:
    """Convert '80 lakhs' → 8000000."""
    try:
        n = float(num_str.replace(",", ""))
    except ValueError:
        return 0.0
    u = unit.lower()
    if "crore" in u or "cr" in u:
        return n * 10_000_000
    if "lakh" in u or "lac" in u or "l" == u:
        return n * 100_000
    if "thousand" in u or "k" == u:
        return n * 1_000
    return n


def _regex_parse(query: str) -> dict:
    """Parse a natural-language property query into structured filters."""
    q = query.lower()
    filters: dict = {}
    parts: list[str] = []

    # BHK
    m = re.search(r"(\d+)\s*(?:bhk|bedroom|bed room)", q)
    if m:
        filters["bedrooms"] = int(m.group(1))
        parts.append(f"{m.group(1)} BHK")

    # Max price: "under/below/within/upto X <unit>"
    m = re.search(
        r"(?:under|below|within|upto|up to|less than|max|maximum|budget of?)\s*"
        r"(?:rs\.?\s*|inr\s*|₹\s*)?(\d[\d,.]*)\s*(crore|cr|lakh|lac|l\b|thousand|k\b)?",
        q,
    )
    if m:
        filters["max_price"] = int(_parse_price(m.group(1), m.group(2) or ""))
        parts.append(f"under ₹{m.group(1)} {m.group(2) or ''}")

    # Min price: "above/over/minimum X <unit>"
    m = re.search(
        r"(?:above|over|minimum|atleast|at least|more than|starting from?|from)\s*"
        r"(?:rs\.?\s*|inr\s*|₹\s*)?(\d[\d,.]*)\s*(crore|cr|lakh|lac|l\b|thousand|k\b)?",
        q,
    )
    if m:
        candidate = int(_parse_price(m.group(1), m.group(2) or ""))
        if candidate > 0:
            filters["min_price"] = candidate

    # City — longest match first
    for city in sorted(_CITIES, key=len, reverse=True):
        if re.search(r"\b" + re.escape(city) + r"\b", q):
            filters["city"] = city.title()
            parts.append(f"in {city.title()}")
            break

    # Category
    for kw, cat in sorted(_CATEGORY_MAP.items(), key=lambda x: -len(x[0])):
        if re.search(r"\b" + re.escape(kw) + r"\b", q):
            filters["category"] = cat
            break

    # Furnishing
    for kw, val in sorted(_FURNISHING_MAP.items(), key=lambda x: -len(x[0])):
        if kw in q:
            filters["furnishing"] = val
            parts.append(val)
            break

    # Amenity keywords → passed as free-text to keyword search
    amenity_kws = [
        "swimming pool", "gym", "parking", "garden", "lift", "elevator",
        "security", "clubhouse", "power backup", "metro", "gated community",
        "play area", "terrace", "rooftop",
    ]
    matched_amenities = [a for a in amenity_kws if a in q]
    if matched_amenities:
        filters["amenities"] = matched_amenities
        parts.append(", ".join(matched_amenities))

    # Builder / developer
    m = re.search(r"(?:by|from|developer|builder)\s+([a-z][a-z\s]{2,30}?)(?:\s+in|\s+at|\s+with|$)", q)
    if m:
        filters["builder"] = m.group(1).strip()

    # Keyword fallback: remaining significant tokens
    stopwords = {
        "a", "an", "the", "in", "at", "on", "with", "for", "and", "or", "of",
        "to", "is", "are", "want", "looking", "need", "show", "find", "get",
        "property", "properties", "listing", "flat", "house", "apartment",
        "near", "close", "around", "from", "above", "below", "under", "over",
    }
    tokens = re.sub(r"[^\w\s]", " ", q).split()
    kw_tokens = [t for t in tokens if len(t) > 3 and t not in stopwords]
    if kw_tokens and not parts:
        filters["keyword"] = " ".join(kw_tokens[:5])

    if not parts:
        parts.append("your query")
    summary = f"Showing properties matching {', '.join(parts)}."
    return {"summary": summary, "filters": filters}


async def _llm_parse(query: str) -> dict | None:
    """Try to parse query via LLM. Returns None if unavailable."""
    key = _any_llm_key()
    if not key or not _LITELLM_OK:
        return None

    messages = [
        {
            "role": "system",
            "content": SEARCH_SYSTEM,
        },
        {"role": "user", "content": query},
    ]
    try:
        # Prefer emergentintegrations if available
        if LlmChat is not None and UserMessage is not None and os.environ.get("EMERGENT_LLM_KEY"):
            chat = LlmChat(
                api_key=key,
                session_id=f"search-{os.urandom(4).hex()}",
                system_message=SEARCH_SYSTEM,
            ).with_model(MODEL_PROVIDER, MODEL_NAME)
            reply = await chat.send_message(UserMessage(text=query))
        else:
            resp = await litellm.acompletion(
                model="gpt-4o-mini",
                messages=messages,
                api_key=key,
                temperature=0,
                max_tokens=400,
            )
            reply = resp.choices[0].message.content or ""

        parsed = _extract_json(reply) or {}
        return {
            "summary": parsed.get("summary") or "Here are matches for your query.",
            "filters": parsed.get("filters") or {},
        }
    except Exception:
        return None


# ── Search system prompt (used by LLM mode) ───────────────────────────────────

SEARCH_SYSTEM = """You are VisitSarva's property search assistant.
Convert the user's natural-language property query into structured filters.
Return ONLY a single JSON block — no prose before or after.

```json
{
  "summary": "One sentence describing what we understood.",
  "filters": {
    "category": "",
    "city": "",
    "min_price": null,
    "max_price": null,
    "bedrooms": null,
    "furnishing": "",
    "amenities": [],
    "builder": "",
    "keyword": ""
  }
}
```

Rules:
- category must be one of: commercial, residential, plot, agriculture, apartment, rental, industrial, construction_interior — or "" if unclear.
- Prices in INR integers. Convert: 1 lakh=100000, 1 crore=10000000.
- amenities: list of strings like ["swimming pool","gym","parking"].
- Leave unused fields as "" or null.
"""


# ── Routes ────────────────────────────────────────────────────────────────────

LISTING_SYSTEM = """You are VisitSarva's property listing assistant. \
You help sellers describe their property and prepare a high-quality listing.

Be friendly, concise, and ask one or two focused follow-up questions per turn \
(only what is still missing). Never invent details the seller has not given.

After your conversational reply, ALWAYS append a single JSON block in this exact format:

```json
{
  "title": "",
  "category": "",
  "sub_category": "",
  "description": "",
  "price": 0,
  "price_negotiable": false,
  "bedrooms": 0,
  "bathrooms": 0,
  "floors": 0,
  "facing": "",
  "furnishing": "",
  "amenities": [],
  "features": [],
  "location": { "address": "", "city": "", "state": "", "pincode": "" },
  "area": { "size": 0, "unit": "sqft" }
}
```

Rules:
- `category` MUST be one of: commercial, residential, plot, agriculture, apartment, rental, industrial, construction_interior.
- `area.unit` MUST be one of: sqft, sqm, acre, cent, guntha.
- Only fill fields you have confirmed information for. Leave the rest as empty string, 0, [], or {}.
- Numbers as numbers (not strings). Booleans as true/false.
- IMPORTANT — `title`: As soon as you know at least two of {category, bedrooms, locality, city, sub_category}, produce a non-empty draft title.
- IMPORTANT — `description`: As soon as you have 2-3 facts, produce a 1-2 sentence draft description.
- Re-emit ALL confirmed fields in EVERY turn.
"""


@router.post("/listing-assistant", response_model=ListingAssistantResponse)
async def listing_assistant(body: ListingAssistantRequest):
    chat = LlmChat(
        api_key=_llm_key(),
        session_id=body.session_id,
        system_message=LISTING_SYSTEM,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)

    if body.history:
        primer_lines = ["Prior conversation:"]
        for h in body.history[-10:]:
            primer_lines.append(f"- {h.role.upper()}: {h.content}")
        primer_lines.append(f"USER (now): {body.message}")
        user_text = "\n".join(primer_lines)
    else:
        user_text = body.message

    try:
        reply = await chat.send_message(UserMessage(text=user_text))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {e}")

    extracted = _extract_json(reply)
    reply_clean = _strip_json_block(reply) or "Got it — anything else to add?"
    return ListingAssistantResponse(reply=reply_clean, extracted=extracted)


@router.post("/smart-search", response_model=SmartSearchResponse)
async def smart_search(body: SmartSearchRequest):
    query = body.query.strip()
    if not query:
        results = (
            await db.properties()
            .find({"status": "published"}, {"_id": 0})
            .sort([("created_at", -1)])
            .limit(24)
            .to_list(24)
        )
        return SmartSearchResponse(
            summary="Showing all available properties.",
            filters={},
            results=results,
            count=len(results),
        )

    # Try LLM first, fall back to regex
    llm_result = await _llm_parse(query)
    if llm_result:
        summary = llm_result["summary"]
        filters = llm_result["filters"]
    else:
        parsed = _regex_parse(query)
        summary = parsed["summary"]
        filters = parsed["filters"]

    # Build MongoDB query
    mongo_q: dict = {"status": "published"}

    if filters.get("category"):
        mongo_q["category"] = filters["category"]

    if filters.get("city"):
        mongo_q["location.city"] = {"$regex": re.escape(filters["city"]), "$options": "i"}

    price_q: dict = {}
    if filters.get("min_price") is not None and filters["min_price"]:
        price_q["$gte"] = float(filters["min_price"])
    if filters.get("max_price") is not None and filters["max_price"]:
        price_q["$lte"] = float(filters["max_price"])
    if price_q:
        mongo_q["price"] = price_q

    if filters.get("bedrooms"):
        try:
            mongo_q["bedrooms"] = {"$gte": int(filters["bedrooms"])}
        except Exception:
            pass

    if filters.get("furnishing"):
        mongo_q["furnishing"] = {"$regex": filters["furnishing"], "$options": "i"}

    if filters.get("builder"):
        mongo_q["$or"] = mongo_q.get("$or", []) + [
            {"listed_by_name": {"$regex": re.escape(filters["builder"]), "$options": "i"}},
        ]

    # Amenities: property must contain ALL requested amenity keywords (case-insensitive)
    amenities = filters.get("amenities") or []
    if amenities:
        amenity_conditions = [
            {"amenities": {"$regex": a, "$options": "i"}} for a in amenities
        ]
        existing_and = mongo_q.pop("$and", [])
        mongo_q["$and"] = existing_and + amenity_conditions

    # Keyword fallback
    kw = filters.get("keyword") or ""
    if kw and "$or" not in mongo_q:
        mongo_q["$or"] = [
            {"title": {"$regex": kw, "$options": "i"}},
            {"description": {"$regex": kw, "$options": "i"}},
            {"location.address": {"$regex": kw, "$options": "i"}},
            {"location.city": {"$regex": kw, "$options": "i"}},
            {"amenities": {"$regex": kw, "$options": "i"}},
            {"features": {"$regex": kw, "$options": "i"}},
        ]

    results = (
        await db.properties()
        .find(mongo_q, {"_id": 0})
        .sort([("is_featured", -1), ("created_at", -1)])
        .limit(24)
        .to_list(24)
    )

    # Soft fallback: if strict query returns nothing, widen by dropping bedrooms/price
    if not results and (price_q or filters.get("bedrooms")):
        relaxed = {k: v for k, v in mongo_q.items() if k not in ("price", "bedrooms")}
        results = (
            await db.properties()
            .find(relaxed, {"_id": 0})
            .sort([("is_featured", -1), ("created_at", -1)])
            .limit(24)
            .to_list(24)
        )
        if results:
            summary += " (Showing nearby matches — exact price/BHK not available.)"

    return SmartSearchResponse(
        summary=summary,
        filters=filters,
        results=results,
        count=len(results),
    )
