"""Loan Enquiries Router — Public enquiry submission & CRM management."""
from __future__ import annotations
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
import db
from crm_models import now_iso, new_id, AuditLog
from services.rbac_service import get_current_employee, build_scope_query, get_team_member_ids

router = APIRouter(prefix="/api", tags=["loan_enquiries"])


class LoanEnquiryCreate(BaseModel):
    full_name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=8, max_length=15)
    email: EmailStr
    property_id: Optional[str] = None
    property_name: Optional[str] = None
    preferred_location: Optional[str] = None
    property_value: Optional[str] = None
    loan_amount: Optional[str] = None
    employment_type: Optional[str] = "Salaried"
    monthly_income_range: Optional[str] = None
    preferred_bank: Optional[str] = None
    message: Optional[str] = None


class LoanEnquiryStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class LoanEnquiryAssignUpdate(BaseModel):
    assigned_to: str


class LoanEnquiryNotesUpdate(BaseModel):
    notes: str


# Helper to log audit events
async def _log_audit(who: str, action: str, entity: str, entity_id: str, field: str = None, old_value=None, new_value=None):
    log_doc = AuditLog(
        who=who,
        action=action,
        entity=entity,
        entity_id=entity_id,
        field=field,
        old_value=old_value,
        new_value=new_value
    ).model_dump()
    await db.audit_logs().insert_one(log_doc)


# ==========================================
# PUBLIC ENDPOINT — Submit Loan Enquiry
# ==========================================
@router.post("/loan-enquiries")
async def create_public_loan_enquiry(payload: LoanEnquiryCreate):
    """Public endpoint for submitting a property loan financing enquiry."""
    # 1. Sanitize & validate phone
    phone_clean = payload.phone.strip()
    if not phone_clean.replace("+", "").replace(" ", "").replace("-", "").isdigit():
        raise HTTPException(status_code=400, detail="Please enter a valid phone number")

    # 2. Look up property if property_id provided
    prop_name = payload.property_name
    prop_ref = None
    if payload.property_id:
        prop = await db.properties().find_one({"id": payload.property_id}, {"_id": 0})
        if prop:
            prop_name = prop.get("title") or prop_name
            loc = prop.get("location", {})
            loc_str = ", ".join(filter(None, [loc.get("address"), loc.get("city"), loc.get("state")]))
            prop_ref = f"{prop_name} ({loc_str})" if loc_str else prop_name

    # 3. Generate sequential display ID
    count = await db.get_db()["loan_enquiries"].count_documents({})
    loan_enquiry_id_str = f"VS-LOAN-{(count + 1):06d}"

    doc = {
        "id": new_id(),
        "loan_enquiry_id": loan_enquiry_id_str,
        "full_name": payload.full_name.strip(),
        "phone": phone_clean,
        "email": payload.email.lower().strip(),
        "property_id": payload.property_id,
        "property_name": prop_name,
        "property_reference": prop_ref or payload.preferred_location,
        "preferred_location": payload.preferred_location,
        "property_value": payload.property_value,
        "loan_amount": payload.loan_amount,
        "employment_type": payload.employment_type or "Salaried",
        "monthly_income_range": payload.monthly_income_range,
        "preferred_bank": payload.preferred_bank,
        "message": payload.message,
        "status": "new",
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "source": "Public Website - Loan Enquiry",
        "assigned_to": None,
        "assigned_to_name": None,
        "notes": "",
    }

    await db.get_db()["loan_enquiries"].insert_one(doc)

    # 4. Push CRM Notification for team
    try:
        notif_doc = {
            "id": new_id(),
            "title": "New Loan Enquiry Received",
            "message": f"{payload.full_name} submitted a loan enquiry for {prop_name or 'general property'}",
            "type": "loan_enquiry",
            "link": "/crm/loan-enquiries",
            "created_at": now_iso(),
            "read": False
        }
        await db.crm_notifications().insert_one(notif_doc)
    except Exception:
        pass

    doc.pop("_id", None)
    return {
        "success": True,
        "message": "Thank you! Your loan assistance enquiry has been received.",
        "loan_enquiry_id": loan_enquiry_id_str,
        "data": doc
    }


# ==========================================
# CRM AUTHENTICATED ENDPOINTS
# ==========================================

