from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import db
from services.rbac_service import get_current_employee

router = APIRouter(prefix="/api/crm/commissions", tags=["crm_commissions"])

@router.get("")
async def get_commissions_summary(emp: dict = Depends(get_current_employee)):
    role = emp["role"]
    if role in ["trainee"]:
        raise HTTPException(status_code=403, detail="Trainees cannot view commission reports")
        
    query = {}
    if role in ["executive"]:
        query["assigned_employee"] = emp["id"]
    elif role == "team_lead":
        team = await db.employees().find({"reporting_manager": emp["id"]}).to_list(length=None)
        team_ids = [t["id"] for t in team] + [emp["id"]]
        query["assigned_employee"] = {"$in": team_ids}
        
    cursor = db.deals().find(query)
    deals = await cursor.to_list(length=500)
    
    total_expected = sum(float(d.get("expected_commission") or 0) for d in deals)
    total_actual = sum(float(d.get("actual_commission") or 0) for d in deals)
    total_emp_share = sum(float(d.get("employee_commission_share") or 0) for d in deals)
    
    items = []
    for d in deals:
        items.append({
            "deal_id": d.get("deal_id"),
            "property_id": d.get("property_id"),
            "customer_id": d.get("customer_id"),
            "final_deal_value": d.get("final_deal_value") if role in ["founder", "admin", "bdo", "team_lead"] else None,
            "expected_commission": d.get("expected_commission") if role in ["founder", "admin", "bdo"] else None,
            "actual_commission": d.get("actual_commission") if role in ["founder", "admin", "bdo"] else None,
            "employee_commission_share": d.get("employee_commission_share"),
            "status": d.get("status")
        })
        
    return {
        "total_expected_commission": total_expected if role in ["founder", "admin", "bdo"] else 0,
        "total_actual_commission": total_actual if role in ["founder", "admin", "bdo"] else 0,
        "total_employee_share": total_emp_share,
        "deals_count": len(deals),
        "breakdown": items
    }
