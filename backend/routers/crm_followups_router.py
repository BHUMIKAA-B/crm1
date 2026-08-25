from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, timezone
import db
from crm_models import Followup, FollowupCreate, now_iso, new_id
from services.rbac_service import get_current_employee

router = APIRouter(prefix="/api/crm/followups", tags=["crm_followups"])

@router.post("")
async def create_followup(data: FollowupCreate, emp: dict = Depends(get_current_employee)):
    assigned_to = data.assigned_to or emp["id"]
    followup = Followup(
        title=data.title,
        description=data.description,
        due_date=data.due_date,
        due_time=data.due_time,
        priority=data.priority,
        assigned_to=assigned_to,
        related_entity_type=data.related_entity_type,
        related_entity_id=data.related_entity_id,
        created_by=emp["id"],
        followup_reason=data.followup_reason
    )
    doc = followup.model_dump()
    await db.tasks().insert_one(doc)
    return {"message": "Follow-up created", "id": followup.id}

@router.get("")
async def list_followups(
    status: Optional[str] = None,
    overdue: Optional[bool] = None,
    emp: dict = Depends(get_current_employee)
):
    query = {"type": "followup"}
    role = emp["role"]
    if role in ["executive", "trainee"]:
        query["assigned_to"] = emp["id"]
        
    if status:
        query["status"] = status
        
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if overdue:
        query["due_date"] = {"$lt": today_str}
        query["status"] = {"$ne": "completed"}
        
    cursor = db.tasks().find(query).sort("due_date", 1).limit(100)
    items = await cursor.to_list(length=100)
    for item in items:
        item.pop("_id", None)
        item["is_overdue"] = (item["due_date"] < today_str and item["status"] != "completed")
    return items

@router.patch("/{followup_id}/status")
async def update_followup_status(followup_id: str, status: str, emp: dict = Depends(get_current_employee)):
    f_item = await db.tasks().find_one({"id": followup_id})
    if not f_item:
        raise HTTPException(status_code=404, detail="Followup not found")
        
    await db.tasks().update_one({"id": followup_id}, {"$set": {"status": status, "updated_at": now_iso()}})
    return {"message": f"Follow-up status updated to {status}"}
