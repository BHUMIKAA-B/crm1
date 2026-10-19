"""CRM Global Search — respects RBAC, never leaks cross-employee records."""
from fastapi import APIRouter, Depends, Query
import db
from services.rbac_service import get_current_employee

router = APIRouter(prefix="/api/crm/search", tags=["crm_search"])


@router.get("")
async def global_search(q: str = Query(..., min_length=2), emp: dict = Depends(get_current_employee)):
    role = emp["role"]
    regex = {"$regex": q, "$options": "i"}

    # --- Leads ---
    lead_query: dict = {
        "$or": [
            {"lead_id": regex},
            {"notes": regex},
        ]
    }
    if role in ["executive", "trainee"]:
        lead_query["assigned_to"] = emp["id"]
    elif role == "team_lead":
        team = await db.employees().find({"reporting_manager": emp["id"]}, {"id": 1}).to_list(None)
        lead_query["assigned_to"] = {"$in": [t["id"] for t in team] + [emp["id"]]}

    leads = await db.leads().find(lead_query, {"_id": 0}).limit(10).to_list(10)

    # --- Customers ---
    cust_query: dict = {
        "$or": [
            {"name": regex},
            {"phone": regex},
            {"email": regex},
        ]
    }
    if role in ["executive", "trainee"]:
        my_leads = await db.leads().find({"assigned_to": emp["id"]}, {"customer_id": 1}).to_list(500)
        cust_ids = [l["customer_id"] for l in my_leads]
        cust_query["id"] = {"$in": cust_ids}

    customers = await db.customers().find(cust_query, {"_id": 0}).limit(10).to_list(10)

    # --- Properties ---
    prop_query: dict = {
        "$or": [
            {"title": regex},
            {"location.address": regex},
            {"location.city": regex},
        ]
    }
    properties = await db.properties().find(prop_query, {"_id": 0}).limit(10).to_list(10)

    # --- Employees (only for senior roles) ---
    employees: list = []
    if role in ["founder", "admin", "team_lead", "bdo"]:
        emp_query = {"$or": [{"name": regex}, {"email": regex}, {"employee_id": regex}]}
        employees = await db.employees().find(
            emp_query, {"_id": 0, "password_hash": 0}
        ).limit(5).to_list(5)

    return {
        "leads": leads,
        "customers": customers,
        "properties": properties,
        "employees": employees,
        "total": len(leads) + len(customers) + len(properties) + len(employees),
    }
