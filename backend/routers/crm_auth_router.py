from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from jose import jwt
import os
import hmac
import db
from auth import verify_password, hash_password
from crm_models import EmployeeCreate, EmployeeLogin, Employee, now_iso, new_id
from services.rbac_service import get_current_employee, _secret, require_employee_roles

router = APIRouter(prefix="/api/crm/auth", tags=["crm_auth"])

def create_employee_token(employee_id: str, role: str) -> str:
    minutes = int(os.environ.get("ACCESS_TOKEN_TTL_MINUTES", "1440")) # 24 hours for CRM
    exp = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    return jwt.encode(
        {"sub": employee_id, "role": role, "exp": exp, "type": "employee_access"},
        _secret(),
        algorithm="HS256",
    )

@router.post("/login")
async def login(creds: EmployeeLogin):
    emp = await db.employees().find_one({"email": creds.email})
    if not emp:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(creds.password, emp["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if emp.get("status") != "active":
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    await db.employees().update_one({"id": emp["id"]}, {"$set": {"last_login": now_iso()}})
    
    token = create_employee_token(emp["id"], emp["role"])
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "employee": {k: v for k, v in emp.items() if k not in ["password_hash", "_id"]}
    }

@router.get("/me")
async def get_me(emp: dict = Depends(get_current_employee)):
    return {"employee": emp}


# ---------------------------------------------------------------------------
# CRM Gateway — Layer 1 common-password verification
# ---------------------------------------------------------------------------

class CrmGateVerifyRequest(BaseModel):
    password: str


def _create_gateway_token() -> str:
    """Return a short-lived (30 min) JWT that proves the gateway password was entered."""
    exp = datetime.now(timezone.utc) + timedelta(minutes=30)
    return jwt.encode(
        {"type": "crm_gateway", "exp": exp},
        _secret(),
        algorithm="HS256",
    )


def verify_gateway_token(token: str) -> bool:
    """Return True if the gateway token is valid and not expired."""
    try:
        payload = jwt.decode(token, _secret(), algorithms=["HS256"])
        return payload.get("type") == "crm_gateway"
    except Exception:
        return False


@router.post("/gate/verify")
async def verify_crm_gate(body: CrmGateVerifyRequest):
    """
    Layer-1 CRM access gate.

    Compares the submitted password against CRM_GATE_PASSWORD env var using
    a timing-safe comparison. Returns a short-lived gateway token on success.
    The password is NEVER logged, echoed, or included in any response.
    """
    gate_password = os.environ.get("CRM_GATE_PASSWORD", "")

    # Ensure the env var is actually configured
    if not gate_password:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRM service is temporarily unavailable. Please try again.",
        )

    # Timing-safe comparison to prevent timing-based password guessing
    passwords_match = hmac.compare_digest(
        gate_password.encode("utf-8"),
        body.password.encode("utf-8"),
    )

    if not passwords_match:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid CRM access password.",
        )

    gateway_token = _create_gateway_token()
    return {"gateway_token": gateway_token, "expires_in_seconds": 1800}
