"""Authentication routes."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone

import db
import auth as auth_utils
from models import UserRegister, UserLogin, UserPublic, new_id, now_iso
import os
import requests

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _to_public(user: dict) -> dict:
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "phone": user["phone"],
        "role": user["role"],
        "is_active": user.get("is_active", True),
        "saved_properties": user.get("saved_properties", []),
        "created_at": user.get("created_at"),
    }


@router.post("/register")
async def register(payload: UserRegister):
    if payload.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot self-register as admin")
    existing = await db.users().find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = {
        "id": new_id(),
        "name": payload.name.strip(),
        "email": payload.email.lower(),
        "phone": payload.phone.strip(),
        "password_hash": auth_utils.hash_password(payload.password),
        "role": payload.role,
        "is_active": True,
        "is_verified": False,
        "is_phone_verified": False,
        "saved_properties": [],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.users().insert_one(user)
    # Welcome email (logs if no Resend key)
    try:
        from services.email import send_email, tpl_welcome
        subject, html = tpl_welcome(user["name"], user["role"])
        await send_email(user["email"], subject, html)
    except Exception:
        pass
    access = auth_utils.create_access_token(user["id"], user["role"])
    refresh = auth_utils.create_refresh_token(user["id"], user["role"])
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "user": _to_public(user),
    }


@router.post("/login")
async def login(payload: UserLogin):
    email_clean = payload.email.strip().lower()
    user = await db.users().find_one({"email": email_clean})
    if not user:
        # Fallback: check employees collection if user is not in public users collection
        emp = await db.employees().find_one({"email": email_clean})
        if emp and auth_utils.verify_password(payload.password, emp.get("password_hash", "")):
            if emp.get("status", "active") != "active":
                raise HTTPException(status_code=403, detail="Account is deactivated")
            mapped_role = "admin" if emp.get("role") in ["founder", "admin"] else "seller"
            user = {
                "id": emp["id"],
                "name": emp["name"],
                "email": emp["email"],
                "phone": emp.get("phone", ""),
                "role": mapped_role,
                "is_active": True,
                "saved_properties": [],
                "created_at": emp.get("created_at", now_iso()),
            }
            access = auth_utils.create_access_token(user["id"], user["role"])
            refresh = auth_utils.create_refresh_token(user["id"], user["role"])
            return {
                "access_token": access,
                "refresh_token": refresh,
                "token_type": "bearer",
                "user": _to_public(user),
            }

    if not user or not auth_utils.verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    access = auth_utils.create_access_token(user["id"], user["role"])
    refresh = auth_utils.create_refresh_token(user["id"], user["role"])
    # Login history (last 10)
    await db.users().update_one(
        {"id": user["id"]},
        {
            "$push": {
                "login_history": {
                    "$each": [{"timestamp": now_iso()}],
                    "$slice": -10,
                }
            }
        },
    )
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "user": _to_public(user),
    }


@router.post("/refresh-token")
async def refresh(body: dict):
    token = body.get("refresh_token")
    if not token:
        raise HTTPException(status_code=400, detail="refresh_token required")
    try:
        payload = auth_utils.decode_refresh(token)
        if payload.get("type") != "refresh":
            raise ValueError("Wrong token type")
        uid = payload["sub"]
        role = payload["role"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await db.users().find_one({"id": uid})
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return {
        "access_token": auth_utils.create_access_token(uid, role),
        "token_type": "bearer",
    }



@router.post("/cognito/callback")
async def cognito_callback(body: dict):
    # Expects { code: string }
    code = body.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="code required")
    COG_DOMAIN = os.environ.get("COGNITO_DOMAIN")
    CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID")
    CLIENT_SECRET = os.environ.get("COGNITO_CLIENT_SECRET")
    REDIRECT_URI = os.environ.get("COGNITO_REDIRECT_URI")
    if not COG_DOMAIN or not CLIENT_ID or not REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Cognito not configured")
    token_url = f"https://{COG_DOMAIN}/oauth2/token"
    data = {
        "grant_type": "authorization_code",
        "client_id": CLIENT_ID,
        "code": code,
        "redirect_uri": REDIRECT_URI,
    }
    auth = None
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    if CLIENT_SECRET:
        # use HTTP Basic auth
        from requests.auth import HTTPBasicAuth

        auth = HTTPBasicAuth(CLIENT_ID, CLIENT_SECRET)

    try:
        r = requests.post(token_url, data=data, auth=auth, headers=headers, timeout=10)
        r.raise_for_status()
        tokens = r.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {e}")

    id_token = tokens.get("id_token")
    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="No id_token returned")

    # validate id_token and sync user
    claims = None
    try:
        claims = auth_utils._verify_cognito_id_token(id_token)
    except Exception:
        claims = None
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid id token")

    email = claims.get("email")
    sub = claims.get("sub")
    groups = claims.get("cognito:groups") or []
    role = "buyer"
    if isinstance(groups, list):
        if "admin" in groups:
            role = "admin"
        elif "seller" in groups:
            role = "seller"

    # upsert user by email
    user = await db.users().find_one({"email": email})
    if not user:
        user_doc = {
            "id": new_id(),
            "name": claims.get("name") or email.split("@")[0],
            "email": email,
            "phone": claims.get("phone_number") or "",
            "role": role,
            "is_active": True,
            "is_verified": True,
            "is_phone_verified": bool(claims.get("phone_number")),
            "saved_properties": [],
            "cognito_sub": sub,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.users().insert_one(user_doc)
        user = user_doc
    else:
        upd = {}
        if user.get("role") != role:
            upd["role"] = role
        if not user.get("cognito_sub"):
            upd["cognito_sub"] = sub
        if upd:
            upd["updated_at"] = now_iso()
            await db.users().update_one({"email": email}, {"$set": upd})

    # create internal tokens so frontend can use existing auth flow
    internal_access = auth_utils.create_access_token(user["id"], user["role"])
    internal_refresh = auth_utils.create_refresh_token(user["id"], user["role"])

    return {
        "access_token": internal_access,
        "refresh_token": internal_refresh,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "is_active": user.get("is_active", True),
            "saved_properties": user.get("saved_properties", []),
            "created_at": user.get("created_at"),
        },
    }


@router.get("/me")
async def me(user: dict = Depends(auth_utils.get_current_user)):
    return _to_public(user)
