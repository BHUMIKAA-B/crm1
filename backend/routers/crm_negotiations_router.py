from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import db
from crm_models import Negotiation, now_iso, new_id, AuditLog
from services.rbac_service import get_current_employee, get_team_member_ids

router = APIRouter(prefix="/api/crm/negotiations", tags=["crm_negotiations"])


async def _resolve_team_id(emp: dict) -> Optional[str]:
    """Helper to resolve team ID for an employee."""
    emp_id = emp["id"]
    if emp.get("role") == "team_lead":
        team = await db.teams().find_one({"team_leader_id": emp_id})
        if team:
            return team.get("id")
    team_id_val = emp.get("team_id")
    if team_id_val:
        team = await db.teams().find_one({"$or": [{"id": team_id_val}, {"team_id": team_id_val}]})
        if team:
            return team.get("id")
    return emp.get("team_id")


@router.post("")
async def create_negotiation_log(data: dict, emp: dict = Depends(get_current_employee)):
    """
    Create a Negotiation record.
    Manual creation capability is granted to Team Leaders, BDOs, and Founders.
    Executive / Trainee manual API calls are rejected with HTTP 403 Forbidden.
    """
    role = emp.get("role", "")
    if role in ["executive", "trainee", "dpo"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manual negotiation entry is restricted to Team Leaders, BDOs, and Founders."
        )

    customer_id = data.get("customer_id")
    deal_id = data.get("deal_id")

    if not customer_id and not deal_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either customer_id or deal_id is required for a negotiation entry."
        )

    cust_name = ""
    cust_phone = ""
    if customer_id:
        cust = await db.customers().find_one({"id": customer_id}, {"_id": 0, "name": 1, "phone": 1})
        if cust:
            cust_name = cust.get("name", "")
            cust_phone = cust.get("phone", "")
        else:
            raise HTTPException(status_code=404, detail="Selected customer not found")

    team_id = await _resolve_team_id(emp)

    seller_price = float(data.get("seller_asking_price") or 0.0)
    buyer_offer = float(data.get("buyer_offer") or 0.0)
    counter_offer = float(data["counter_offer"]) if data.get("counter_offer") is not None and data.get("counter_offer") != "" else None
    expected_price = float(data.get("current_expected_price") or buyer_offer or seller_price)

    neg = Negotiation(
        deal_id=deal_id,
        customer_id=customer_id,
        customer_name=cust_name or data.get("customer_name"),
        customer_phone=cust_phone or data.get("customer_phone"),
        status=data.get("status", "in_progress"),
        seller_asking_price=seller_price,
        buyer_offer=buyer_offer,
        counter_offer=counter_offer,
        current_expected_price=expected_price,
        notes=data.get("notes", "") or data.get("remarks", ""),
        remarks=data.get("remarks", "") or data.get("notes", ""),
        next_action=data.get("next_action", ""),
        followup_date=data.get("followup_date") or data.get("follow_up_date"),
        created_by=emp["id"],
        created_by_name=emp.get("name", ""),
        assigned_employee=data.get("assigned_employee") or emp["id"],
        team_id=team_id,
        history=[{
            "action": "created",
            "performed_by": emp["id"],
            "performed_by_name": emp.get("name", ""),
            "timestamp": now_iso(),
            "status": data.get("status", "in_progress"),
            "buyer_offer": buyer_offer,
            "seller_asking_price": seller_price,
            "current_expected_price": expected_price,
            "notes": data.get("notes", "")
        }]
    )

    doc = neg.model_dump()
    await db.negotiations().insert_one(doc)

    await db.audit_logs().insert_one(
        AuditLog(
            who=emp["id"],
            action="create_negotiation",
            entity="negotiation",
            entity_id=neg.id
        ).model_dump()
    )

    return {"message": "Negotiation entry recorded", "id": neg.id}


