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
    elif creator_role == "team_lead":
        return ["executive", "trainee"]
    return []

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

