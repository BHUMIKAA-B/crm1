import re
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, field_validator

import db
from crm_models import Customer, Lead
from models import new_id, now_iso
from services.rbac_service import build_scope_query, get_current_employee, require_employee_roles

router = APIRouter(tags=["loan_enquiries"])
crm_router = APIRouter(prefix="/api/crm/loan-enquiries", tags=["crm_loan_enquiries"])

LoanEnquiryStatus = Literal["new", "contacted", "follow_up", "in_progress", "converted", "closed"]


class LoanEnquiryCreate(BaseModel):
    full_name: str
    phone: str
    email: EmailStr
    property_id: str = ""
    property_name: str = ""
    preferred_location: str = ""
    property_value: str = ""
    loan_amount: str = ""
    employment_type: str = "Salaried"
    monthly_income_range: str = ""
    preferred_bank: str = "Any Top Bank"
    message: str = ""

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value):
        if len(re.sub(r"\D", "", value)) < 10:
            raise ValueError("Please enter a valid 10-digit mobile number.")
        return value


class LoanEnquiryStatusUpdate(BaseModel):
    status: LoanEnquiryStatus
    notes: Optional[str] = None


class LoanEnquiryAssignment(BaseModel):
    assigned_to: Optional[str] = None


def _scoped_query(scope: dict, filters: dict) -> dict:
    parts = [query for query in (scope, filters) if query]
    if not parts:
        return {}
    return parts[0] if len(parts) == 1 else {"$and": parts}


@router.post("/api/loan-enquiries")
async def create_loan_enquiry(payload: LoanEnquiryCreate):
    now = now_iso()
    count = await db.loan_enquiries().count_documents({})
    enquiry_id = new_id()
    record = {
        **payload.model_dump(),
        "id": enquiry_id,
        "loan_enquiry_id": f"VS-LOAN-{count + 1:06d}",
        "status": "new",
        "assigned_to": None,
        "notes": "",
        "source": "website",
        "created_at": now,
        "updated_at": now,
    }
    await db.loan_enquiries().insert_one(record)
    record.pop("_id", None)
    return {"success": True, "loan_enquiry_id": record["loan_enquiry_id"], "data": record}


@crm_router.get("/stats")
async def loan_enquiry_stats(employee: dict = Depends(get_current_employee)):
    scope = await build_scope_query(employee, "assigned_to")
    items = await db.loan_enquiries().find(scope, {"status": 1}).to_list(length=10000)
    counts = {}
    for item in items:
        key = item.get("status", "new")
        counts[key] = counts.get(key, 0) + 1
    return {
        "total": len(items),
        "new": counts.get("new", 0),
        "contacted": counts.get("contacted", 0),
        "follow_up": counts.get("follow_up", 0),
        "in_progress": counts.get("in_progress", 0),
        "converted": counts.get("converted", 0),
        "closed": counts.get("closed", 0),
    }


@crm_router.get("")
async def list_loan_enquiries(
    status: Optional[str] = None,
    employment_type: Optional[str] = None,
    search: Optional[str] = None,
    employee: dict = Depends(get_current_employee),
):
    scope = await build_scope_query(employee, "assigned_to")
    filters = {}
    if status and status != "all":
        filters["status"] = status
    if employment_type and employment_type != "all":
        filters["employment_type"] = employment_type
    if search and search.strip():
        term = re.escape(search.strip())
        filters["$or"] = [
            {field: {"$regex": term, "$options": "i"}}
            for field in ("full_name", "phone", "email", "loan_enquiry_id", "property_name")
        ]
    return await db.loan_enquiries().find(_scoped_query(scope, filters), {"_id": 0}).sort("created_at", -1).limit(500).to_list(length=500)


@crm_router.get("/{enquiry_id}")
async def get_loan_enquiry(enquiry_id: str, employee: dict = Depends(get_current_employee)):
    scope = await build_scope_query(employee, "assigned_to")
    query = _scoped_query(scope, {"$or": [{"id": enquiry_id}, {"loan_enquiry_id": enquiry_id}]})
    item = await db.loan_enquiries().find_one(query, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Loan enquiry not found")
    return item


@crm_router.patch("/{enquiry_id}/status")
async def update_loan_enquiry_status(
    enquiry_id: str,
    payload: LoanEnquiryStatusUpdate,
    employee: dict = Depends(get_current_employee),
):
    scope = await build_scope_query(employee, "assigned_to")
    query = _scoped_query(scope, {"id": enquiry_id})
    update = {"status": payload.status, "updated_at": now_iso()}
    if payload.notes is not None:
        update["notes"] = payload.notes
    result = await db.loan_enquiries().update_one(query, {"$set": update})
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Loan enquiry not found")
    return {"ok": True}


@crm_router.patch("/{enquiry_id}/assign")
async def assign_loan_enquiry(
    enquiry_id: str,
    payload: LoanEnquiryAssignment,
    employee: dict = Depends(require_employee_roles("bdo", "team_lead")),
):
    assigned_name = None
    if payload.assigned_to:
        assignee = await db.employees().find_one({"id": payload.assigned_to}, {"_id": 0, "name": 1})
        if not assignee:
            raise HTTPException(status_code=404, detail="Employee not found")
        assigned_name = assignee.get("name")
    result = await db.loan_enquiries().update_one(
        {"id": enquiry_id},
        {"$set": {"assigned_to": payload.assigned_to, "updated_at": now_iso()}},
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Loan enquiry not found")
    return {"ok": True, "assigned_to_name": assigned_name}


@crm_router.post("/{enquiry_id}/convert-to-lead")
async def convert_loan_enquiry_to_lead(
    enquiry_id: str,
    employee: dict = Depends(get_current_employee),
):
    scope = await build_scope_query(employee, "assigned_to")
    enquiry = await db.loan_enquiries().find_one(
        _scoped_query(scope, {"id": enquiry_id}), {"_id": 0}
    )
    if not enquiry:
        raise HTTPException(status_code=404, detail="Loan enquiry not found")
    if enquiry.get("status") == "converted":
        raise HTTPException(status_code=409, detail="Loan enquiry is already converted")

    customer = await db.customers().find_one({"phone": enquiry["phone"]}, {"_id": 0})
    if not customer:
        customer_model = Customer(
            name=enquiry["full_name"],
            phone=enquiry["phone"],
            email=enquiry.get("email") or None,
            created_by=employee["id"],
            notes=enquiry.get("message", ""),
        )
        customer = customer_model.model_dump()
        await db.customers().insert_one(customer)

    lead_count = await db.leads().count_documents({})
    lead = Lead(
        lead_id=f"VS-LEAD-{lead_count + 1:06d}",
        customer_id=customer["id"],
        source="Home Loan Enquiry",
        assigned_to=enquiry.get("assigned_to") or employee["id"],
        created_by=employee["id"],
        notes=enquiry.get("message", ""),
    )
    await db.leads().insert_one(lead.model_dump())
    await db.loan_enquiries().update_one(
        {"id": enquiry_id},
        {"$set": {"status": "converted", "lead_id": lead.id, "updated_at": now_iso()}},
    )
    return {"success": True, "message": "Loan enquiry converted to lead", "lead_id": lead.id}


router.include_router(crm_router)