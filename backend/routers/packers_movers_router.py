"""Packers & Movers enquiry public API."""
from __future__ import annotations

import re
from typing import List

from fastapi import APIRouter
from pydantic import BaseModel, field_validator

import db
from models import new_id, now_iso

router = APIRouter(tags=["packers_movers_enquiries"])


class PackersMoversEnquiryCreate(BaseModel):
    customer_name: str
    mobile: str
    email: str = ""
    services_required: List[str]
    moving_type: str
    property_type: str
    property_size: str
    commercial_area: str = ""
    pickup_city: str
    pickup_locality: str
    pickup_address: str = ""
    pickup_floor: str = ""
    pickup_lift_availability: str = ""
    destination_city: str
    destination_locality: str
    destination_address: str = ""
    destination_floor: str = ""
    destination_lift_availability: str = ""
    preferred_move_date: str = ""
    flexible_date: bool = False
    packing_requirements: List[str]
    inventory_items: List[str] = []
    uploaded_files: List[dict] = []
    contact_consent: bool = False
    mobile_verified: bool = False
    otp_verification_ref: str = ""

    @field_validator("customer_name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Customer name must be at least 2 characters.")
        return value

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, value: str) -> str:
        digits = re.sub(r"\D", "", value)
        if digits.startswith("91") and len(digits) == 12:
            digits = digits[2:]
        if len(digits) != 10 or int(digits[0]) < 6:
            raise ValueError("Please enter a valid 10-digit Indian mobile number.")
        return digits

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = (value or "").strip()
        if not value:
            return ""
        if "@" not in value or "." not in value:
            raise ValueError("Please enter a valid email address.")
        return value

    @field_validator("services_required", "packing_requirements")
    @classmethod
    def validate_lists(cls, value: list) -> list:
        if not value:
            raise ValueError("Please select at least one option.")
        return value

    @field_validator("moving_type", "property_type", "property_size", "pickup_city", "pickup_locality", "destination_city", "destination_locality")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("This field is required.")
        return value.strip()

    @field_validator("contact_consent")
    @classmethod
    def validate_consent(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Please consent to be contacted.")
        return value


@router.post("/api/packers-movers-enquiries")
async def create_packers_movers_enquiry(payload: PackersMoversEnquiryCreate):
    now = now_iso()
    count = await db.packers_movers_enquiries().count_documents({})
    enquiry_id = new_id()
    record = {
        **payload.model_dump(),
        "id": enquiry_id,
        "packers_movers_enquiry_id": f"VS-PM-{count + 1:06d}",
        "status": "new",
        "assigned_to": None,
        "source": "website",
        "service_category": "PACKERS_MOVERS",
        "created_at": now,
        "updated_at": now,
    }

    await db.packers_movers_enquiries().insert_one(record)
    record.pop("_id", None)
    return {
        "success": True,
        "id": enquiry_id,
        "packers_movers_enquiry_id": record["packers_movers_enquiry_id"],
    }
