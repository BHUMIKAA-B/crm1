from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import db
from crm_models import Notification, now_iso, new_id
from services.rbac_service import get_current_employee

router = APIRouter(prefix="/api/crm/notifications", tags=["crm_notifications"])

@router.get("")
async def list_notifications(emp: dict = Depends(get_current_employee)):
    cursor = db.crm_notifications().find({"recipient_id": emp["id"]}).sort("created_at", -1).limit(50)
    notifs = await cursor.to_list(length=50)
    for n in notifs:
        n.pop("_id", None)
        
    unread_count = await db.crm_notifications().count_documents({"recipient_id": emp["id"], "is_read": False})
    return {"notifications": notifs, "unread_count": unread_count}

@router.patch("/{notif_id}/read")
async def mark_notification_read(notif_id: str, emp: dict = Depends(get_current_employee)):
    await db.crm_notifications().update_one({"id": notif_id, "recipient_id": emp["id"]}, {"$set": {"is_read": True}})
    return {"message": "Notification marked as read"}

@router.post("/read-all")
async def mark_all_notifications_read(emp: dict = Depends(get_current_employee)):
    await db.crm_notifications().update_many({"recipient_id": emp["id"], "is_read": False}, {"$set": {"is_read": True}})
    return {"message": "All notifications marked as read"}
