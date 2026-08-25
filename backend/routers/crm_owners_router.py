from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import db
from crm_models import PropertyOwner, now_iso, new_id, AuditLog
from services.rbac_service import get_current_employee

router = APIRouter(prefix="/api/crm/owners", tags=["crm_owners"])

@router.post("")
async def create_owner(data: dict, emp: dict = Depends(get_current_employee)):
    count = await db.owners().count_documents({})
    display_id = f"VS-OWN-{(count + 1):06d}"
    
    owner = PropertyOwner(
        owner_id=display_id,
        name=data["name"],
        mobile=data["mobile"],
        email=data.get("email"),
        address=data.get("address", ""),
        properties_owned=data.get("properties_owned", []),
        assigned_employee=data.get("assigned_employee", emp["id"]),
        notes=data.get("notes", "")
    )
    doc = owner.model_dump()
    await db.owners().insert_one(doc)
    
    await db.audit_logs().insert_one(AuditLog(who=emp["id"], action="create_owner", entity="owner", entity_id=owner.id).model_dump())
    return {"message": "Owner profile created", "id": owner.id, "owner_id": display_id}

@router.get("")
async def list_owners(emp: dict = Depends(get_current_employee)):
    cursor = db.owners().find({}).sort("created_at", -1).limit(100)
    owners_list = await cursor.to_list(length=100)
    for o in owners_list:
        o.pop("_id", None)
    return owners_list

@router.get("/{owner_id}")
async def get_owner(owner_id: str, emp: dict = Depends(get_current_employee)):
    owner = await db.owners().find_one({"$or": [{"id": owner_id}, {"owner_id": owner_id}]}, {"_id": 0})
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    return owner