@router.get("")
async def list_negotiations(
    deal_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    emp: dict = Depends(get_current_employee)
):
    """
    List Negotiations scoped by user role and team.
    """
    query: dict = {}
    if deal_id:
        query["deal_id"] = deal_id
    if customer_id:
        query["customer_id"] = customer_id

    role = emp.get("role", "")
    if role in ["executive", "trainee", "dpo"]:
        query["$or"] = [{"created_by": emp["id"]}, {"assigned_employee": emp["id"]}]
    elif role == "team_lead":
        member_ids = await get_team_member_ids(emp)
        query["$or"] = [
            {"created_by": {"$in": member_ids}},
            {"assigned_employee": {"$in": member_ids}},
            {"team_id": emp.get("team_id")}
        ]
    # Founder, Admin, and BDO see all negotiations in query scope

    cursor = db.negotiations().find(query).sort("updated_at", -1).limit(200)
    negs = await cursor.to_list(length=200)

    for n in negs:
        n.pop("_id", None)
        if n.get("customer_id") and not n.get("customer_name"):
            cust = await db.customers().find_one({"id": n["customer_id"]}, {"_id": 0, "name": 1, "phone": 1, "email": 1})
            if cust:
                n["customer_name"] = cust.get("name")
                n["customer_phone"] = cust.get("phone")
                n["customer"] = cust

    return negs


@router.get("/{negotiation_id}")
async def get_negotiation(negotiation_id: str, emp: dict = Depends(get_current_employee)):
    neg = await db.negotiations().find_one({"id": negotiation_id}, {"_id": 0})
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation record not found")

    role = emp.get("role", "")
    if role in ["executive", "trainee", "dpo"]:
        if neg.get("created_by") != emp["id"] and neg.get("assigned_employee") != emp["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to view this negotiation")
    elif role == "team_lead":
        member_ids = await get_team_member_ids(emp)
        if neg.get("created_by") not in member_ids and neg.get("assigned_employee") not in member_ids and neg.get("team_id") != emp.get("team_id"):
            raise HTTPException(status_code=403, detail="Not authorized to view this negotiation")

    if neg.get("customer_id"):
        cust = await db.customers().find_one({"id": neg["customer_id"]}, {"_id": 0})
        neg["customer"] = cust

    return neg


@router.put("/{negotiation_id}")
async def update_negotiation(
    negotiation_id: str,
    data: dict,
    emp: dict = Depends(get_current_employee)
):
    """
    Update/Edit a Negotiation record.
    Restricted to Team Leaders, BDOs, and Founders.
    Team Leaders are restricted to negotiations within their team scope.
    """
    role = emp.get("role", "")
    if role in ["executive", "trainee", "dpo"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Editing negotiation records is restricted to Team Leaders, BDOs, and Founders."
        )

    neg = await db.negotiations().find_one({"id": negotiation_id})
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation record not found")

    # Team Leader scope restriction
    if role == "team_lead":
        member_ids = await get_team_member_ids(emp)
        team_id_val = emp.get("team_id")
        neg_creator = neg.get("created_by")
        neg_assigned = neg.get("assigned_employee")
        neg_team = neg.get("team_id")

        if neg_creator not in member_ids and neg_assigned not in member_ids and (neg_team and neg_team != team_id_val):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to edit another team's negotiation record."
            )

    updates = {}
    for key in ["status", "seller_asking_price", "buyer_offer", "counter_offer", "current_expected_price", "notes", "remarks", "next_action", "followup_date", "assigned_employee"]:
        if key in data:
            if key in ["seller_asking_price", "buyer_offer", "current_expected_price"] and data[key] is not None:
                updates[key] = float(data[key])
            elif key == "counter_offer":
                updates[key] = float(data[key]) if data[key] is not None and data[key] != "" else None
            else:
                updates[key] = data[key]

    updates["updated_at"] = now_iso()

    history_entry = {
        "action": "updated",
        "performed_by": emp["id"],
        "performed_by_name": emp.get("name", ""),
        "timestamp": now_iso(),
        "changes": {k: updates[k] for k in updates if k != "updated_at"}
    }

    await db.negotiations().update_one(
        {"id": neg["id"]},
        {
            "$set": updates,
            "$push": {"history": history_entry}
        }
    )

    await db.audit_logs().insert_one(
        AuditLog(
            who=emp["id"],
            action="update_negotiation",
            entity="negotiation",
            entity_id=neg["id"]
        ).model_dump()
    )

    return {"message": "Negotiation record updated successfully"}
