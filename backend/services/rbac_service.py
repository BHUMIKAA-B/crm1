from __future__ import annotations
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import os
import db

oauth2_scheme_crm = OAuth2PasswordBearer(tokenUrl="/api/crm/auth/login", auto_error=False)

def _secret() -> str:
    return os.environ.get("JWT_SECRET", "supersecret")

async def get_current_employee(token: Optional[str] = Depends(oauth2_scheme_crm)) -> dict:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated as employee",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(token, _secret(), algorithms=["HS256"])
        uid = payload.get("sub")
        emp_type = payload.get("type")
        if not uid or emp_type != "employee_access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        emp = await db.employees().find_one({"id": uid}, {"_id": 0, "password_hash": 0})
        if not emp:
            raise HTTPException(status_code=401, detail="Employee not found")
        
        if emp.get("status") != "active":
            raise HTTPException(status_code=403, detail="Account is not active")
        
        return emp
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_employee_roles(*roles: str):
    async def _checker(employee: dict = Depends(get_current_employee)) -> dict:
        allowed = list(roles) + ["founder", "admin"]
        if employee.get("role") not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return employee
    return _checker

def can_view_financials(employee: dict) -> bool:
    return employee.get("role") in ["founder", "admin"]

def can_access_audit_logs(employee: dict) -> bool:
    return employee.get("role") in ["founder", "admin", "dpo"]

def can_access_dpo_records(employee: dict) -> bool:
    return employee.get("role") in ["founder", "admin", "dpo"]

def allowed_target_roles_for_creator(creator_role: str) -> List[str]:
    if creator_role in ["founder", "admin"]:
        return ["dpo", "bdo", "team_lead", "executive", "trainee"]
    elif creator_role == "bdo":
        return ["team_lead", "executive", "trainee"]
    elif creator_role == "team_lead":
        return ["executive", "trainee"]
    return []

async def get_team_member_ids(employee: dict) -> List[str]:
    """Retrieve all employee IDs that belong to the employee's team scope."""
    emp_id = employee["id"]

    # First try to find the team this employee leads
    team_doc = await db.teams().find_one({"team_leader_id": emp_id})
    if not team_doc:
        # Fallback: look up by stored team_id field
        team_id_val = employee.get("team_id")
        if team_id_val:
            team_doc = await db.teams().find_one(
                {"$or": [{"id": team_id_val}, {"team_id": team_id_val}]}
            )

    # Build a list of all team id variants to match against
    team_ids_to_check = list(filter(None, [
        team_doc["id"] if team_doc else None,
        team_doc.get("team_id") if team_doc else None,
        employee.get("team_id"),
        emp_id,
    ]))

    query = {
        "$or": [
            {"reporting_manager": emp_id},
            {"team_id": {"$in": team_ids_to_check}},
            {"id": emp_id},
        ]
    }
    cursor = db.employees().find(query, {"_id": 0, "id": 1})
    members = await cursor.to_list(length=1000)
    member_ids = list({m["id"] for m in members})
    if emp_id not in member_ids:
        member_ids.append(emp_id)
    return member_ids

async def build_scope_query(employee: dict, field_name: str = "assigned_to") -> dict:
    """Build a MongoDB query filter enforcing strict role/team data scoping."""
    role = employee.get("role")
    if role in ["founder", "admin", "bdo"]:
        return {}
    elif role == "team_lead":
        member_ids = await get_team_member_ids(employee)
        return {field_name: {"$in": member_ids}}
    else: # executive, trainee, dpo
        return {field_name: employee["id"]}

def enforce_customer_access(employee: dict) -> None:
    """Customer data and customer requirements are visible ONLY to Founder and BDO."""
    if employee.get("role") not in ["founder", "admin", "bdo"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer data and requirements are restricted to Founder and BDO."
        )

def enforce_broker_access(employee: dict) -> None:
    """Broker section access is restricted strictly to Founder and BDO."""
    if employee.get("role") not in ["founder", "admin", "bdo"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Broker section access is restricted to Founder and BDO."
        )

def sanitize_deal_for_employee(deal: dict, employee: dict) -> dict:
    d = dict(deal)
    # If trainee, executive or dpo (not assigned), redact restricted financials
    role = employee.get("role")
    is_assigned = (d.get("assigned_employee") == employee.get("id"))
    if role in ["trainee", "executive", "dpo"] and not is_assigned:
        d["final_deal_value"] = None
        d["expected_commission"] = None
        d["actual_commission"] = None
        d["employee_commission_share"] = None
        d["broker_commission_share"] = None
    elif role == "trainee":
        d["expected_commission"] = None
        d["actual_commission"] = None
        d["employee_commission_share"] = None
        d["broker_commission_share"] = None
    return d


