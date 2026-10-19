"""
VisitSarva AI Calling Service
==============================
Manages conversation logic for AI-powered outbound calling agent.
Uses Google Gemini for natural language understanding and response generation.

This module is provider-agnostic for the telephony layer — it handles:
  - Enquiry categorisation
  - Dynamic question selection based on existing data
  - Conversation state management
  - Answer extraction and normalisation
  - Summary generation
"""
from __future__ import annotations

import json
import logging
import os
from typing import Optional

log = logging.getLogger("visitsarva.ai_calling")

# ─── Category constants ────────────────────────────────────────────────────────

CAT_PROPERTY_PURCHASE = "property_purchase"
CAT_PROPERTY_SALE = "property_sale"
CAT_VASTU = "vastu"
CAT_KHATA_DOCS = "khata_documentation"
CAT_HOME_LOAN = "home_loan"
CAT_SITE_VISIT = "site_visit"
CAT_GENERAL = "general"

# ─── Question bank ────────────────────────────────────────────────────────────

QUESTIONS: dict[str, list[dict]] = {
    CAT_PROPERTY_PURCHASE: [
        {"key": "property_type", "q": "Are you looking for a plot, apartment, independent house, villa, or commercial property?"},
        {"key": "preferred_location", "q": "Which location or neighbourhood in Bangalore are you interested in?"},
        {"key": "budget", "q": "What is your approximate budget for this purchase?"},
        {"key": "bhk", "q": "How many bedrooms are you looking for, or what is the approximate property size you need?"},
        {"key": "purpose", "q": "Is this property for self-use or for investment purposes?"},
        {"key": "timeline", "q": "Are you looking for an immediate purchase, or are you planning for a later date?"},
        {"key": "site_visit", "q": "Would you like us to arrange a site visit so you can see the property?"},
    ],
    CAT_PROPERTY_SALE: [
        {"key": "property_type", "q": "Is the property you want to sell a plot, apartment, independent house, villa, or commercial space?"},
        {"key": "property_location", "q": "Where is the property located?"},
        {"key": "area", "q": "What is the approximate land area or built-up area of the property?"},
        {"key": "expected_price", "q": "What is the selling price you have in mind?"},
        {"key": "ready_to_sell", "q": "Is the property currently ready for sale?"},
        {"key": "occupancy", "q": "Is the property currently occupied or vacant?"},
        {"key": "selling_timeline", "q": "What is your preferred timeline to complete the sale?"},
        {"key": "representative_contact", "q": "Would you like a VisitSarva representative to contact you for further assistance?"},
    ],
    CAT_VASTU: [
        {"key": "vastu_importance", "q": "How important is Vastu compliance to you in your property search?"},
        {"key": "preferred_entrance", "q": "Do you have a preferred direction for the entrance of the property?"},
        {"key": "directional_preferences", "q": "Do you have any particular directional or layout preferences we should keep in mind?"},
    ],
    CAT_KHATA_DOCS: [
        {"key": "property_ownership", "q": "Are you enquiring about an existing property you own, or a property you intend to purchase?"},
        {"key": "khata_type", "q": "Do you know whether the property has an A Khata, B Khata, e-Khata, or another documentation status?"},
        {"key": "docs_available", "q": "Is the property documentation already available to you, or are you looking for guidance on how to obtain it?"},
        {"key": "follow_up_requested", "q": "Would you like a VisitSarva representative to follow up with you regarding the documentation requirements?"},
    ],
    CAT_HOME_LOAN: [
        {"key": "loan_purpose", "q": "Are you looking for a home loan for a new property purchase or for an existing property?"},
        {"key": "property_value", "q": "What is the approximate property value or loan amount you are considering?"},
        {"key": "property_shortlisted", "q": "Have you already shortlisted a property?"},
        {"key": "preferred_bank", "q": "Do you have a preferred bank or lender in mind?"},
        {"key": "next_steps", "q": "Would you like a VisitSarva representative to contact you about the next steps for your home loan?"},
    ],
    CAT_SITE_VISIT: [
        {"key": "preferred_date", "q": "What date would be most convenient for your site visit?"},
        {"key": "preferred_time", "q": "What time of day works best for you?"},
        {"key": "representative_needed", "q": "Would you like a VisitSarva representative to accompany you during the visit?"},
        {"key": "additional_requirements", "q": "Do you have any specific requirements or questions we should prepare for the visit?"},
    ],
    CAT_GENERAL: [
        {"key": "property_type", "q": "What type of property are you looking for — residential, commercial, plot, or something else?"},
        {"key": "preferred_location", "q": "Do you have a preferred location or area in Bangalore?"},
        {"key": "budget", "q": "Could you share your approximate budget?"},
        {"key": "timeline", "q": "What is your timeline for this — are you looking to move quickly or planning for a later date?"},
        {"key": "next_steps", "q": "Would you like a VisitSarva representative to call you back with more information?"},
    ],
}

