from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import db
from services.rbac_service import get_current_employee, get_team_member_ids

router = APIRouter(prefix="/api/crm/audit-logs", tags=["crm_audit_logs"])


@router.get("")
async def list_audit_logs(
    entity: Optional[str] = None,
    who: Optional[str] = None,
    emp: dict = Depends(get_current_employee)
):
    role = emp["role"]
    if role not in ["founder", "admin", "bdo", "team_lead", "dpo"]:
        raise HTTPException(status_code=403, detail="Not authorized to view audit logs")
        
    query = {}
    if role == "team_lead":
        member_ids = await get_team_member_ids(emp)
        query["who"] = {"$in": member_ids}
    elif who:
        query["who"] = who

    if entity:
        query["entity"] = entity
        
    cursor = db.audit_logs().find(query).sort("timestamp", -1).limit(100)
    logs = await cursor.to_list(length=100)
    for l in logs:
        l.pop("_id", None)
        emp_doc = await db.employees().find_one({"id": l.get("who")}, {"_id": 0, "name": 1, "role": 1})
        l["employee_name"] = emp_doc.get("name") if emp_doc else l.get("who")
        l["employee_role"] = emp_doc.get("role") if emp_doc else ""
    return logs

