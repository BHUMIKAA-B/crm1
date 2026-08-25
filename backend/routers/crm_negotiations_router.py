from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import db
from crm_models import Negotiation, now_iso, new_id, AuditLog
from services.rbac_service import get_current_employee

router = APIRouter(prefix="/api/crm/negotiations", tags=["crm_negotiations"])

@router.post("")
async def create_negotiation_log(data: dict, emp: dict = Depends(get_current_employee)):
    neg = Negotiation(
        deal_id=data["deal_id"],
        seller_asking_price=float(data["seller_asking_price"]),
        buyer_offer=float(data["buyer_offer"]),
        counter_offer=float(data["counter_offer"]) if data.get("counter_offer") else None,
        current_expected_price=float(data["current_expected_price"]),
        notes=data.get("notes", ""),
        next_action=data.get("next_action", "")
    )
    doc = neg.model_dump()
    await db.negotiations().insert_one(doc)
    
    await db.audit_logs().insert_one(AuditLog(who=emp["id"], action="log_negotiation", entity="deal", entity_id=data["deal_id"]).model_dump())
    return {"message": "Negotiation entry recorded", "id": neg.id}

@router.get("")
async def list_negotiations(deal_id: Optional[str] = None, emp: dict = Depends(get_current_employee)):
    query = {}
    if deal_id:
        query["deal_id"] = deal_id
    cursor = db.negotiations().find(query).sort("created_at", -1).limit(100)
    negs = await cursor.to_list(length=100)
    for n in negs:
        n.pop("_id", None)
    return negs
