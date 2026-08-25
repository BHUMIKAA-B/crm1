---
name: Chatbot architecture
description: How the VisitSarva chat assistant works (no LLM dependency)
---

## Implementation
`backend/routers/chat_router.py` — pure rule-based intent router + live MongoDB property search.

**No LLM used**: `emergentintegrations` is not pip-installable in this Replit environment. `litellm` is installed but no API keys are configured. The chatbot works entirely without external AI services.

## Intent detection
Regex patterns with `re.I` flags for: greeting, thanks, bye, brokerage, EMI, site-visit, contact, how-it-works, property query. All city and category regexes use `\b` word boundaries (not substring match) to avoid false positives like "hydraulic" matching "hyderabad".

## Property search
`_parse_query(text)` extracts MongoDB filters (bedrooms, price, city, category, furnishing). `_search_properties(text)` returns `(props, is_exact_match)`. When `is_exact_match=False`, reply says "couldn't find exact matches, here are suggestions" — never claims fallback results match the query.

## Session management
In-memory dict `_sessions` keyed by session_id (UUID). Max 200 sessions; evicts oldest. Sessions are stateless across restarts.
