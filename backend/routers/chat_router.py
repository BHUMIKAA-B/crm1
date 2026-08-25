# -*- coding: utf-8 -*-
"""Chat router - smart property assistant backed by live MongoDB data."""
from __future__ import annotations

import logging
import re
import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

import db
from auth import get_current_user_optional

log = logging.getLogger("visitsarva")
router = APIRouter(prefix="/api/chat", tags=["chat"])

RS = "\u20b9"   # rupee sign - safe as a variable, not a literal token


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, strip_whitespace=True)
    session_id: Optional[str] = Field(None, max_length=64)


class ChatMessageResponse(BaseModel):
    reply: str
    session_id: str


# ---------------------------------------------------------------------------
# Intent detection
# ---------------------------------------------------------------------------

_GREET = re.compile(r"\b(hi|hello|hey|helo|namaste|good\s*(morning|evening|afternoon))\b", re.I)
_THANKS = re.compile(r"\b(thanks|thank\s*you|thx|ty|shukriya)\b", re.I)
_BYE   = re.compile(r"\b(bye|goodbye|see\s*you|ciao)\b", re.I)

_BROKERAGE = re.compile(r"\b(brokerage|commission|fee|charge|zero)\b", re.I)
_EMI       = re.compile(r"\b(emi|loan|interest|home\s*loan|bank)\b", re.I)
_VISIT     = re.compile(r"\b(visit|schedule|site\s*visit|tour|appointment)\b", re.I)
_HOW_WORK  = re.compile(r"\b(how\s*(does|do|it|this)\s*work|process|explain|tell\s*me\s*about)\b", re.I)
_CONTACT   = re.compile(r"\b(contact|reach|call|whatsapp|owner|seller|agent)\b", re.I)

_PROPERTY_QUERY = re.compile(
    r"\b(property|flat|apartment|villa|plot|house|bhk|rent|buy|sale|shop|office|land|listing)\b", re.I
)

CITY_ALIASES = {
    "bangalore": "bangalore", "bengaluru": "bangalore",
    "hyderabad": "hyderabad",
    "mumbai": "mumbai", "bombay": "mumbai",
    "pune": "pune",
    "delhi": "delhi",
    "gurgaon": "gurgaon", "gurugram": "gurgaon",
    "noida": "noida",
    "chennai": "chennai", "madras": "chennai",
    "kolkata": "kolkata", "calcutta": "kolkata",
    "ahmedabad": "ahmedabad",
    "jaipur": "jaipur",
    "kochi": "kochi", "cochin": "kochi",
}

# Pre-compiled word-boundary patterns for city + category detection
_CITY_RE = {
    alias: re.compile(r"\b" + re.escape(alias) + r"\b", re.I)
    for alias in CITY_ALIASES
}

CATEGORY_MAP = {
    "apartment": "apartment", "flat": "apartment",
    "villa": "residential", "house": "residential", "bungalow": "residential",
    "plot": "plot",
    "shop": "commercial", "office": "commercial", "commercial": "commercial",
    "rental": "rental",
    "agriculture": "agriculture", "farm": "agriculture",
}
_CAT_RE = {
    kw: re.compile(r"\b" + re.escape(kw) + r"\b", re.I)
    for kw in CATEGORY_MAP
}


