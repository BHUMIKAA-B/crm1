from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import db
from crm_models import CommissionEnroll, CommissionRecord, now_iso, new_id, AuditLog
from services.rbac_service import get_current_employee, get_team_member_ids

router = APIRouter(prefix="/api/crm/commissions", tags=["crm_commissions"])


@router.post("")
async def enroll_commission(body: CommissionEnroll, emp: dict = Depends(get_current_employee)):
    role = emp["role"]
    if role not in ["founder", "admin", "bdo", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized to enroll commissions")

    # Fetch executive
    executive = await db.employees().find_one({"id": body.executive_id})
    if not executive:
        raise HTTPException(status_code=404, detail="Target executive employee not found")

    # Team Lead verification: target executive MUST belong to Team Lead's team
    if role == "team_lead":
        emp_team_id = emp.get("team_id") or emp["id"]
        exec_team_id = executive.get("team_id") or executive.get("reporting_manager")
        if exec_team_id != emp_team_id and executive.get("reporting_manager") != emp["id"]:
            raise HTTPException(
                status_code=403,
                detail="Team Leader can only enroll commission for Executives in their own team."
            )

    count = await db.commissions().count_documents({})
    comm_display_id = f"VS-COMM-{(count + 1):06d}"

    # Fetch deal for reference
    deal = await db.deals().find_one({"$or": [{"id": body.deal_id}, {"deal_id": body.deal_id}]})
    prop_id = deal.get("property_id") if deal else None
    team_id = executive.get("team_id") or emp.get("team_id") or emp["id"]

    comm_record = CommissionRecord(
        commission_id=comm_display_id,
        executive_id=body.executive_id,
        team_id=team_id,
        deal_id=body.deal_id,
        property_id=prop_id,
        amount=body.amount,
        percentage=body.percentage,
        status="enrolled",
        notes=body.notes,
        enrolled_by=emp["id"],
        created_at=now_iso(),
        updated_at=now_iso(),
    )

    doc = comm_record.model_dump()
    await db.commissions().insert_one(doc)

    # Also update deal employee_commission_share if deal exists
    if deal:
        await db.deals().update_one(
            {"id": deal["id"]},
            {"$set": {"employee_commission_share": body.amount, "updated_at": now_iso()}}
        )

    # Audit log
    audit = AuditLog(who=emp["id"], action="enroll_commission", entity="commission", entity_id=comm_record.id)
    await db.audit_logs().insert_one(audit.model_dump())

    return {
        "message": "Commission enrolled successfully",
        "id": comm_record.id,
        "commission_id": comm_display_id,
    }


@router.get("")
async def get_commissions_summary(emp: dict = Depends(get_current_employee)):
    role = emp["role"]
    if role in ["trainee"]:
        raise HTTPException(status_code=403, detail="Trainees cannot view commission reports")
        
    query = {}
    if role in ["executive"]:
        query["executive_id"] = emp["id"]
    elif role == "team_lead":
        team_ids = await get_team_member_ids(emp)
        query["$or"] = [{"executive_id": {"$in": team_ids}}, {"team_id": emp.get("team_id")}]
        
    cursor = db.commissions().find(query).sort("created_at", -1)
    commissions = await cursor.to_list(length=500)
    
    # If no commissions recorded directly, fallback to deal commissions view
    if not commissions:
        deal_query = {}
        if role in ["executive"]:
            deal_query["assigned_employee"] = emp["id"]
        elif role == "team_lead":
            team_ids = await get_team_member_ids(emp)
            deal_query["assigned_employee"] = {"$in": team_ids}
            
        cursor_deals = db.deals().find(deal_query)
        deals = await cursor_deals.to_list(length=500)
        
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
            "breakdown": items,
            "commissions": []
        }

    for c in commissions:
        c.pop("_id", None)
        exec_doc = await db.employees().find_one({"id": c.get("executive_id")}, {"_id": 0, "name": 1, "employee_id": 1})
        c["executive_name"] = exec_doc.get("name") if exec_doc else c.get("executive_id")

    total_amount = sum(float(c.get("amount") or 0) for c in commissions)
    return {
        "total_employee_share": total_amount,
        "deals_count": len(commissions),
        "commissions": commissions,
        "breakdown": commissions
    }

