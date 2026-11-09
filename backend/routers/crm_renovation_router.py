"""CRM listing and management for renovation & alteration enquiries."""
from __future__ import annotations

import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

import db
from models import new_id, now_iso
from services.rbac_service import build_scope_query, get_current_employee

router = APIRouter(prefix="/api/crm/renovation-enquiries", tags=["crm_renovation_enquiries"])

# Full sequence of statuses
SEQUENTIAL_STATUSES = [
    "NEW",
    "CONTACTED",
    "REQUIREMENT VERIFIED",
    "SITE INSPECTION SCHEDULED",
    "SITE INSPECTION COMPLETED",
    "ESTIMATE SHARED",
    "NEGOTIATION",
    "APPROVED",
    "WORK SCHEDULED",
    "WORK IN PROGRESS",
    "COMPLETED",
]

ADDITIONAL_STATUSES = [
    "NOT INTERESTED",
    "ON HOLD",
    "LOST",
    "CANCELLED",
]

ALL_VALID_STATUSES = SEQUENTIAL_STATUSES + ADDITIONAL_STATUSES

DEFAULT_VENDORS = [
    {
        "id": "VEND-REN-001",
        "name": "Apex Home Renovations & Civil Works",
        "specialty": "Full Home, Structural & Layout Alterations",
        "phone": "+91 98450 12001",
        "email": "contact@apexrenovations.in",
        "city": "Bengaluru",
        "status": "active",
    },
    {
        "id": "VEND-REN-002",
        "name": "Sarva Craft Interiors & Modular Works",
        "specialty": "Kitchen Renovation, Cabinets & Wardrobes",
        "phone": "+91 98450 12002",
        "email": "partners@sarvacraft.in",
        "city": "Bengaluru",
        "status": "active",
    },
    {
        "id": "VEND-REN-003",
        "name": "PrimeBuild Tiling & Flooring Specialists",
        "specialty": "Flooring, Bathroom Upgrades & Waterproofing",
        "phone": "+91 98450 12003",
        "email": "projects@primebuild.in",
        "city": "Bengaluru",
        "status": "active",
    },
    {
        "id": "VEND-REN-004",
        "name": "Elite Surface & Ceiling Decorators",
        "specialty": "Painting, False Ceiling & Wall Improvements",
        "phone": "+91 98450 12004",
        "email": "info@elitedecor.in",
        "city": "Bengaluru",
        "status": "active",
    },
]


class StatusUpdateRequest(BaseModel):
    status: str
    remarks: Optional[str] = ""
    reason: Optional[str] = ""


class ExecutiveAssignRequest(BaseModel):
    assigned_to: Optional[str] = ""
    follow_up_date: Optional[str] = None
    remarks: Optional[str] = None


class VendorAssignRequest(BaseModel):
    vendor_id: Optional[str] = ""
    remarks: Optional[str] = None


class QuotationUpdateRequest(BaseModel):
    estimated_quotation: Optional[float] = None
    final_quotation: Optional[float] = None
    remarks: Optional[str] = ""


class RemarksRequest(BaseModel):
    remark: str


class VendorCreateRequest(BaseModel):
    name: str
    specialty: str
    phone: str
    email: Optional[str] = ""
    city: str
    status: Optional[str] = "active"


async def _ensure_default_vendors():
    """Ensure default renovation vendors are present."""
    count = await db.renovation_vendors().count_documents({})
    if count == 0:
        for v in DEFAULT_VENDORS:
            await db.renovation_vendors().insert_one({**v, "created_at": now_iso()})


@router.get("/stats")
async def renovation_enquiry_stats(employee: dict = Depends(get_current_employee)):
    scope = await build_scope_query(employee, "assigned_to")
    items = await db.renovation_enquiries().find(scope, {"status": 1}).to_list(length=10000)

    counts = {s.lower().replace(" ", "_"): 0 for s in ALL_VALID_STATUSES}
    for item in items:
        status_raw = (item.get("status") or "NEW").upper()
        key = status_raw.lower().replace(" ", "_")
        counts[key] = counts.get(key, 0) + 1

    return {
        "total": len(items),
        "new": counts.get("new", 0),
        "contacted": counts.get("contacted", 0),
        "requirement_verified": counts.get("requirement_verified", 0),
        "site_inspection_scheduled": counts.get("site_inspection_scheduled", 0),
        "site_inspection_completed": counts.get("site_inspection_completed", 0),
        "estimate_shared": counts.get("estimate_shared", 0),
        "negotiation": counts.get("negotiation", 0),
        "approved": counts.get("approved", 0),
        "work_scheduled": counts.get("work_scheduled", 0),
        "work_in_progress": counts.get("work_in_progress", 0),
        "completed": counts.get("completed", 0),
        "not_interested": counts.get("not_interested", 0),
        "on_hold": counts.get("on_hold", 0),
        "lost": counts.get("lost", 0),
        "cancelled": counts.get("cancelled", 0),
    }


