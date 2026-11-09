"""Renovation and Alteration services enquiry — public submission and file endpoints."""
from __future__ import annotations

import base64
import re
from typing import List, Optional
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, field_validator

import db
from models import new_id, now_iso

router = APIRouter(tags=["renovation_enquiries"])

# Valid options
RENOVATION_SERVICES = [
    "Complete Home Renovation",
    "Kitchen Renovation",
    "Bathroom Renovation",
    "Structural Alterations",
    "Flooring and Tiling",
    "Painting, Ceiling and Wall Improvements",
    "False Ceiling",
    "Other",
]

PROPERTY_TYPES = [
    "Apartment",
    "Independent House",
    "Villa",
    "Commercial Property",
    "Office",
    "Other",
]

PROPERTY_SIZES = [
    "1 BHK",
    "2 BHK",
    "3 BHK",
    "4 BHK",
    "5+ BHK",
    "Other",
]

PROPERTY_CONDITIONS = [
    "Newly purchased property",
    "Existing property requiring renovation",
    "Partially renovated property",
    "Property requiring major alterations",
]

RENOVATION_SCOPES = [
    "Single room",
    "Multiple rooms",
    "Kitchen only",
    "Bathroom only",
    "Partial property",
    "Entire property",
]

BUDGET_RANGES = [
    "Below ₹1 lakh",
    "₹1 lakh – ₹3 lakh",
    "₹3 lakh – ₹5 lakh",
    "₹5 lakh – ₹10 lakh",
    "₹10 lakh – ₹20 lakh",
    "Above ₹20 lakh",
    "Not decided yet",
]

TIMELINES = [
    "Within 15 days",
    "Within one month",
    "Within 1–3 months",
    "Later",
    "Not decided",
]


class RenovationEnquiryCreate(BaseModel):
    # Customer information
    customer_name: str
    mobile: str
    email: Optional[str] = ""
    contact_consent: bool

    # Renovation requirement
    services_required: List[str]

    # Property info
    property_type: str
    property_size: str
    commercial_area: Optional[str] = ""
    property_condition: str
    renovation_scope: str

    # Location
    city: str
    area_locality: str
    additional_address: Optional[str] = ""

    # Budget & Timeline
    budget_range: str
    expected_start_date: str

    # Optional details
    requirement_description: Optional[str] = ""
    uploaded_files: List[dict] = []
    floor_plan_url: Optional[str] = ""
    floor_plan_filename: Optional[str] = ""
    reference_images: List[str] = []

    @field_validator("customer_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = (v or "").strip()
        if len(v) < 2:
            raise ValueError("Customer name must be at least 2 characters.")
        return v

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        digits = re.sub(r"\D", "", str(v or ""))
        if digits.startswith("91") and len(digits) == 12:
            digits = digits[2:]
        if len(digits) != 10 or not digits.isdigit() or int(digits[0]) < 6:
            raise ValueError("Please enter a valid 10-digit Indian mobile number.")
        return digits

    @field_validator("contact_consent")
    @classmethod
    def validate_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must agree to be contacted by VisitSarva regarding your enquiry.")
        return v

    @field_validator("services_required")
    @classmethod
    def validate_services(cls, v: list) -> list:
        if not v or len(v) == 0:
            raise ValueError("Please select at least one renovation service category.")
        return v

    @field_validator("property_type")
    @classmethod
    def validate_prop_type(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("Property type is required.")
        return v

    @field_validator("property_size")
    @classmethod
    def validate_prop_size(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("Property size / BHK is required.")
        return v

    @field_validator("property_condition")
    @classmethod
    def validate_condition(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("Property condition is required.")
        return v

    @field_validator("renovation_scope")
    @classmethod
    def validate_scope(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("Renovation scope is required.")
        return v

    @field_validator("city", "area_locality")
    @classmethod
    def validate_location(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("City and locality are mandatory.")
        return v

    @field_validator("budget_range")
    @classmethod
    def validate_budget(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("Approximate budget is required.")
        return v

    @field_validator("expected_start_date")
    @classmethod
    def validate_timeline(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("Expected start date is required.")
        return v


@router.post("/api/renovation-enquiries")
async def create_renovation_enquiry(payload: RenovationEnquiryCreate):
    """Public submission endpoint for Renovation and Alteration enquiries."""
    now = now_iso()
    count = await db.renovation_enquiries().count_documents({})
    enquiry_uuid = new_id()
    formatted_id = f"VS-REN-{count + 1:06d}"

    initial_status_entry = {
        "previous_status": None,
        "new_status": "NEW",
        "updated_by": "Website Customer",
        "timestamp": now,
        "remarks": "Enquiry submitted via VisitSarva website",
        "reason": "",
    }

    record = {
        **payload.model_dump(),
        "id": enquiry_uuid,
        "renovation_enquiry_id": formatted_id,
        "status": "NEW",
        "status_history": [initial_status_entry],
        "assigned_to": None,
        "assigned_to_name": None,
        "assigned_vendor_id": None,
        "assigned_vendor_name": None,
        "follow_up_date": None,
        "estimated_quotation": None,
        "final_quotation": None,
        "quotation_remarks": "",
        "quotation_updated_at": None,
        "quotation_updated_by": None,
        "remarks": "",
        "internal_notes": [],
        "source": "website",
        "service_category": "RENOVATION_ALTERATION",
        "created_at": now,
        "updated_at": now,
    }

    await db.renovation_enquiries().insert_one(record)
    record.pop("_id", None)

    return {
        "success": True,
        "id": enquiry_uuid,
        "renovation_enquiry_id": formatted_id,
        "message": "Thank you for choosing VisitSarva. Your renovation enquiry has been received. Our team will contact you shortly.",
    }


@router.post("/api/renovation-enquiries/upload")
async def upload_renovation_file(file: UploadFile = File(...)):
    """Upload a file (photo or floor plan) for renovation enquiry."""
    filename = file.filename or "upload"
    content_type = file.content_type or "application/octet-stream"

    # Validate file extension and mime type
    allowed_exts = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
    ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload JPG, PNG, WebP images or PDF documents.",
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds the 10 MB limit.")

    file_id = new_id()
    doc = {
        "id": file_id,
        "filename": filename,
        "content_type": content_type,
        "size": len(content),
        "data_base64": base64.b64encode(content).decode("utf-8"),
        "created_at": now_iso(),
    }
    await db.renovation_files().insert_one(doc)

    return {
        "success": True,
        "file_id": file_id,
        "filename": filename,
        "size": len(content),
        "content_type": content_type,
        "url": f"/api/renovation-enquiries/files/{file_id}",
    }


@router.get("/api/renovation-enquiries/files/{file_id}")
async def get_renovation_file(file_id: str):
    """Retrieve an uploaded renovation file."""
    doc = await db.renovation_files().find_one({"id": file_id})
    if not doc or "data_base64" not in doc:
        raise HTTPException(status_code=404, detail="File not found.")

    raw = base64.b64decode(doc["data_base64"])
    headers = {
        "Content-Disposition": f'inline; filename="{doc.get("filename", "file")}"'
    }
    return Response(content=raw, media_type=doc.get("content_type", "application/octet-stream"), headers=headers)
