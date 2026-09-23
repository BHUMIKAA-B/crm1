from fastapi import APIRouter, HTTPException, Depends
import os
import db
import auth as auth_utils
from models import new_id, now_iso

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.post("/reset")
async def reset_admin():
    """Create or update the initial admin account using env vars.
    Requires INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD to be set.
    This endpoint is intended for first‑time deployment only.
    """
    email = os.getenv("INITIAL_ADMIN_EMAIL")
    password = os.getenv("INITIAL_ADMIN_PASSWORD")
    if not email or not password:
        raise HTTPException(status_code=400, detail="INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set")
    # Check if admin exists
    admin = await db.users().find_one({"email": email.lower()})
    pwd_hash = auth_utils.hash_password(password)
    if admin:
        # Update password and role just in case
        await db.users().update_one({"id": admin["id"]}, {"$set": {"password_hash": pwd_hash, "role": "admin"}})
    else:
        admin_user = {
            "id": new_id(),
            "name": "VisitSarva Admin",
            "email": email.lower(),
            "phone": "+910000000000",
            "password_hash": pwd_hash,
            "role": "admin",
            "is_active": True,
            "saved_properties": [],
            "created_at": now_iso(),
        }
        await db.users().insert_one(admin_user)
    return {"status": "admin account reset"}
