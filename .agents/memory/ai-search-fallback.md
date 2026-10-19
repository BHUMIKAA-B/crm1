---
name: AI search fallback
description: Smart property search works without any LLM key via a regex parser.
---

# AI search — regex fallback

## Rule
`backend/routers/ai_router.py` smart_search uses a two-tier approach:
1. LLM (litellm/emergentintegrations) when `EMERGENT_LLM_KEY` or `OPENAI_API_KEY` is set
2. Regex parser (`_regex_parse`) always available — no key needed

**Why:** `emergentintegrations` is not pip-installable in this environment; no LLM key is set by default.

## How to apply
- Regex parser handles: BHK, price (lakhs/crores), city names (50+ Indian cities), category, furnishing, amenity keywords, builder
- Amenities use `$and` + `$regex` for case-insensitive matching
- Soft fallback: if strict query returns 0 results, retries without bedrooms/price filters
- Add `EMERGENT_LLM_KEY` or `OPENAI_API_KEY` to enable LLM mode automatically
