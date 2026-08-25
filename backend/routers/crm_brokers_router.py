from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import db
from crm_models import Broker, now_iso, new_id, AuditLog
from services.rbac_service import get_current_employee

router = APIRouter(prefix="/api/crm/brokers", tags=["crm_brokers"])

@router.post("")
async def create_broker(data: dict, emp: dict = Depends(get_current_employee)):
    count = await db.brokers().count_documents({})
    display_id = f"VS-BROK-{(count + 1):06d}"
    
    broker = Broker(
        broker_id=display_id,
        name=data["name"],
        phone=data["phone"],
        area=data.get("area", ""),
        specialization=data.get("specialization", ""),
        reliability=data.get("reliability", 3),
        assigned_employee=data.get("assigned_employee", emp["id"])
    )
    doc = broker.model_dump()
    await db.brokers().insert_one(doc)
    
    await db.audit_logs().insert_one(AuditLog(who=emp["id"], action="create_broker", entity="broker", entity_id=broker.id).model_dump())
    return {"message": "Broker profile created", "id": broker.id, "broker_id": display_id}

@router.get("")
async def list_brokers(emp: dict = Depends(get_current_employee)):
    cursor = db.brokers().find({}).sort("created_at", -1).limit(100)
    brokers_list = await cursor.to_list(length=100)
    for b in brokers_list:
        b.pop("_id", None)
    return brokers_list

@router.get("/{broker_id}")
async def get_broker(broker_id: str, emp: dict = Depends(get_current_employee)):
    broker = await db.brokers().find_one({"$or": [{"id": broker_id}, {"broker_id": broker_id}]}, {"_id": 0})
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    return broker
