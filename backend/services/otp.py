"""OTP delivery and verification helpers using the project email service.

The frontend should never receive provider credentials or OTP values. The backend
keeps OTP flow server-side and only exposes success/failure responses.
"""
from __future__ import annotations

import logging
import os
import random
import re
import time
from typing import Any

from services.email import send_email

log = logging.getLogger("visitsarva.otp")

_OTP_STORE: dict[str, tuple[str, float]] = {}
_OTP_TTL_SECONDS = 300


def normalize_indian_mobile(raw_phone: str) -> str:
    """Normalize a mobile number to the 10-digit Indian format."""
    if raw_phone is None:
        raise ValueError("Mobile number is required.")
    digits = re.sub(r"\D", "", str(raw_phone))
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if len(digits) != 10 or not digits.isdigit() or int(digits[0]) < 6:
        raise ValueError("Please enter a valid 10-digit Indian mobile number.")
    return digits


def _require_email_otp_config() -> str:
    target = (
        os.environ.get("OTP_EMAIL_TO")
        or os.environ.get("RESEND_NOTIFY_EMAIL")
        or os.environ.get("ADMIN_EMAIL")
        or ""
    ).strip()
    if not target:
        raise RuntimeError(
            "OTP provider not configured. Set RESEND_API_KEY and OTP_EMAIL_TO (or RESEND_NOTIFY_EMAIL / ADMIN_EMAIL)."
        )
    if not os.environ.get("RESEND_API_KEY"):
        raise RuntimeError(
            "OTP provider not configured. Set RESEND_API_KEY to enable email-based OTP delivery."
        )
    return target


async def send_otp_via_provider(phone: str) -> dict[str, Any]:
    """Send a 6-digit OTP via the existing email delivery service."""
    normalized = normalize_indian_mobile(phone)
    email_to = _require_email_otp_config()
    code = f"{random.randint(100000, 999999):06d}"
    _OTP_STORE[normalized] = (code, time.time() + _OTP_TTL_SECONDS)

    subject = "VisitSarva verification code"
    html = f"""
    <div style='font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1a1f2e'>
      <h2 style='color:#0F2340'>Your VisitSarva verification code</h2>
      <p>Use the code below to verify your mobile number and complete your enquiry.</p>
      <p style='font-size:32px;letter-spacing:6px;font-weight:700;color:#0D7A6B;margin:24px 0'>{code}</p>
      <p style='font-size:12px;color:#5b6371'>This code expires in 5 minutes.</p>
    </div>
    """

    sent = await send_email(email_to, subject, html, text=f"Your VisitSarva verification code is {code}. It expires in 5 minutes.")
    if not sent:
        _OTP_STORE.pop(normalized, None)
        raise RuntimeError("Failed to send OTP via configured email provider.")

    log.info("OTP email queued for %s via %s", normalized, email_to)
    return {"success": True, "recipient": email_to}


async def verify_otp_via_provider(phone: str, code: str) -> bool:
    """Validate OTP against the in-process email-backed code store."""
    normalized = normalize_indian_mobile(phone)
    if not code or not code.isdigit() or len(code) != 6:
        raise ValueError("OTP must be a 6-digit numeric code.")

    current = _OTP_STORE.get(normalized)
    if not current:
        return False

    expected_code, expires_at = current
    if time.time() > expires_at:
        _OTP_STORE.pop(normalized, None)
        return False

    is_valid = code == expected_code
    if is_valid:
        _OTP_STORE.pop(normalized, None)
    return is_valid
