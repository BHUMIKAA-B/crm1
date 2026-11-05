"""CRM listing and management for packers & movers enquiries."""
from __future__ import annotations

import re
from typing import Optional

from fastapi import APIRouter, Depends

import db
from models import now_iso
from services.rbac_service import build_scope_query, get_current_employee

router = APIRouter(prefix="/api/crm/packers-movers-enquiries", tags=["crm_packers_movers_enquiries"])


@router.get("/stats")
async def packers_movers_enquiry_stats(employee: dict = Depends(get_current_employee)):
    scope = await build_scope_query(employee, "assigned_to")
    items = await db.packers_movers_enquiries().find(scope, {"status": 1}).to_list(length=10000)
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


@router.get("")
async def list_packers_movers_enquiries(
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
            for field in ("customer_name", "mobile", "packers_movers_enquiry_id", "pickup_city", "destination_city", "pickup_locality")
        ]

    return (
        await db.packers_movers_enquiries()
        .find({**scope, **filters} if filters else scope, {"_id": 0})
        .sort("created_at", -1)
        .limit(500)
        .to_list(length=500)
    )


@router.get("/{enquiry_id}")
async def get_packers_movers_enquiry(enquiry_id: str, employee: dict = Depends(get_current_employee)):
    scope = await build_scope_query(employee, "assigned_to")
    query = {**scope, "$or": [{"id": enquiry_id}, {"packers_movers_enquiry_id": enquiry_id}]}
    item = await db.packers_movers_enquiries().find_one(query, {"_id": 0})
    if not item:
        return {"detail": "Packers & movers enquiry not found"}
    return item


@router.patch("/{enquiry_id}")
async def update_packers_movers_enquiry(enquiry_id: str, payload: dict, employee: dict = Depends(get_current_employee)):
    scope = await build_scope_query(employee, "assigned_to")
    query = {**scope, "$or": [{"id": enquiry_id}, {"packers_movers_enquiry_id": enquiry_id}]}
    updates = {"$set": {"updated_at": now_iso()}}
    if "status" in payload:
        updates["$set"]["status"] = payload["status"]
    if "remarks" in payload:
        updates["$set"]["remarks"] = payload["remarks"]
    if "follow_up_date" in payload:
        updates["$set"]["follow_up_date"] = payload["follow_up_date"]
    if "assigned_to" in payload:
        updates["$set"]["assigned_to"] = payload["assigned_to"]
    result = await db.packers_movers_enquiries().update_one(query, updates)
    return {"success": bool(result.modified_count or result.matched_count)}
