from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import db
from crm_models import PropertyShare, now_iso, new_id, AuditLog
from services.rbac_service import get_current_employee

router = APIRouter(prefix="/api/crm/property-shares", tags=["crm_property_shares"])

@router.post("")
async def log_property_share(data: dict, emp: dict = Depends(get_current_employee)):
    share = PropertyShare(
        customer_id=data["customer_id"],
        employee_id=emp["id"],
        properties=data.get("properties", []),
        notes=data.get("notes", "")
    )
    doc = share.model_dump()
    await db.property_shares().insert_one(doc)
    
    await db.audit_logs().insert_one(AuditLog(who=emp["id"], action="share_properties", entity="customer", entity_id=data["customer_id"]).model_dump())
    return {"message": "Property share logged", "id": share.id}

@router.get("")
async def list_property_shares(customer_id: Optional[str] = None, emp: dict = Depends(get_current_employee)):
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    cursor = db.property_shares().find(query).sort("date_shared", -1).limit(100)
    shares = await cursor.to_list(length=100)
    for s in shares:
        s.pop("_id", None)
        cust = await db.customers().find_one({"id": s["customer_id"]}, {"_id": 0})
        s["customer"] = cust
    return shares
