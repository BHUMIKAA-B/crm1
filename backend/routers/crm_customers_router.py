"""CRM Customers router."""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import db
from crm_models import CustomerCreate, Customer, now_iso
from services.rbac_service import get_current_employee, enforce_customer_access

router = APIRouter(prefix="/api/crm/customers", tags=["crm_customers"])


@router.post("")
async def create_customer(body: CustomerCreate, emp: dict = Depends(get_current_employee)):
    enforce_customer_access(emp)
    # Duplicate phone check
    existing = await db.customers().find_one({"phone": body.phone})
    if existing:
        existing.pop("_id", None)
        return {
            "message": "Possible duplicate found",
            "duplicate": True,
            "existing": existing,
        }
    cust = Customer(**body.model_dump(), created_by=emp["id"])
    await db.customers().insert_one(cust.model_dump())
    return {"message": "Customer created", "id": cust.id, "duplicate": False}


@router.get("")
async def list_customers(
    q: Optional[str] = None,
    emp: dict = Depends(get_current_employee),
):
    enforce_customer_access(emp)
    query: dict = {}

    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]

    cursor = db.customers().find(query, {"_id": 0}).sort("created_at", -1).limit(100)
    results = await cursor.to_list(length=100)
    return results


@router.get("/{customer_id}")
async def get_customer(customer_id: str, emp: dict = Depends(get_current_employee)):
    enforce_customer_access(emp)
    cust = await db.customers().find_one({"id": customer_id}, {"_id": 0})
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Enrich with leads & requirements
    leads = await db.leads().find(
        {"customer_id": customer_id}, {"_id": 0}
    ).to_list(length=50)
    reqs = await db.requirements().find(
        {"customer_id": customer_id}, {"_id": 0}
    ).to_list(length=50)
    visits = await db.site_visits().find(
        {"customer_id": customer_id}, {"_id": 0}
    ).to_list(length=20)

    return {**cust, "leads": leads, "requirements": reqs, "site_visits": visits}

