"""Painting service enquiry public API."""
from __future__ import annotations

import re
from typing import List

from fastapi import APIRouter
from pydantic import BaseModel, field_validator

import db
from models import new_id, now_iso

router = APIRouter(tags=["painting_enquiries"])


class PaintingEnquiryCreate(BaseModel):
    customer_name: str
    mobile: str
    services_required: List[str]
    property_type: str
    property_size: str
    painting_requirements: List[str]
    city: str
    area_locality: str
    additional_address: str = ""
    expected_service_date: str = ""
    uploaded_files: List[dict] = []
    contact_consent: bool = False

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

    @field_validator("services_required")
    @classmethod
    def validate_services(cls, value: list) -> list:
        if not value:
            raise ValueError("Please select at least one service.")
        return value

    @field_validator("painting_requirements")
    @classmethod
    def validate_requirements(cls, value: list) -> list:
        if not value:
            raise ValueError("Please select at least one painting requirement.")
        return value

    @field_validator("city", "area_locality")
    @classmethod
    def validate_location(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("City and area/locality are required.")
        return value.strip()

    @field_validator("contact_consent")
    @classmethod
    def validate_consent(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Contact consent is required to proceed.")
        return value


@router.post("/api/painting-enquiries")
async def create_painting_enquiry(payload: PaintingEnquiryCreate):
    now = now_iso()
    enquiry_id = new_id()
    count = await db.painting_enquiries().count_documents({})

    record = {
        **payload.model_dump(),
        "id": enquiry_id,
        "painting_enquiry_id": f"VS-PAINT-{count + 1:06d}",
        "status": "new",
        "source": "website",
        "service_category": "PAINTING_SERVICES",
        "created_at": now,
        "updated_at": now,
    }

    await db.painting_enquiries().insert_one(record)
    record.pop("_id", None)
    return {
        "success": True,
        "id": enquiry_id,
        "painting_enquiry_id": record["painting_enquiry_id"],
    }
