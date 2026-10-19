from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import db
from crm_models import DealCreate, Deal, now_iso
from services.rbac_service import get_current_employee, get_team_member_ids, sanitize_deal_for_employee

router = APIRouter(prefix="/api/crm/deals", tags=["crm_deals"])

@router.post("")
async def create_deal(deal_in: DealCreate, emp: dict = Depends(get_current_employee)):
    # Verify permissions (team lead, bdo, founder, admin, executive)
    if emp["role"] not in ["founder", "admin", "bdo", "team_lead", "executive"]:
        raise HTTPException(status_code=403, detail="Not authorized to create deals")

    count = await db.deals().count_documents({})
    deal_id_str = f"VS-DEAL-{(count + 1):06d}"
    assigned = getattr(deal_in, "assigned_employee", None) or emp["id"]

    new_deal = Deal(
        deal_id=deal_id_str,
        customer_id=deal_in.customer_id,
        property_id=deal_in.property_id,
        assigned_employee=assigned,
        final_deal_value=deal_in.final_deal_value,
        expected_commission=deal_in.expected_commission
    )
    
    await db.deals().insert_one(new_deal.model_dump())
    
    # Audit log
    from crm_models import AuditLog
    log = AuditLog(who=emp["id"], action="create", entity="deal", entity_id=new_deal.id)
    await db.audit_logs().insert_one(log.model_dump())
    
    return {"message": "Deal created", "id": new_deal.id, "deal_id": deal_id_str}

@router.get("")
async def list_deals(emp: dict = Depends(get_current_employee)):
    role = emp["role"]
    query = {}
    
    if role in ["executive", "trainee", "dpo"]:
        query["assigned_employee"] = emp["id"]
    elif role == "team_lead":
        team_ids = await get_team_member_ids(emp)
        query["assigned_employee"] = {"$in": team_ids}
        
    cursor = db.deals().find(query).sort("created_at", -1)
    deals = await cursor.to_list(length=100)
    
    for d in deals:
        d.pop("_id", None)
        # Resolve customer name
        cust = await db.customers().find_one({"id": d.get("customer_id")}, {"_id": 0, "name": 1, "phone": 1})
        d["customer"] = cust
        # Resolve property title
        prop = await db.properties().find_one({"id": d.get("property_id")}, {"_id": 0, "title": 1, "property_id": 1})
        d["property"] = prop
        
    return [sanitize_deal_for_employee(d, emp) for d in deals]

@router.get("/{deal_id}")
async def get_deal(deal_id: str, emp: dict = Depends(get_current_employee)):
    deal = await db.deals().find_one({"$or": [{"id": deal_id}, {"deal_id": deal_id}]})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
        
    role = emp["role"]
    if role in ["executive", "trainee", "dpo"]:
        if deal["assigned_employee"] != emp["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to view this deal")
    elif role == "team_lead":
        team_ids = await get_team_member_ids(emp)
        if deal["assigned_employee"] not in team_ids:
            raise HTTPException(status_code=403, detail="Not authorized to view this deal")
            
    deal.pop("_id", None)
    return sanitize_deal_for_employee(deal, emp)


@router.patch("/{deal_id}/status")
async def update_deal_status(deal_id: str, data: dict, emp: dict = Depends(get_current_employee)):
    deal = await db.deals().find_one({"$or": [{"id": deal_id}, {"deal_id": deal_id}]})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
        
    role = emp["role"]
    if role in ["executive", "trainee"] and deal["assigned_employee"] != emp["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this deal")
        
    upd = {"updated_at": now_iso()}
    if "status" in data:
        upd["status"] = data["status"]
    if "actual_commission" in data and role in ["founder", "admin", "bdo"]:
        upd["actual_commission"] = float(data["actual_commission"])
    if "final_deal_value" in data and role in ["founder", "admin", "bdo", "team_lead"]:
        upd["final_deal_value"] = float(data["final_deal_value"])
        
    await db.deals().update_one({"id": deal["id"]}, {"$set": upd})
    
    from crm_models import AuditLog
    await db.audit_logs().insert_one(AuditLog(who=emp["id"], action="update_deal_status", entity="deal", entity_id=deal["id"], new_value=data.get("status")).model_dump())
    
    return {"message": "Deal status updated"}

