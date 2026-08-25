from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import db
from crm_models import Payment, now_iso, new_id, AuditLog
from services.rbac_service import get_current_employee

router = APIRouter(prefix="/api/crm/payments", tags=["crm_payments"])

@router.post("")
async def record_payment(data: dict, emp: dict = Depends(get_current_employee)):
    pay = Payment(
        deal_id=data["deal_id"],
        payment_type=data["payment_type"],
        amount=float(data["amount"]),
        due_date=data["due_date"],
        received_date=data.get("received_date"),
        status=data.get("status", "pending"),
        reference_no=data.get("reference_no", ""),
        notes=data.get("notes", "")
    )
    doc = pay.model_dump()
    await db.payments().insert_one(doc)
    
    await db.audit_logs().insert_one(AuditLog(who=emp["id"], action="record_payment", entity="deal", entity_id=data["deal_id"]).model_dump())
    return {"message": "Payment record created", "id": pay.id}

@router.get("")
async def list_payments(deal_id: Optional[str] = None, emp: dict = Depends(get_current_employee)):
    query = {}
    if deal_id:
        query["deal_id"] = deal_id
    cursor = db.payments().find(query).sort("due_date", 1).limit(100)
    pays = await cursor.to_list(length=100)
    for p in pays:
        p.pop("_id", None)
    return pays