@router.get("/crm/loan-enquiries/stats")
async def get_loan_enquiries_stats(emp: dict = Depends(get_current_employee)):
    """Summary counts for CRM Loan Enquiries dashboard."""
    scope = await build_scope_query(emp, "assigned_to")
    
    pipeline = [
        {"$match": scope},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    cursor = db.get_db()["loan_enquiries"].aggregate(pipeline)
    counts = {doc["_id"]: doc["count"] async for doc in cursor}

    total = sum(counts.values())
    return {
        "total": total,
        "new": counts.get("new", 0),
        "contacted": counts.get("contacted", 0),
        "follow_up": counts.get("follow_up", 0),
        "in_progress": counts.get("in_progress", 0),
        "converted": counts.get("converted", 0),
        "closed": counts.get("closed", 0)
    }


@router.get("/crm/loan-enquiries")
async def list_loan_enquiries(
    status: Optional[str] = None,
    employment_type: Optional[str] = None,
    search: Optional[str] = None,
    emp: dict = Depends(get_current_employee)
):
    """List loan enquiries with role-based scoping, filtering & search."""
    scope = await build_scope_query(emp, "assigned_to")

    query = {**scope}
    if status and status != "all":
        query["status"] = status
    if employment_type and employment_type != "all":
        query["employment_type"] = employment_type

    if search:
        s = search.strip()
        query["$or"] = [
            {"full_name": {"$regex": s, "$options": "i"}},
            {"phone": {"$regex": s, "$options": "i"}},
            {"email": {"$regex": s, "$options": "i"}},
            {"loan_enquiry_id": {"$regex": s, "$options": "i"}},
            {"property_name": {"$regex": s, "$options": "i"}}
        ]

    cursor = db.get_db()["loan_enquiries"].find(query, {"_id": 0}).sort("created_at", -1).limit(200)
    items = await cursor.to_list(length=200)

    # Populate assignee names if missing
    emp_ids = list({i["assigned_to"] for i in items if i.get("assigned_to")})
    if emp_ids:
        employees = await db.employees().find({"id": {"$in": emp_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
        emp_map = {e["id"]: e["name"] for e in employees}
        for item in items:
            if item.get("assigned_to"):
                item["assigned_to_name"] = emp_map.get(item["assigned_to"], item.get("assigned_to_name"))

    return items


@router.get("/crm/loan-enquiries/{id}")
async def get_loan_enquiry_detail(id: str, emp: dict = Depends(get_current_employee)):
    """Get single loan enquiry details with RBAC check."""
    item = await db.get_db()["loan_enquiries"].find_one({"$or": [{"id": id}, {"loan_enquiry_id": id}]}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Loan enquiry not found")

    # RBAC check
    role = emp.get("role")
    if role in ["executive", "trainee", "dpo"]:
        if item.get("assigned_to") and item.get("assigned_to") != emp["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to view this loan enquiry")
    elif role == "team_lead":
        team_ids = await get_team_member_ids(emp)
        if item.get("assigned_to") and item["assigned_to"] not in team_ids:
            raise HTTPException(status_code=403, detail="Not authorized to view this loan enquiry")

    # Audit timeline
    events = await db.audit_logs().find({"entity": "loan_enquiry", "entity_id": item["id"]}, {"_id": 0}).sort("timestamp", -1).to_list(length=30)
    item["timeline"] = events

    return item


@router.patch("/crm/loan-enquiries/{id}/status")
async def update_loan_enquiry_status(id: str, payload: LoanEnquiryStatusUpdate, emp: dict = Depends(get_current_employee)):
    """Update loan enquiry status."""
    item = await db.get_db()["loan_enquiries"].find_one({"id": id})
    if not item:
        raise HTTPException(status_code=404, detail="Loan enquiry not found")

    role = emp.get("role")
    if role in ["executive", "trainee"] and item.get("assigned_to") and item["assigned_to"] != emp["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this enquiry")

    old_status = item.get("status")
    update_data = {
        "status": payload.status,
        "updated_at": now_iso()
    }
    if payload.notes is not None:
        update_data["notes"] = payload.notes

    await db.get_db()["loan_enquiries"].update_one({"id": id}, {"$set": update_data})
    await _log_audit(emp["id"], "update_status", "loan_enquiry", id, "status", old_status, payload.status)

    return {"message": "Status updated successfully", "status": payload.status}


@router.patch("/crm/loan-enquiries/{id}/assign")
async def assign_loan_enquiry(id: str, payload: LoanEnquiryAssignUpdate, emp: dict = Depends(get_current_employee)):
    """Assign/reassign loan enquiry to an employee."""
    role = emp.get("role")
    if role not in ["founder", "admin", "bdo", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized to assign loan enquiries")

    item = await db.get_db()["loan_enquiries"].find_one({"id": id})
    if not item:
        raise HTTPException(status_code=404, detail="Loan enquiry not found")

    assignee = await db.employees().find_one({"id": payload.assigned_to}, {"_id": 0, "name": 1})
    assignee_name = assignee.get("name") if assignee else payload.assigned_to

    old_assignee = item.get("assigned_to")
    await db.get_db()["loan_enquiries"].update_one(
        {"id": id},
        {"$set": {
            "assigned_to": payload.assigned_to,
            "assigned_to_name": assignee_name,
            "updated_at": now_iso()
        }}
    )

    await _log_audit(emp["id"], "reassign", "loan_enquiry", id, "assigned_to", old_assignee, payload.assigned_to)
    return {"message": "Assigned successfully", "assigned_to": payload.assigned_to, "assigned_to_name": assignee_name}


@router.post("/crm/loan-enquiries/{id}/convert-to-lead")
async def convert_loan_enquiry_to_lead(id: str, emp: dict = Depends(get_current_employee)):
    """Convert a loan enquiry directly into a CRM Lead."""
    item = await db.get_db()["loan_enquiries"].find_one({"id": id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Loan enquiry not found")

    # 1. Create or retrieve Customer
    phone = item.get("phone")
    cust = await db.customers().find_one({"phone": phone})
    if not cust:
        cust_doc = {
            "id": new_id(),
            "name": item.get("full_name"),
            "phone": phone,
            "email": item.get("email"),
            "address": item.get("preferred_location") or "",
            "created_by": emp["id"],
            "created_at": now_iso(),
            "notes": f"Created from Loan Enquiry ({item.get('loan_enquiry_id')})"
        }
        await db.customers().insert_one(cust_doc)
        cust_id = cust_doc["id"]
    else:
        cust_id = cust["id"]

    # 2. Check if active lead exists
    existing_lead = await db.leads().find_one({
        "customer_id": cust_id,
        "status": {"$nin": ["closed_won", "closed_lost"]}
    }, {"_id": 0})

    if existing_lead:
        # Update status to converted
        await db.get_db()["loan_enquiries"].update_one(
            {"id": id},
            {"$set": {"status": "converted", "updated_at": now_iso()}}
        )
        return {
            "message": "Customer already has an active lead. Linked to existing lead.",
            "lead_id": existing_lead["id"],
            "display_id": existing_lead.get("lead_id"),
            "customer_id": cust_id
        }

    # 3. Create new Lead
    count = await db.leads().count_documents({})
    lead_id_str = f"VS-LEAD-{(count + 1):06d}"
    assigned_to = item.get("assigned_to") or emp["id"]

    new_lead_doc = {
        "id": new_id(),
        "lead_id": lead_id_str,
        "customer_id": cust_id,
        "source": f"Loan Enquiry - {item.get('loan_enquiry_id')}",
        "assigned_to": assigned_to,
        "created_by": emp["id"],
        "status": "new",
        "created_at": now_iso(),
        "registered_date": now_iso(),
        "notes": f"Loan Req: {item.get('loan_amount') or 'N/A'}, Value: {item.get('property_value') or 'N/A'}, Emp: {item.get('employment_type') or 'N/A'}. Message: {item.get('message') or 'N/A'}"
    }

    await db.leads().insert_one(new_lead_doc)

    # Mark loan enquiry converted
    await db.get_db()["loan_enquiries"].update_one(
        {"id": id},
        {"$set": {"status": "converted", "updated_at": now_iso()}}
    )

    await _log_audit(emp["id"], "convert_to_lead", "loan_enquiry", id, "lead_id", None, new_lead_doc["id"])

    return {
        "message": "Loan enquiry successfully converted to Lead!",
        "lead_id": new_lead_doc["id"],
        "display_id": lead_id_str,
        "customer_id": cust_id
    }