# ─── Conversation opening script ─────────────────────────────────────────────

OPENING_SCRIPT = (
    "Hello, am I speaking with {name}? "
    "This is the VisitSarva AI calling assistant. "
    "I am calling regarding the enquiry you recently submitted{property_ref}. "
    "Is this a convenient time for a quick two-minute conversation?"
)

BUSY_ACKNOWLEDGEMENT = (
    "Of course, I completely understand. "
    "I have noted your preference and a VisitSarva representative will follow up with you at a better time. "
    "Have a great day!"
)

HUMAN_REQUEST_ACKNOWLEDGEMENT = (
    "Absolutely! I will connect your request to our team and a VisitSarva representative will call you back shortly. "
    "Thank you for reaching out to us. Have a great day!"
)

OPT_OUT_ACKNOWLEDGEMENT = (
    "I understand and I sincerely apologise for any inconvenience. "
    "I have immediately recorded your request to stop receiving calls. "
    "You will not receive any further automated calls from VisitSarva. "
    "If you ever wish to reconnect with us, please visit www.visitsarva.com. "
    "Have a wonderful day!"
)

CLOSING_SCRIPT = (
    "Thank you, {name}, for taking the time to speak with me. "
    "I have noted all your details. "
    "A VisitSarva representative will follow up with you to assist further. "
    "Have a wonderful day, and thank you for choosing VisitSarva!"
)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def categorise_enquiry(enquiry: dict) -> str:
    """Determine enquiry category from the stored enquiry record."""
    msg = (enquiry.get("message") or "").lower()
    source = (enquiry.get("source") or "").lower()
    enq_type = (enquiry.get("type") or "").lower()

    if "loan" in source or "loan" in msg or enq_type == "loan":
        return CAT_HOME_LOAN
    if "sell" in msg or "sale" in msg:
        return CAT_PROPERTY_SALE
    if "vastu" in msg:
        return CAT_VASTU
    if "khata" in msg or "document" in msg or "conversion" in msg:
        return CAT_KHATA_DOCS
    if "site visit" in msg or "visit" in msg:
        return CAT_SITE_VISIT
    if "buy" in msg or "purchase" in msg or "looking for" in msg or enq_type == "project":
        return CAT_PROPERTY_PURCHASE
    return CAT_GENERAL


def get_unanswered_questions(category: str, existing_answers: dict) -> list[dict]:
    """Return only questions whose keys are not already answered."""
    questions = QUESTIONS.get(category, QUESTIONS[CAT_GENERAL])
    unanswered = []
    for q in questions:
        key = q["key"]
        if key not in existing_answers or not existing_answers[key]:
            unanswered.append(q)
    return unanswered


def build_opening_message(enquiry: dict) -> str:
    name = enquiry.get("name") or enquiry.get("full_name") or "there"
    prop_title = enquiry.get("property_title") or enquiry.get("property_name") or ""
    prop_ref = f" about {prop_title}" if prop_title else ""
    return OPENING_SCRIPT.format(name=name, property_ref=prop_ref)


def build_closing_message(enquiry: dict) -> str:
    name = enquiry.get("name") or enquiry.get("full_name") or "there"
    return CLOSING_SCRIPT.format(name=name)


# ─── LLM-powered conversation assistant ──────────────────────────────────────

