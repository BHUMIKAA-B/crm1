"""CRM Learning & Training router — Founder/BDO upload/edit, all roles view, screenshot security logging."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
import db
from crm_models import now_iso, new_id, AuditLog
from services.rbac_service import get_current_employee

router = APIRouter(prefix="/api/crm/learning", tags=["crm_learning"])

ADMIN_ROLES = ["founder", "admin", "bdo"]

class LearningContentCreate(BaseModel):
    title: str
    description: str
    category: str
    video_url: str
    thumbnail_url: Optional[str] = None
    is_published: bool = True

class LearningContentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_published: Optional[bool] = None

class SecurityEvent(BaseModel):
    learning_content_id: Optional[str] = None
    event_type: str  # SCREENSHOT_ATTEMPT, SCREEN_CAPTURE_SHORTCUT, TAB_SWITCH, WINDOW_BLUR, VIDEO_ACCESS, VIDEO_PLAY, VIDEO_PAUSE

@router.get("")
async def list_learning_content(emp: dict = Depends(get_current_employee)):
    """List all available learning materials. Non-admin roles see only published items."""
    role = emp["role"]
    query = {}
    if role not in ADMIN_ROLES:
        query["is_published"] = True

    items = await db.learning_content().find(query, {"_id": 0}).sort("created_at", -1).to_list(length=100)
    return items

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_learning_content(item_in: LearningContentCreate, emp: dict = Depends(get_current_employee)):
    """Founder & BDO can upload/create new learning videos."""
    if emp["role"] not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Only Founder and BDO can upload learning content")

    item_id = new_id()
    doc = {
        "id": item_id,
        "title": item_in.title,
        "description": item_in.description,
        "category": item_in.category,
        "video_url": item_in.video_url,
        "thumbnail_url": item_in.thumbnail_url or "",
        "created_by": emp["id"],
        "created_by_name": emp.get("name"),
        "created_by_role": emp["role"],
        "is_published": item_in.is_published,
        "created_at": now_iso(),
        "updated_at": now_iso()
    }
    await db.learning_content().insert_one(doc)
    return doc

@router.put("/{content_id}")
async def update_learning_content(content_id: str, item_in: LearningContentUpdate, emp: dict = Depends(get_current_employee)):
    """Founder & BDO can edit learning videos."""
    if emp["role"] not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Only Founder and BDO can edit learning content")

    existing = await db.learning_content().find_one({"id": content_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Learning content not found")

    update_fields = {"updated_at": now_iso()}
    for k, v in item_in.model_dump(exclude_unset=True).items():
        if v is not None:
            update_fields[k] = v

    await db.learning_content().update_one({"id": content_id}, {"$set": update_fields})
    updated = await db.learning_content().find_one({"id": content_id}, {"_id": 0})
    return updated

@router.delete("/{content_id}")
async def delete_learning_content(content_id: str, emp: dict = Depends(get_current_employee)):
    """Founder & BDO can delete learning videos."""
    if emp["role"] not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Only Founder and BDO can delete learning content")

    res = await db.learning_content().delete_one({"id": content_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Learning content not found")
    return {"message": "Content deleted successfully"}

@router.patch("/{content_id}/publish")
async def toggle_publish(content_id: str, emp: dict = Depends(get_current_employee)):
    """Founder & BDO can publish/unpublish content."""
    if emp["role"] not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Only Founder and BDO can change publish status")

    existing = await db.learning_content().find_one({"id": content_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Learning content not found")

    new_status = not existing.get("is_published", True)
    await db.learning_content().update_one({"id": content_id}, {"$set": {"is_published": new_status, "updated_at": now_iso()}})
    return {"message": "Publish status updated", "is_published": new_status}

@router.post("/security-event")
async def log_security_event(event: SecurityEvent, emp: dict = Depends(get_current_employee)):
    """Log security events (screenshot attempt, tab switch, window blur, play/pause)."""
    doc = {
        "id": new_id(),
        "user_id": emp["id"],
        "user_name": emp.get("name"),
        "user_email": emp.get("email"),
        "role": emp["role"],
        "learning_content_id": event.learning_content_id or "",
        "event_type": event.event_type,
        "created_at": now_iso()
    }
    await db.learning_security_events().insert_one(doc)
    return {"status": "logged"}
