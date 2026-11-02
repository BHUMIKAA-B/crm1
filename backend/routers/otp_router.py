"""OTP endpoints for Indian mobile verification."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from services.otp import normalize_indian_mobile, send_otp_via_provider, verify_otp_via_provider

router = APIRouter(prefix="/api", tags=["otp"])


class OtpSendRequest(BaseModel):
    mobile: str

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, value: str) -> str:
        return normalize_indian_mobile(value)


class OtpVerifyRequest(BaseModel):
    mobile: str
    otp: str

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, value: str) -> str:
        return normalize_indian_mobile(value)

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) != 6 or not cleaned.isdigit():
            raise ValueError("Please enter a valid 6-digit OTP.")
        return cleaned


@router.post("/otp/send")
async def send_otp(payload: OtpSendRequest):
    """Send a 6-digit One-Time Password for phone verification via email."""
    try:
        await send_otp_via_provider(payload.mobile)
    except RuntimeError as exc:
        if "not configured" in str(exc).lower():
            raise HTTPException(status_code=503, detail="OTP provider not configured. Set RESEND_API_KEY and OTP_EMAIL_TO / RESEND_NOTIFY_EMAIL.") from exc
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"success": True, "message": "OTP sent successfully."}


@router.post("/otp/verify")
async def verify_otp(payload: OtpVerifyRequest):
    """Check the submitted OTP against the configured email-backed verification flow."""
    try:
        is_valid = await verify_otp_via_provider(payload.mobile, payload.otp)
    except RuntimeError as exc:
        if "not configured" in str(exc).lower():
            raise HTTPException(status_code=503, detail="OTP provider not configured. Set RESEND_API_KEY and OTP_EMAIL_TO / RESEND_NOTIFY_EMAIL.") from exc
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid OTP. Please check and try again.")

    return {"success": True, "verified": True, "message": "Mobile number verified successfully."}