def _parse_query(text: str) -> dict:
    """Extract MongoDB filters from a natural-language query."""
    t = text.lower()
    q: dict = {"status": "published"}

    # BHK
    m = re.search(r"(\d)\s*bhk", t)
    if m:
        q["bedrooms"] = int(m.group(1))

    # Budget: "under/below X lakh/crore"
    m = re.search(
        r"(?:under|below|within|upto|up to|less than)\s*[" + RS + r"]?\s*(\d+(?:\.\d+)?)\s*(lakh|l\b|crore|cr\b)",
        t,
    )
    if m:
        val = float(m.group(1))
        unit = m.group(2).strip()
        val *= 1_00_00_000 if unit in ("crore", "cr") else 1_00_000
        q["price"] = {"$lte": int(val)}

    # Range: "between X and Y lakhs"
    m = re.search(
        r"between\s*[" + RS + r"]?\s*(\d+(?:\.\d+)?)\s*(lakh|l\b|crore|cr\b)\s*(?:and|to|-)\s*[" + RS + r"]?\s*(\d+(?:\.\d+)?)",
        t,
    )
    if m:
        lo = float(m.group(1)) * (1_00_00_000 if "crore" in m.group(2) else 1_00_000)
        hi = float(m.group(3)) * (1_00_00_000 if "crore" in m.group(2) else 1_00_000)
        q["price"] = {"$gte": int(lo), "$lte": int(hi)}

    # City — word-boundary aware
    for alias, pattern in _CITY_RE.items():
        if pattern.search(t):
            canonical = CITY_ALIASES[alias]
            q["location.city"] = {"$regex": canonical[:4], "$options": "i"}
            break

    # Category — word-boundary aware
    for kw, pattern in _CAT_RE.items():
        if pattern.search(t):
            q["category"] = CATEGORY_MAP[kw]
            break

    # Furnishing
    if re.search(r"\bfully[\s-]?furnished\b", t):
        q["furnishing"] = "fully_furnished"
    elif re.search(r"\bsemi[\s-]?furnished\b", t):
        q["furnishing"] = "semi_furnished"
    elif re.search(r"\bunfurnished\b", t):
        q["furnishing"] = "unfurnished"

    return q


def _fmt_price(price: int | float) -> str:
    if price >= 1_00_00_000:
        s = f"{price / 1_00_00_000:.2f}"
        return RS + s.rstrip("0").rstrip(".") + " Cr"
    if price >= 1_00_000:
        s = f"{price / 1_00_000:.1f}"
        return RS + s.rstrip("0").rstrip(".") + " L"
    return RS + f"{int(price):,}"


async def _search_properties(text: str, limit: int = 5) -> tuple[list[dict], bool]:
    """Return (properties, is_exact_match) from MongoDB.

    is_exact_match=True means filters were applied and results match them.
    is_exact_match=False means we fell back to latest published listings.
    """
    q = _parse_query(text)
    proj = {
        "_id": 0, "id": 1, "title": 1, "price": 1,
        "location": 1, "bedrooms": 1, "category": 1, "area": 1,
    }
    # Exact match: filters beyond status=published exist
    has_filters = len(q) > 1
    props = (
        await db.properties()
        .find(q, proj)
        .sort("created_at", -1)
        .limit(limit)
        .to_list(length=limit)
    )
    if props and has_filters:
        return props, True
    # Broad fallback — latest published
    if not props:
        props = (
            await db.properties()
            .find({"status": "published"}, proj)
            .sort("created_at", -1)
            .limit(limit)
            .to_list(length=limit)
        )
    return props, False


def _format_properties(props: list[dict]) -> str:
    if not props:
        return ""
    lines: list[str] = []
    for p in props:
        loc = p.get("location") or {}
        city = loc.get("city", "")
        area_name = loc.get("area", "") or loc.get("locality", "")
        location_str = ", ".join(x for x in [area_name, city] if x)
        price_str = _fmt_price(p.get("price", 0))
        beds = p.get("bedrooms")
        bed_str = f"{beds} BHK | " if beds else ""
        cat = (p.get("category") or "").replace("_", " ").title()
        area = p.get("area") or {}
        size_str = f" | {area.get('size', '')} {area.get('unit','sqft')}" if area.get("size") else ""
        lines.append(
            f"- **{p.get('title', 'Property')}**\n"
            f"  {bed_str}{cat}{size_str} | {location_str} | **{price_str}**"
        )
    return "\n\n".join(lines)


# ---------------------------------------------------------------------------
# Intent handlers
# ---------------------------------------------------------------------------

async def _handle_property_search(text: str) -> str:
    props, is_exact = await _search_properties(text)
    formatted = _format_properties(props)
    if not formatted:
        return (
            "I couldn't find any listings right now. "
            "Try broadening your search - a higher budget or a different area. "
            "You can also use the **Browse** page to filter properties yourself."
        )
    count = len(props)
    plural = "s" if count > 1 else ""
    if is_exact:
        intro = f"Here {'are' if count > 1 else 'is'} {count} matching listing{plural}:\n\n"
    else:
        intro = (
            "I couldn't find exact matches for your criteria, but here are some "
            f"recent listing{plural} you might like:\n\n"
        )
    outro = (
        "\n\n**Tap any listing** to view full details and send an enquiry "
        "directly to the owner - no broker, no commission."
    )
    return intro + formatted + outro


