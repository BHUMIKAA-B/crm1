"""
VisitSarva Telephony Service — Twilio Integration
===================================================
Handles:
  - Outbound call initiation via Twilio
  - TwiML generation for AI conversation flow
  - Webhook signature verification
  - Phone number normalisation for India
  - Call status tracking

Environment variables required:
  TWILIO_ACCOUNT_SID     — Twilio account SID
  TWILIO_AUTH_TOKEN      — Twilio auth token
  TWILIO_CALLER_ID       — Verified/purchased phone number (E.164, e.g. +912212345678)
  TWILIO_WEBHOOK_BASE    — Public HTTPS base URL of this backend (e.g. https://api.visitsarva.com)
  CALLING_ENABLED        — "true" to enable outbound calls (default: false — safe default)
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import re
from typing import Optional
from urllib.parse import urlencode

import httpx

log = logging.getLogger("visitsarva.telephony")


# ─── Configuration helpers ─────────────────────────────────────────────────────

def is_calling_enabled() -> bool:
    return os.environ.get("CALLING_ENABLED", "false").lower() == "true"


def _get_twilio_creds() -> tuple[str, str, str]:
    sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
    token = os.environ.get("TWILIO_AUTH_TOKEN", "")
    caller_id = os.environ.get("TWILIO_CALLER_ID", "")
    return sid, token, caller_id


def _get_webhook_base() -> str:
    base = os.environ.get("TWILIO_WEBHOOK_BASE", "").rstrip("/")
    return base


def is_twilio_configured() -> bool:
    sid, token, caller_id = _get_twilio_creds()
    return bool(sid and token and caller_id and _get_webhook_base())


# ─── Phone normalisation ───────────────────────────────────────────────────────

def normalise_phone(raw: str) -> Optional[str]:
    """
    Normalise an Indian phone number to E.164 format (+91XXXXXXXXXX).
    Returns None if the number cannot be reliably normalised.
    """
    if not raw:
        return None
    phone = raw.strip()
    phone = re.sub(r"[\s\-().]+", "", phone)
    phone = phone.removeprefix("whatsapp:")

    if phone.startswith("+91") and len(phone) == 13 and phone[3:].isdigit():
        return phone
    if phone.startswith("91") and len(phone) == 12 and phone[2:].isdigit():
        return "+" + phone
    if len(phone) == 10 and phone.isdigit():
        return "+91" + phone
    # International number already in E.164
    if phone.startswith("+") and len(phone) >= 10:
        return phone
    log.warning("Cannot normalise phone '%s'", raw)
    return None


# ─── DND / consent check ──────────────────────────────────────────────────────

async def check_calling_eligibility(phone: str, opt_out_records: list[str]) -> tuple[bool, str]:
    """
    Check if a phone number is eligible for an outbound call.
    opt_out_records — list of phone numbers that have opted out.
    Returns (eligible: bool, reason: str)
    """
    normalised = normalise_phone(phone)
    if not normalised:
        return False, "Phone number could not be normalised"

    if normalised in opt_out_records:
        return False, "Number has opted out"

    # Check calling hours (IST — offset +05:30)
    from datetime import datetime, timezone, timedelta
    ist = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(ist)
    hour = now_ist.hour

    # Allowed: 9 AM – 9 PM IST, Mon-Sat
    calling_start = int(os.environ.get("CALLING_HOUR_START", "9"))
    calling_end = int(os.environ.get("CALLING_HOUR_END", "21"))

    if not (calling_start <= hour < calling_end):
        return False, f"Outside calling hours ({calling_start}:00–{calling_end}:00 IST)"
    if now_ist.weekday() == 6:  # Sunday
        return False, "No calls on Sundays"

    return True, "eligible"


# ─── Outbound call initiation ──────────────────────────────────────────────────

async def initiate_call(
    call_job_id: str,
    to_phone: str,
    enquiry_id: str,
) -> dict:
    """
    Place an outbound call via Twilio.
    Returns { "success": bool, "call_sid": str, "error": str }
    """
    if not is_calling_enabled():
        log.info("Calling disabled — skipping call for job %s", call_job_id)
        return {"success": False, "call_sid": None, "error": "Calling is disabled via CALLING_ENABLED flag"}

    if not is_twilio_configured():
        log.warning("Twilio not configured — cannot initiate call for job %s", call_job_id)
        return {"success": False, "call_sid": None, "error": "Twilio credentials not configured"}

    normalised = normalise_phone(to_phone)
    if not normalised:
        return {"success": False, "call_sid": None, "error": "Invalid phone number"}

    sid, token, caller_id = _get_twilio_creds()
    webhook_base = _get_webhook_base()

    # TwiML webhook URL that Twilio will call when the lead answers
    twiml_url = f"{webhook_base}/api/calling/twiml/{call_job_id}"
    status_url = f"{webhook_base}/api/calling/webhook/status/{call_job_id}"

    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Calls.json"
    payload = {
        "To": normalised,
        "From": caller_id,
        "Url": twiml_url,
        "StatusCallback": status_url,
        "StatusCallbackMethod": "POST",
        "StatusCallbackEvent": ["initiated", "ringing", "answered", "completed"],
        "Timeout": "30",
        "MachineDetection": "Enable",
        "MachineDetectionTimeout": "10",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(url, data=payload, auth=(sid, token))
            if r.status_code in (200, 201):
                data = r.json()
                call_sid = data.get("sid", "")
                log.info("Call initiated: job=%s sid=%s to=%s", call_job_id, call_sid, normalised)
                return {"success": True, "call_sid": call_sid, "error": None}
            else:
                error_text = r.text[:500]
                log.error("Twilio error %s: %s", r.status_code, error_text)
                return {"success": False, "call_sid": None, "error": f"Twilio {r.status_code}: {error_text}"}
    except Exception as e:
        log.exception("Call initiation failed: %s", e)
        return {"success": False, "call_sid": None, "error": str(e)}


# ─── TwiML generation ─────────────────────────────────────────────────────────

def build_opening_twiml(call_job_id: str, opening_text: str) -> str:
    """
    Build TwiML for the opening of the call.
    Uses <Gather> with speech input to capture the user's response.
    Webhook base is used for the gather action URL.
    """
    webhook_base = _get_webhook_base()
    action_url = f"{webhook_base}/api/calling/gather/{call_job_id}"

    opening_escaped = _xml_escape(opening_text)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="{action_url}" method="POST"
          speechTimeout="3" timeout="10" language="en-IN"
          hints="yes, no, busy, call back, apartment, plot, villa, budget, lakhs, crores, Bangalore">
    <Say voice="Polly.Aditi" language="en-IN">{opening_escaped}</Say>
  </Gather>
  <Say voice="Polly.Aditi" language="en-IN">
    I did not hear your response. I will have a representative call you back. Goodbye!
  </Say>
</Response>"""


