"""Interior Designing enquiry — public submission and CRM management endpoints."""
from __future__ import annotations

import re
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

import db
from models import new_id, now_iso
from services.rbac_service import build_scope_query, get_current_employee, require_employee_roles

# ---------------------------------------------------------------------------
# Router setup
# ---------------------------------------------------------------------------
router = APIRouter(tags=["interior_enquiries"])
crm_router = APIRouter(prefix="/api/crm/interior-enquiries", tags=["crm_interior_enquiries"])

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------
InteriorEnquiryStatus = Literal["new", "contacted", "consultation_scheduled", "proposal_sent", "in_progress", "closed_won", "closed_lost"]

ServiceCategory = Literal[
    "Living Room Interiors",
    "Bedroom Interiors",
    "Modular Kitchen",
    "Full Home Interiors",
    "Office & Commercial Interiors",
    "Other",
]

PropertyType = Literal[
    "Apartment",
    "Independent House",
    "Villa",
    "Office",
    "Commercial Space",
    "Other",
]

BudgetRange = Literal[
    "Below ₹3 lakh",
    "₹3–5 lakh",
    "₹5–10 lakh",
    "₹10–20 lakh",
    "₹20–30 lakh",
    "Above ₹30 lakh",
    "Not decided yet",
]

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class InteriorEnquiryCreate(BaseModel):
    # Customer info
    customer_name: str
    mobile: str
    contact_consent: bool

    # Service selection
    services_required: List[str]

    # Property info
    property_type: PropertyType
    property_size: str  # "2 BHK", "Villa ~3000 sqft", etc.

    # Budget
    budget_range: BudgetRange

    # Location
    city: str
    area_locality: str
    additional_address: str = ""

    # OTP verification status (verified on backend via OTP provider)
    mobile_verified: bool = False
    otp_verification_ref: str = ""

    # Optional file references (set after upload)
    floor_plan_url: str = ""
    floor_plan_filename: str = ""
    reference_images: List[str] = []

    @field_validator("customer_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Customer name must be at least 2 characters.")
        return v

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        # Strip leading +91 or 91
        if digits.startswith("91") and len(digits) == 12:
            digits = digits[2:]
        if len(digits) != 10 or not digits[0].isdigit() or int(digits[0]) < 6:
            raise ValueError("Please enter a valid 10-digit Indian mobile number.")
        return digits  # normalized to 10 digits

    @field_validator("contact_consent")
    @classmethod
    def validate_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Contact consent is required to proceed.")
        return v

    @field_validator("services_required")
    @classmethod
    def validate_services(cls, v: list) -> list:
        if not v:
            raise ValueError("Please select at least one service.")
        return v

    @field_validator("city")
    @classmethod
    def validate_city(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("City is required.")
        return v


class InteriorEnquiryStatusUpdate(BaseModel):
    status: InteriorEnquiryStatus
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None


class InteriorEnquiryAssignment(BaseModel):
    assigned_to: Optional[str] = None
    follow_up_date: Optional[str] = None


class InteriorEnquiryUpdate(BaseModel):
    status: Optional[InteriorEnquiryStatus] = None
    assigned_to: Optional[str] = None
    follow_up_date: Optional[str] = None
    remarks: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _scoped_query(scope: dict, filters: dict) -> dict:
    parts = [q for q in (scope, filters) if q]
    if not parts:
        return {}
    return parts[0] if len(parts) == 1 else {"$and": parts}


# ---------------------------------------------------------------------------
# PUBLIC endpoint — no auth required
# ---------------------------------------------------------------------------

@router.post("/api/interior-enquiries")
async def create_interior_enquiry(payload: InteriorEnquiryCreate):
    """Public form submission endpoint for Interior Designing enquiry."""
    now = now_iso()
    count = await db.interior_enquiries().count_documents({})
    enquiry_id = new_id()
    record = {
        **payload.model_dump(),
        "id": enquiry_id,
        "interior_enquiry_id": f"VS-INT-{count + 1:06d}",
        "status": "new",
        "assigned_to": None,
        "assigned_to_name": None,
        "follow_up_date": None,
        "remarks": "",
        "source": "website",
        "service_category": "INTERIOR_DESIGNING",
        "created_at": now,
        "updated_at": now,
    }
    await db.interior_enquiries().insert_one(record)
    record.pop("_id", None)
    return {
        "success": True,
        "interior_enquiry_id": record["interior_enquiry_id"],
        "id": enquiry_id,
    }


# ---------------------------------------------------------------------------
# CRM endpoints — require CRM authentication
# ---------------------------------------------------------------------------

@crm_router.get("/stats")
async def interior_enquiry_stats(employee: dict = Depends(get_current_employee)):
    scope = await build_scope_query(employee, "assigned_to")
    items = await db.interior_enquiries().find(scope, {"status": 1}).to_list(length=10000)
    counts: dict = {}
    for item in items:
        key = item.get("status", "new")
        counts[key] = counts.get(key, 0) + 1
    return {
        "total": len(items),
        "new": counts.get("new", 0),
        "contacted": counts.get("contacted", 0),
        "consultation_scheduled": counts.get("consultation_scheduled", 0),
        "proposal_sent": counts.get("proposal_sent", 0),
        "in_progress": counts.get("in_progress", 0),
        "closed_won": counts.get("closed_won", 0),
        "closed_lost": counts.get("closed_lost", 0),
    }


@crm_router.get("")
async def list_interior_enquiries(
    status: Optional[str] = None,
    service: Optional[str] = None,
    search: Optional[str] = None,
    assigned_to: Optional[str] = None,
    employee: dict = Depends(get_current_employee),
):
    scope = await build_scope_query(employee, "assigned_to")
    filters: dict = {}

    if status and status != "all":
        filters["status"] = status
    if service and service != "all":
        filters["services_required"] = {"$in": [service]}
    if assigned_to and assigned_to != "all":
        filters["assigned_to"] = assigned_to
    if search and search.strip():
        term = re.escape(search.strip())
        filters["$or"] = [
            {field: {"$regex": term, "$options": "i"}}
            for field in ("customer_name", "mobile", "interior_enquiry_id", "city", "area_locality")
        ]

    return (
        await db.interior_enquiries()
        .find(_scoped_query(scope, filters), {"_id": 0})
        .sort("created_at", -1)
        .limit(500)
        .to_list(length=500)
    )


@crm_router.get("/{enquiry_id}")
async def get_interior_enquiry(enquiry_id: str, employee: dict = Depends(get_current_employee)):
    scope = await build_scope_query(employee, "assigned_to")
    query = _scoped_query(
        scope,
        {"$or": [{"id": enquiry_id}, {"interior_enquiry_id": enquiry_id}]},
    )
    item = await db.interior_enquiries().find_one(query, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Interior enquiry not found")
    return item


@crm_router.patch("/{enquiry_id}")
async def update_interior_enquiry(
    enquiry_id: str,
    payload: InteriorEnquiryUpdate,
    employee: dict = Depends(get_current_employee),
):
    update_fields: dict = {"updated_at": now_iso()}
    if payload.status is not None:
        update_fields["status"] = payload.status
    if payload.follow_up_date is not None:
        update_fields["follow_up_date"] = payload.follow_up_date
    if payload.remarks is not None:
        update_fields["remarks"] = payload.remarks

    if payload.assigned_to is not None:
        # Validate assignee exists
        assignee = await db.employees().find_one({"id": payload.assigned_to}, {"_id": 0, "name": 1})
        if not assignee:
            raise HTTPException(status_code=404, detail="Employee not found")
        update_fields["assigned_to"] = payload.assigned_to
        update_fields["assigned_to_name"] = assignee.get("name")

    result = await db.interior_enquiries().update_one(
        {"$or": [{"id": enquiry_id}, {"interior_enquiry_id": enquiry_id}]},
        {"$set": update_fields},
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Interior enquiry not found")
    return {"ok": True}


@crm_router.patch("/{enquiry_id}/assign")
async def assign_interior_enquiry(
    enquiry_id: str,
    payload: InteriorEnquiryAssignment,
    employee: dict = Depends(require_employee_roles("bdo", "team_lead", "founder", "admin")),
):
    assigned_name = None
    if payload.assigned_to:
        assignee = await db.employees().find_one({"id": payload.assigned_to}, {"_id": 0, "name": 1})
        if not assignee:
            raise HTTPException(status_code=404, detail="Employee not found")
        assigned_name = assignee.get("name")

    update_data: dict = {
        "assigned_to": payload.assigned_to,
        "assigned_to_name": assigned_name,
        "updated_at": now_iso(),
    }
    if payload.follow_up_date is not None:
        update_data["follow_up_date"] = payload.follow_up_date

    result = await db.interior_enquiries().update_one(
        {"$or": [{"id": enquiry_id}, {"interior_enquiry_id": enquiry_id}]},
        {"$set": update_data},
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Interior enquiry not found")
    return {"ok": True, "assigned_to_name": assigned_name}


# ---------------------------------------------------------------------------
# Include crm_router into main router
# ---------------------------------------------------------------------------
router.include_router(crm_router)