def _handle_emi(text: str) -> str:
    return (
        "**EMI Calculator**\n\n"
        "On any property detail page, open the **EMI Calculator** tab in the right sidebar. "
        "Use the sliders for:\n"
        "- Loan amount (% of price)\n"
        "- Interest rate\n"
        "- Tenure (years)\n\n"
        "**Quick estimate:** For a 50 lakh loan at 9% for 20 years, "
        "the EMI works out to roughly **44,986/month**.\n\n"
        "Most banks offer home loans at 8.5-9.5% p.a. for up to 30 years."
    )


def _handle_brokerage() -> str:
    return (
        "**Zero Brokerage - How it works**\n\n"
        "VisitSarva charges **no brokerage** from buyers or sellers:\n\n"
        "- Sellers list their property for free\n"
        "- Buyers browse, enquire and contact sellers directly - no middleman\n"
        "- You pay only the government-mandated registration and stamp duty charges\n\n"
        "We make money through optional premium services (featured listings, legal assistance), "
        "not by taking a cut of your deal."
    )


def _handle_visit() -> str:
    return (
        "**Scheduling a Site Visit**\n\n"
        "1. Open the property listing you are interested in\n"
        "2. Fill out the **Contact Owner** form with your name, phone and message\n"
        "3. The owner gets an instant notification and will call or WhatsApp you to confirm\n\n"
        "All communication is direct between you and the owner - no agent involvement."
    )


def _handle_contact() -> str:
    return (
        "**Contacting a Seller**\n\n"
        "Go to any property listing and use the **Contact Owner** card on the right side. "
        "Choose your preferred contact method:\n"
        "- Phone call\n"
        "- Email\n"
        "- WhatsApp\n\n"
        "The seller gets your enquiry immediately and will respond directly. "
        "No broker in between - ever."
    )


def _handle_how_works() -> str:
    return (
        "**How VisitSarva Works**\n\n"
        "1. **Browse** - Search properties by location, budget, BHK or type\n"
        "2. **Enquire** - Send a direct message to the owner from any listing page\n"
        "3. **Visit** - Schedule a site visit and meet the owner in person\n"
        "4. **Deal** - Negotiate and close - we handle no paperwork or money\n\n"
        "Zero brokerage. Zero hidden charges. Always."
    )


async def _dispatch(text: str) -> str:
    """Route the message to the right handler."""
    t = text.strip()

    if _GREET.search(t):
        return (
            "Hi! I'm the VisitSarva Assistant.\n\n"
            "I can help you:\n"
            "- Find properties (just describe what you need)\n"
            "- Understand our zero-brokerage model\n"
            "- Calculate EMI for a home loan\n"
            "- Schedule a site visit\n\n"
            "What are you looking for today?"
        )

    if _BYE.search(t):
        return "Goodbye! Feel free to come back anytime. Happy house hunting!"

    if _THANKS.search(t):
        return "You're welcome! Let me know if you need anything else."

    if _BROKERAGE.search(t):
        return _handle_brokerage()

    if _EMI.search(t):
        return _handle_emi(t)

    if _VISIT.search(t):
        return _handle_visit()

    if _CONTACT.search(t):
        return _handle_contact()

    if _HOW_WORK.search(t):
        return _handle_how_works()

    if _PROPERTY_QUERY.search(t):
        return await _handle_property_search(t)

    # Generic fallback - try a property search anyway
    props, _ = await _search_properties(t)
    if props:
        return await _handle_property_search(t)

    return (
        "I'm here to help you find properties and answer questions about VisitSarva. "
        "You can ask things like:\n\n"
        "- Show me 2 BHK flats in Bangalore under 60 lakhs\n"
        "- How does zero brokerage work?\n"
        "- How do I schedule a site visit?\n"
        "- Calculate EMI for a home loan\n\n"
        "What would you like to know?"
    )


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/message", response_model=ChatMessageResponse)
async def send_message(
    body: ChatMessageRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    session_id = body.session_id or str(uuid.uuid4())
    reply = await _dispatch(body.message)
    return ChatMessageResponse(reply=reply, session_id=session_id)


@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Reset chat session (called by the Reset button in the UI)."""
    return {"cleared": True}