@router.get("/vendors")
async def list_renovation_vendors(employee: dict = Depends(get_current_employee)):
    await _ensure_default_vendors()
    return await db.renovation_vendors().find({}, {"_id": 0}).sort("name", 1).to_list(length=200)


@router.post("/vendors")
async def create_renovation_vendor(payload: VendorCreateRequest, employee: dict = Depends(get_current_employee)):
    if employee.get("role") not in ["founder", "admin", "bdo", "team_lead"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions to add vendors.")

    vendor_id = f"VEND-REN-{new_id()[:6].upper()}"
    doc = {
        "id": vendor_id,
        "name": payload.name.strip(),
        "specialty": payload.specialty.strip(),
        "phone": payload.phone.strip(),
        "email": (payload.email or "").strip(),
        "city": payload.city.strip(),
        "status": payload.status or "active",
        "created_by": employee.get("name", "CRM User"),
        "created_at": now_iso(),
    }
    await db.renovation_vendors().insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_renovation_enquiries(
    status: Optional[str] = None,
    service: Optional[str] = None,
    assigned_to: Optional[str] = None,
    assigned_vendor: Optional[str] = None,
    search: Optional[str] = None,
    employee: dict = Depends(get_current_employee),
):
    scope = await build_scope_query(employee, "assigned_to")
    filters = {}

    if status and status != "all":
        # Support case-insensitive matching
        filters["status"] = {"$regex": f"^{re.escape(status.strip())}$", "$options": "i"}

    if service and service != "all":
        filters["services_required"] = {"$in": [service]}

    if assigned_to and assigned_to != "all":
        filters["assigned_to"] = assigned_to

    if assigned_vendor and assigned_vendor != "all":
        filters["assigned_vendor_id"] = assigned_vendor

    if search and search.strip():
        term = re.escape(search.strip())
        filters["$or"] = [
            {field: {"$regex": term, "$options": "i"}}
            for field in (
                "customer_name",
                "mobile",
                "email",
                "renovation_enquiry_id",
                "city",
                "area_locality",
                "property_type",
                "assigned_to_name",
                "assigned_vendor_name",
            )
        ]

    query = {**scope, **filters} if filters else scope

    items = (
        await db.renovation_enquiries()
        .find(query, {"_id": 0})
        .sort("created_at", -1)
        .limit(500)
        .to_list(length=500)
    )
    return items


@router.get("/{enquiry_id}")
async def get_renovation_enquiry(enquiry_id: str, employee: dict = Depends(get_current_employee)):
    scope = await build_scope_query(employee, "assigned_to")
    query = {**scope, "$or": [{"id": enquiry_id}, {"renovation_enquiry_id": enquiry_id}]}
    item = await db.renovation_enquiries().find_one(query, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Renovation enquiry not found")
    return item


@router.post("/{enquiry_id}/status")
async def update_renovation_enquiry_status(
    enquiry_id: str,
    payload: StatusUpdateRequest,
    employee: dict = Depends(get_current_employee),
):
    scope = await build_scope_query(employee, "assigned_to")
    query = {**scope, "$or": [{"id": enquiry_id}, {"renovation_enquiry_id": enquiry_id}]}
    item = await db.renovation_enquiries().find_one(query)
    if not item:
        raise HTTPException(status_code=404, detail="Renovation enquiry not found")

    new_status = payload.status.strip().upper()
    matched_status = next((s for s in ALL_VALID_STATUSES if s.upper() == new_status), None)
    if not matched_status:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Valid statuses are: {', '.join(ALL_VALID_STATUSES)}",
        )

    # If it is an additional status (NOT INTERESTED, ON HOLD, LOST, CANCELLED), require a reason
    if matched_status in ADDITIONAL_STATUSES and not (payload.reason or "").strip():
        raise HTTPException(
            status_code=400,
            detail=f"A reason is required when setting status to '{matched_status}'.",
        )

    current_status = item.get("status", "NEW")
    now = now_iso()
    status_entry = {
        "previous_status": current_status,
        "new_status": matched_status,
        "updated_by": employee.get("name", "Staff"),
        "updated_by_id": employee.get("id"),
        "timestamp": now,
        "remarks": (payload.remarks or "").strip(),
        "reason": (payload.reason or "").strip(),
    }

    updates = {
        "$set": {
            "status": matched_status,
            "updated_at": now,
        },
        "$push": {
            "status_history": status_entry,
        },
    }
    if payload.remarks:
        updates["$set"]["remarks"] = payload.remarks.strip()

    await db.renovation_enquiries().update_one({"id": item["id"]}, updates)
    return {"success": True, "status": matched_status, "history_entry": status_entry}


@router.post("/{enquiry_id}/assign-executive")
async def assign_executive(
    enquiry_id: str,
    payload: ExecutiveAssignRequest,
    employee: dict = Depends(get_current_employee),
):
    if employee.get("role") not in ["founder", "admin", "bdo", "team_lead"]:
        raise HTTPException(status_code=403, detail="Only managers can assign executives.")

    scope = await build_scope_query(employee, "assigned_to")
    query = {**scope, "$or": [{"id": enquiry_id}, {"renovation_enquiry_id": enquiry_id}]}
    item = await db.renovation_enquiries().find_one(query)
    if not item:
        raise HTTPException(status_code=404, detail="Renovation enquiry not found")

    assigned_name = None
    emp_id = (payload.assigned_to or "").strip()
    if emp_id:
        target_emp = await db.employees().find_one({"id": emp_id})
        if not target_emp:
            raise HTTPException(status_code=400, detail="Executive not found.")
        assigned_name = target_emp.get("name", "Executive")

    now = now_iso()
    updates: dict = {
        "$set": {
            "assigned_to": emp_id or None,
            "assigned_to_name": assigned_name,
            "updated_at": now,
        }
    }
    if payload.follow_up_date is not None:
        updates["$set"]["follow_up_date"] = payload.follow_up_date
    if payload.remarks:
        updates["$set"]["remarks"] = payload.remarks.strip()
        updates["$push"] = {
            "internal_notes": {
                "id": new_id(),
                "note": f"Assigned to {assigned_name or 'Unassigned'}: {payload.remarks.strip()}",
                "author": employee.get("name", "Staff"),
                "created_at": now,
            }
        }

    await db.renovation_enquiries().update_one({"id": item["id"]}, updates)
    return {"success": True, "assigned_to": emp_id, "assigned_to_name": assigned_name}


@router.post("/{enquiry_id}/assign-vendor")
async def assign_vendor(
    enquiry_id: str,
    payload: VendorAssignRequest,
    employee: dict = Depends(get_current_employee),
):
    if employee.get("role") not in ["founder", "admin", "bdo", "team_lead"]:
        raise HTTPException(status_code=403, detail="Only managers can assign vendors.")

    scope = await build_scope_query(employee, "assigned_to")
    query = {**scope, "$or": [{"id": enquiry_id}, {"renovation_enquiry_id": enquiry_id}]}
    item = await db.renovation_enquiries().find_one(query)
    if not item:
        raise HTTPException(status_code=404, detail="Renovation enquiry not found")

    vendor_name = None
    v_id = (payload.vendor_id or "").strip()
    if v_id:
        target_v = await db.renovation_vendors().find_one({"id": v_id})
        if not target_v:
            # Check default vendors
            target_v = next((v for v in DEFAULT_VENDORS if v["id"] == v_id), None)
        if target_v:
            vendor_name = target_v.get("name")
        else:
            vendor_name = "Assigned Partner Vendor"

    now = now_iso()
    updates: dict = {
        "$set": {
            "assigned_vendor_id": v_id or None,
            "assigned_vendor_name": vendor_name,
            "updated_at": now,
        }
    }
    if payload.remarks:
        updates["$set"]["remarks"] = payload.remarks.strip()
        updates["$push"] = {
            "internal_notes": {
                "id": new_id(),
                "note": f"Vendor assigned ({vendor_name or 'Unassigned'}): {payload.remarks.strip()}",
                "author": employee.get("name", "Staff"),
                "created_at": now,
            }
        }

    await db.renovation_enquiries().update_one({"id": item["id"]}, updates)
    return {"success": True, "assigned_vendor_id": v_id, "assigned_vendor_name": vendor_name}


@router.post("/{enquiry_id}/quotation")
async def update_quotation(
    enquiry_id: str,
    payload: QuotationUpdateRequest,
    employee: dict = Depends(get_current_employee),
):
    scope = await build_scope_query(employee, "assigned_to")
    query = {**scope, "$or": [{"id": enquiry_id}, {"renovation_enquiry_id": enquiry_id}]}
    item = await db.renovation_enquiries().find_one(query)
    if not item:
        raise HTTPException(status_code=404, detail="Renovation enquiry not found")

    now = now_iso()
    updates = {
        "$set": {
            "estimated_quotation": payload.estimated_quotation,
            "final_quotation": payload.final_quotation,
            "quotation_remarks": (payload.remarks or "").strip(),
            "quotation_updated_at": now,
            "quotation_updated_by": employee.get("name", "Staff"),
            "updated_at": now,
        }
    }
    await db.renovation_enquiries().update_one({"id": item["id"]}, updates)
    return {
        "success": True,
        "estimated_quotation": payload.estimated_quotation,
        "final_quotation": payload.final_quotation,
        "quotation_updated_at": now,
        "quotation_updated_by": employee.get("name", "Staff"),
    }


@router.post("/{enquiry_id}/remarks")
async def add_internal_remark(
    enquiry_id: str,
    payload: RemarksRequest,
    employee: dict = Depends(get_current_employee),
):
    if not payload.remark.strip():
        raise HTTPException(status_code=400, detail="Remark cannot be empty.")

    scope = await build_scope_query(employee, "assigned_to")
    query = {**scope, "$or": [{"id": enquiry_id}, {"renovation_enquiry_id": enquiry_id}]}
    item = await db.renovation_enquiries().find_one(query)
    if not item:
        raise HTTPException(status_code=404, detail="Renovation enquiry not found")

    now = now_iso()
    new_note = {
        "id": new_id(),
        "note": payload.remark.strip(),
        "author": employee.get("name", "Staff"),
        "author_id": employee.get("id"),
        "created_at": now,
    }

    updates = {
        "$set": {
            "remarks": payload.remark.strip(),
            "updated_at": now,
        },
        "$push": {
            "internal_notes": new_note,
        },
    }
    await db.renovation_enquiries().update_one({"id": item["id"]}, updates)
    return {"success": True, "note": new_note}


@router.patch("/{enquiry_id}")
async def patch_renovation_enquiry(
    enquiry_id: str,
    payload: dict,
    employee: dict = Depends(get_current_employee),
):
    scope = await build_scope_query(employee, "assigned_to")
    query = {**scope, "$or": [{"id": enquiry_id}, {"renovation_enquiry_id": enquiry_id}]}
    item = await db.renovation_enquiries().find_one(query)
    if not item:
        raise HTTPException(status_code=404, detail="Renovation enquiry not found")

    now = now_iso()
    updates = {"$set": {"updated_at": now}}

    # Handle status transition if included
    if "status" in payload and payload["status"]:
        new_status = payload["status"].strip().upper()
        matched_status = next((s for s in ALL_VALID_STATUSES if s.upper() == new_status), None)
        if matched_status:
            current_status = item.get("status", "NEW")
            status_entry = {
                "previous_status": current_status,
                "new_status": matched_status,
                "updated_by": employee.get("name", "Staff"),
                "updated_by_id": employee.get("id"),
                "timestamp": now,
                "remarks": payload.get("remarks", ""),
                "reason": payload.get("reason", ""),
            }
            updates["$set"]["status"] = matched_status
            updates.setdefault("$push", {})["status_history"] = status_entry

    allowed_fields = [
        "remarks",
        "follow_up_date",
        "estimated_quotation",
        "final_quotation",
        "quotation_remarks",
    ]
    for f in allowed_fields:
        if f in payload:
            updates["$set"][f] = payload[f]

    if "assigned_to" in payload:
        emp_id = payload["assigned_to"]
        assigned_name = None
        if emp_id:
            emp = await db.employees().find_one({"id": emp_id})
            if emp:
                assigned_name = emp.get("name")
        updates["$set"]["assigned_to"] = emp_id or None
        updates["$set"]["assigned_to_name"] = assigned_name

    if "assigned_vendor_id" in payload:
        v_id = payload["assigned_vendor_id"]
        v_name = None
        if v_id:
            vendor = await db.renovation_vendors().find_one({"id": v_id})
            if vendor:
                v_name = vendor.get("name")
            else:
                default_v = next((v for v in DEFAULT_VENDORS if v["id"] == v_id), None)
                if default_v:
                    v_name = default_v["name"]
        updates["$set"]["assigned_vendor_id"] = v_id or None
        updates["$set"]["assigned_vendor_name"] = v_name

    await db.renovation_enquiries().update_one({"id": item["id"]}, updates)
    return {"success": True}
