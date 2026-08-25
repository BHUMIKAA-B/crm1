"""WhatsApp notification service via Twilio."""
from __future__ import annotations

import logging
import os
import re
from typing import Optional

import httpx

log = logging.getLogger("visitsarva.whatsapp")


async def send_whatsapp(to_phone: str, message: str) -> bool:
    """Send a WhatsApp message via Twilio.

    Requires env vars:
      TWILIO_ACCOUNT_SID
      TWILIO_AUTH_TOKEN
      TWILIO_WHATSAPP_FROM  — e.g. "whatsapp:+14155238886" (Twilio sandbox number)

    Returns True if sent, False if not configured or on error.
    """
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_number = os.environ.get("TWILIO_WHATSAPP_FROM", "")

    if not (account_sid and auth_token and from_number):
        log.debug("Twilio not configured — skipping WhatsApp notification")
        return False

    # Ensure whatsapp: prefix on From (strip it first to avoid duplication)
    from_number = from_number.removeprefix("whatsapp:")
    from_number = f"whatsapp:{from_number}"

    # Normalize To phone to E.164 then add whatsapp: prefix
    # Strip all common separators and any existing whatsapp: prefix
    phone = to_phone.strip()
    phone = phone.removeprefix("whatsapp:")
    phone = re.sub(r"[\s\-().]+", "", phone)   # remove spaces, dashes, parens, dots
    if phone.startswith("+"):
        # Already has country code — use as-is
        pass
    elif phone.startswith("91") and len(phone) == 12:
        # Looks like 91XXXXXXXXXX — add + prefix
        phone = "+" + phone
    elif len(phone) == 10 and phone.isdigit():
        # 10-digit Indian mobile number
        phone = "+91" + phone
    else:
        # Unrecognised format — log and skip
        log.warning("WhatsApp: cannot normalise phone '%s', skipping", to_phone)
        return False
    to_wa = f"whatsapp:{phone}"

    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    try:
        async with httpx.AsyncClient(timeout=10.0) as cl:
            r = await cl.post(
                url,
                auth=(account_sid, auth_token),
                data={"From": from_number, "To": to_wa, "Body": message},
            )
            if r.status_code >= 400:
                log.warning("Twilio error %s: %s", r.status_code, r.text)
                return False
            log.info("WhatsApp sent to %s", to_wa)
            return True
    except Exception as e:
        log.warning("WhatsApp send failed: %s", e)
        return False
