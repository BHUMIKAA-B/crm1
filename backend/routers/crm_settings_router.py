from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
import db
from crm_models import now_iso
from services.rbac_service import get_current_employee

router = APIRouter(prefix="/api/crm/settings", tags=["crm_settings"])

DEFAULT_SETTINGS = {
    "company_name": "VisitSarva Real Estate",
    "support_phone": "+91 98000 00000",
    "support_email": "support@visitsarva.com",
    "default_currency": "INR",
    "auto_assignment_mode": "round_robin",
    "require_site_visit_feedback": True,
    "lead_expiry_days": 30
}

@router.get("")
async def get_settings(emp: dict = Depends(get_current_employee)):
    settings_doc = await db.crm_settings().find_one({"key": "global_config"}, {"_id": 0})
    if not settings_doc:
        return DEFAULT_SETTINGS
    return settings_doc.get("value", DEFAULT_SETTINGS)

@router.post("")
async def update_settings(data: Dict[str, Any], emp: dict = Depends(get_current_employee)):
    if emp["role"] not in ["founder", "admin"]:
        raise HTTPException(status_code=403, detail="Only Founder/Admin can change CRM settings")
        
    await db.crm_settings().update_one(
        {"key": "global_config"},
        {"$set": {
            "key": "global_config",
            "value": data,
            "updated_by": emp["id"],
            "updated_at": now_iso()
        }},
        upsert=True
    )
    return {"message": "CRM settings updated successfully"}
