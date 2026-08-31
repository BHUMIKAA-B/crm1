from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import db
from crm_models import RequirementCreate, Requirement, now_iso, new_id
from services.rbac_service import get_current_employee, enforce_customer_access

router = APIRouter(prefix="/api/crm/requirements", tags=["crm_requirements"])

@router.post("")
async def create_requirement(req_in: RequirementCreate, emp: dict = Depends(get_current_employee)):
    enforce_customer_access(emp)
    new_req = Requirement(**req_in.model_dump())
    doc = new_req.model_dump()
    await db.requirements().insert_one(doc)
    return {"message": "Requirement created", "id": new_req.id}

@router.get("")
async def list_requirements(customer_id: Optional[str] = None, emp: dict = Depends(get_current_employee)):
    enforce_customer_access(emp)
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    cursor = db.requirements().find(query).sort("created_at", -1).limit(100)
    reqs = await cursor.to_list(length=100)
    for r in reqs:
        r.pop("_id", None)
        cust = await db.customers().find_one({"id": r["customer_id"]}, {"_id": 0})
        r["customer"] = cust
    return reqs

@router.get("/{req_id}")
async def get_requirement(req_id: str, emp: dict = Depends(get_current_employee)):
    enforce_customer_access(emp)
    req = await db.requirements().find_one({"id": req_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    cust = await db.customers().find_one({"id": req["customer_id"]}, {"_id": 0})
    req["customer"] = cust
    return req