def build_question_twiml(call_job_id: str, question_text: str, turn_index: int) -> str:
    """Build TwiML to ask a follow-up question and gather speech."""
    webhook_base = _get_webhook_base()
    action_url = f"{webhook_base}/api/calling/gather/{call_job_id}?turn={turn_index}"
    question_escaped = _xml_escape(question_text)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="{action_url}" method="POST"
          speechTimeout="3" timeout="10" language="en-IN">
    <Say voice="Polly.Aditi" language="en-IN">{question_escaped}</Say>
  </Gather>
  <Say voice="Polly.Aditi" language="en-IN">
    I did not catch that. No worries — a VisitSarva representative will follow up with you. Thank you!
  </Say>
  <Hangup/>
</Response>"""


def build_hangup_twiml(closing_text: str) -> str:
    """Build TwiML for call close."""
    text = _xml_escape(closing_text)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">{text}</Say>
  <Hangup/>
</Response>"""


def build_voicemail_twiml() -> str:
    """TwiML response when answering machine is detected."""
    return """<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">
    Hello! This is a message from VisitSarva. We noticed your recent enquiry with us.
    Please visit www.visitsarva.com or call us back at your convenience.
    Thank you for choosing VisitSarva. Have a great day!
  </Say>
  <Hangup/>
</Response>"""


def _xml_escape(text: str) -> str:
    """Escape special XML characters."""
    return (
        text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&apos;")
    )


# ─── Webhook signature verification ───────────────────────────────────────────

def verify_twilio_signature(
    auth_token: str,
    signature: str,
    url: str,
    post_data: dict,
) -> bool:
    """
    Verify that a webhook request genuinely came from Twilio.
    See: https://www.twilio.com/docs/usage/webhooks/webhooks-security
    """
    if not auth_token or not signature:
        return False

    # Build string: URL + sorted POST params + values
    s = url
    for key in sorted(post_data.keys()):
        s += key + str(post_data[key])

    mac = hmac.new(
        auth_token.encode("utf-8"),
        s.encode("utf-8"),
        hashlib.sha1,
    ).digest()
    import base64
    computed = base64.b64encode(mac).decode("utf-8")
    return hmac.compare_digest(computed, signature)