async def generate_agent_response(
    conversation_history: list[dict],
    current_question: Optional[str],
    user_utterance: str,
    enquiry_context: dict,
) -> dict:
    """
    Generate the next agent utterance using Google Gemini.
    Returns: { "reply": str, "extracted": dict, "intent": str }
    intent can be: "answer", "busy", "human_request", "opt_out", "unclear", "end"
    """
    try:
        import google.generativeai as genai
        api_key = os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return _fallback_response(user_utterance, current_question)
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
    except Exception as e:
        log.warning("Gemini init failed: %s", e)
        return _fallback_response(user_utterance, current_question)

    system_prompt = f"""You are the VisitSarva AI calling assistant. You are speaking with a real estate enquirer on a phone call.

Enquiry context:
{json.dumps(enquiry_context, indent=2)}

Current question asked to user: {current_question or "(opening / general)"}

Your job:
1. Detect the USER INTENT from their utterance. Intents are:
   - "answer": user is responding to the question
   - "busy": user says they're busy, not available, or wants a callback
   - "human_request": user wants to speak to a human
   - "opt_out": user says stop calling, don't call again, remove from list
   - "unclear": user's response is ambiguous or unclear
   - "end": user wants to end the conversation

2. If intent is "answer", extract the answer value and normalise it.
3. Generate a natural, empathetic follow-up reply that:
   - Acknowledges the user's response warmly
   - Does NOT repeat any question already answered
   - Is concise (1-2 sentences max)
   - Does NOT invent property prices, availability, legal facts, or loan eligibility
   - Says "I'll connect you to our team" if you cannot answer something

Respond ONLY with valid JSON in this exact format:
{{"intent": "answer|busy|human_request|opt_out|unclear|end", "extracted_value": "the extracted answer or empty string", "reply": "your natural language reply to the user"}}"""

    history_text = "\n".join([
        f"{m['role'].upper()}: {m['content']}"
        for m in conversation_history[-6:]  # keep last 6 turns
    ])
    user_prompt = f"""Conversation so far:
{history_text}

USER SAID: {user_utterance}

Respond with JSON only."""

    try:
        response = await model.generate_content_async(
            [system_prompt, user_prompt],
            generation_config={"response_mime_type": "application/json"}
        )
        text = response.text.strip()
        result = json.loads(text)
        return {
            "reply": result.get("reply", ""),
            "extracted": {"value": result.get("extracted_value", "")},
            "intent": result.get("intent", "answer"),
        }
    except Exception as e:
        log.warning("Gemini generate failed: %s", e)
        return _fallback_response(user_utterance, current_question)


def _fallback_response(user_utterance: str, current_question: Optional[str]) -> dict:
    """Simple rule-based fallback when LLM is unavailable."""
    utterance_lower = user_utterance.lower()
    if any(w in utterance_lower for w in ["busy", "later", "call back", "not now", "wrong time"]):
        return {"reply": BUSY_ACKNOWLEDGEMENT, "extracted": {}, "intent": "busy"}
    if any(w in utterance_lower for w in ["human", "person", "agent", "representative", "speak to someone"]):
        return {"reply": HUMAN_REQUEST_ACKNOWLEDGEMENT, "extracted": {}, "intent": "human_request"}
    if any(w in utterance_lower for w in ["stop", "don't call", "remove", "opt out", "unsubscribe", "dnd"]):
        return {"reply": OPT_OUT_ACKNOWLEDGEMENT, "extracted": {}, "intent": "opt_out"}
    return {
        "reply": "Thank you for that. Let me note that down.",
        "extracted": {"value": user_utterance},
        "intent": "answer",
    }


async def generate_lead_summary(
    enquiry: dict,
    answers: dict,
    category: str,
) -> str:
    """Generate a concise AI summary of the lead qualification call."""
    try:
        import google.generativeai as genai
        api_key = os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return _build_manual_summary(enquiry, answers, category)
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
    except Exception:
        return _build_manual_summary(enquiry, answers, category)

    prompt = f"""Summarise this real estate lead qualification call in 2-3 concise sentences for a CRM note.

Enquiry: {json.dumps(enquiry, indent=2)}
Category: {category}
Answers collected during AI call: {json.dumps(answers, indent=2)}

Write a professional CRM summary. Be factual. Do not invent information."""

    try:
        response = await model.generate_content_async(prompt)
        return response.text.strip()
    except Exception:
        return _build_manual_summary(enquiry, answers, category)


def _build_manual_summary(enquiry: dict, answers: dict, category: str) -> str:
    name = enquiry.get("name") or enquiry.get("full_name") or "Lead"
    parts = [f"AI call completed for {name}."]
    parts.append(f"Enquiry category: {category.replace('_', ' ').title()}.")
    if answers:
        answer_parts = [f"{k.replace('_', ' ')}: {v}" for k, v in answers.items() if v]
        if answer_parts:
            parts.append("Collected: " + "; ".join(answer_parts) + ".")
    return " ".join(parts)
