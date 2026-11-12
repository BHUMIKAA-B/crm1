"""Certified Deed Copy enquiry public API and CRM endpoints."""
from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator, model_validator

import db
from models import new_id, now_iso
from services.rbac_service import build_scope_query, get_current_employee

router = APIRouter(tags=["certified_deed_copy_enquiries"])
crm_router = APIRouter(prefix="/api/crm/certified-deed-copy-enquiries", tags=["crm_certified_deed_copy_enquiries"])


class CertifiedDeedCopyEnquiryCreate(BaseModel):
    document_type: str
    other_document_type: str = ""
    document_number: str = ""
    dont_know_document_number: bool = False
    registration_year: int
    sro: str
    property_location: str
    property_city: str
    property_address: str = ""
    uploaded_files: List[dict] = []
    customer_name: str
    mobile: str
    contact_consent: bool = False

    @field_validator("document_type")
    @classmethod
    def validate_document_type(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Please select the document type.")
        return value.strip()

    @field_validator("customer_name", "sro", "property_location", "property_city")
    @classmethod
    def validate_required_text(cls, value: str, info):
        if not value or not value.strip():
            field_name = info.field_name.replace("_", " ").title()
            raise ValueError(f"{field_name} is required.")
        return value.strip()

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, value: str) -> str:
        digits = re.sub(r"\D", "", value)
        if digits.startswith("91") and len(digits) == 12:
            digits = digits[2:]
        if len(digits) != 10 or int(digits[0]) < 6:
            raise ValueError("Please enter a valid 10-digit Indian mobile number.")
        return digits

    @field_validator("registration_year")
    @classmethod
    def validate_registration_year(cls, value: int) -> int:
        current_year = datetime.now().year
        if value < 1900 or value > current_year + 5:
            raise ValueError("Please select a valid registration year.")
        return value

    @model_validator(mode="after")
    def validate_dependent_fields(self):
        if self.document_type == "Other" and not self.other_document_type.strip():
            raise ValueError("Please specify the document type.")
        if not self.dont_know_document_number and not self.document_number.strip():
            raise ValueError("Document number is required unless you do not know it.")
        if not self.contact_consent:
            raise ValueError("Please agree to be contacted by VisitSarva.")
        return self


@router.post("/api/certified-deed-copy-enquiries")
async def create_certified_deed_copy_enquiry(payload: CertifiedDeedCopyEnquiryCreate):
    now = now_iso()
    enquiry_id = new_id()
    count = await db.deed_copy_enquiries().count_documents({})

    record = {
        **payload.model_dump(),
        "id": enquiry_id,
        "certified_deed_copy_enquiry_id": f"VS-DEED-{count + 1:06d}",
        "status": "new",
        "source": "website",
        "service_category": "CERTIFIED_DEED_COPY",
        "created_at": now,
        "updated_at": now,
    }

    await db.deed_copy_enquiries().insert_one(record)
    record.pop("_id", None)
    return {
        "success": True,
        "id": enquiry_id,
        "certified_deed_copy_enquiry_id": record["certified_deed_copy_enquiry_id"],
    }


@crm_router.get("/stats")
async def certified_deed_copy_enquiry_stats(employee: dict = Depends(get_current_employee)):
    scope = await build_scope_query(employee, "assigned_to")
    items = await db.deed_copy_enquiries().find(scope, {"status": 1}).to_list(length=10000)
    counts = {}
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
async def list_certified_deed_copy_enquiries(
    status: Optional[str] = None,
    search: Optional[str] = None,
    employee: dict = Depends(get_current_employee),
):
    scope = await build_scope_query(employee, "assigned_to")
    filters = {}
    if status and status != "all":
        filters["status"] = status
    if search and search.strip():
        term = re.escape(search.strip())
        filters["$or"] = [
            {field: {"$regex": term, "$options": "i"}}
            for field in ("customer_name", "mobile", "certified_deed_copy_enquiry_id", "property_city", "property_location")
        ]
    return (
        await db.deed_copy_enquiries()
        .find({**scope, **filters} if filters else scope, {"_id": 0})
        .sort("created_at", -1)
        .limit(500)
        .to_list(length=500)
    )


@crm_router.get("/{enquiry_id}")
async def get_certified_deed_copy_enquiry(enquiry_id: str, employee: dict = Depends(get_current_employee)):
    scope = await build_scope_query(employee, "assigned_to")
    query = {**scope, "$or": [{"id": enquiry_id}, {"certified_deed_copy_enquiry_id": enquiry_id}]}
    item = await db.deed_copy_enquiries().find_one(query, {"_id": 0})
    if not item:
        return {"detail": "Certified Deed Copy enquiry not found"}
    return item


@crm_router.patch("/{enquiry_id}")
async def update_certified_deed_copy_enquiry(enquiry_id: str, payload: dict, employee: dict = Depends(get_current_employee)):
    scope = await build_scope_query(employee, "assigned_to")
    query = {**scope, "$or": [{"id": enquiry_id}, {"certified_deed_copy_enquiry_id": enquiry_id}]}
    updates = {"$set": {"updated_at": now_iso()}}
    if "status" in payload:
        updates["$set"]["status"] = payload["status"]
    if "remarks" in payload:
        updates["$set"]["remarks"] = payload["remarks"]
    if "follow_up_date" in payload:
        updates["$set"]["follow_up_date"] = payload["follow_up_date"]
    if "assigned_to" in payload:
        updates["$set"]["assigned_to"] = payload["assigned_to"]
    result = await db.deed_copy_enquiries().update_one(query, updates)
    return {"success": bool(result.modified_count or result.matched_count)}
