"""CRM Employee management router — Founder/Admin only for write operations."""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import db
from crm_models import EmployeeCreate, Employee, now_iso
from auth import hash_password
from services.rbac_service import get_current_employee

router = APIRouter(prefix="/api/crm/employees", tags=["crm_employees"])

WRITE_ROLES = ["founder", "admin"]


@router.post("")
async def create_employee(body: EmployeeCreate, emp: dict = Depends(get_current_employee)):
    creator_role = emp["role"]

    # Role hierarchy enforcement
    allowed_target_roles = []
    if creator_role in ["founder", "admin"]:
        allowed_target_roles = ["dpo", "bdo", "team_lead", "executive", "trainee"]
    elif creator_role == "team_lead":
        allowed_target_roles = ["executive", "trainee"]
    else:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{creator_role}' is not authorized to create employee accounts."
        )

    if body.role not in allowed_target_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{creator_role}' cannot create employees with role '{body.role}'. Permitted roles: {allowed_target_roles}."
        )

    # Team Lead scoping enforcement: Team Lead can ONLY create members for their own team
    team_lead_team_id = emp.get("team_id") or emp["id"]
    if creator_role == "team_lead":
        if body.team_id and body.team_id != team_lead_team_id:
            raise HTTPException(
                status_code=403,
                detail="Team Lead cannot assign employees to a different team."
            )
        team_id = team_lead_team_id
        reporting_mgr = emp["id"]
    else:
        team_id = body.team_id or (emp["id"] if body.role in ["executive", "trainee"] else None)
        reporting_mgr = body.reporting_manager or (emp["id"] if creator_role in ["founder", "admin"] else None)

    existing = await db.employees().find_one({"email": body.email.strip().lower()})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    count = await db.employees().count_documents({})
    emp_id = f"VS-EMP-{(count + 1):06d}"

    new_emp = Employee(
        employee_id=emp_id,
        name=body.name.strip(),
        email=body.email.strip().lower(),
        phone=body.phone.strip(),
        role=body.role,
        department=body.department or ("Sales Team" if creator_role == "team_lead" else "Operations"),
        team_id=team_id,
        reporting_manager=reporting_mgr,
        created_by=emp["id"],
        created_at=now_iso(),
        updated_at=now_iso(),
    )
    doc = new_emp.model_dump()
    doc["password_hash"] = hash_password(body.password)
    await db.employees().insert_one(doc)

    # Audit
    from crm_models import AuditLog
    log = AuditLog(who=emp["id"], action="create_employee", entity="employee", entity_id=new_emp.id)
    await db.audit_logs().insert_one(log.model_dump())

    return {"message": "Employee created", "id": new_emp.id, "employee_id": emp_id}


@router.get("")
async def list_employees(emp: dict = Depends(get_current_employee)):
    role = emp["role"]
    projection = {"_id": 0, "password_hash": 0}
    
    query = {}
    if role == "team_lead":
        # Team lead sees team members (reporting_manager == emp.id or team_id == emp.team_id or self)
        team_id = emp.get("team_id") or emp["id"]
        query = {"$or": [{"reporting_manager": emp["id"]}, {"team_id": team_id}, {"id": emp["id"]}]}

    cursor = db.employees().find(query, projection).sort("name", 1)
    employees = await cursor.to_list(length=500)

    # Populate creator name and reporting manager name if available
    for e in employees:
        if e.get("created_by"):
            creator = await db.employees().find_one({"id": e["created_by"]}, {"_id": 0, "name": 1})
            e["created_by_name"] = creator.get("name") if creator else e["created_by"]
        if e.get("reporting_manager"):
            mgr = await db.employees().find_one({"id": e["reporting_manager"]}, {"_id": 0, "name": 1})
            e["reporting_manager_name"] = mgr.get("name") if mgr else e["reporting_manager"]

    if role not in ["founder", "admin", "team_lead", "dpo"]:
        # Strip sensitive fields for basic view
        employees = [
            {"id": e["id"], "name": e["name"], "role": e["role"], "employee_id": e.get("employee_id"), "department": e.get("department")}
            for e in employees
        ]
    return employees


@router.get("/{employee_id}")
async def get_employee(employee_id: str, emp: dict = Depends(get_current_employee)):
    target = await db.employees().find_one({"id": employee_id}, {"_id": 0, "password_hash": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Only Founder/Admin or the employee themselves can view full details
    if emp["role"] not in WRITE_ROLES and emp["id"] != employee_id:
        raise HTTPException(status_code=403, detail="Not authorised")

    return target


@router.patch("/{employee_id}/status")
async def update_employee_status(
    employee_id: str,
    status: str,
    emp: dict = Depends(get_current_employee),
):
    if emp["role"] not in WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Only Founder/Admin can change employee status")

    allowed = {"active", "suspended", "exited"}
    if status not in allowed:
        raise HTTPException(status_code=422, detail=f"Status must be one of {allowed}")

    await db.employees().update_one(
        {"id": employee_id},
        {"$set": {"status": status, "updated_at": now_iso()}},
    )

    from crm_models import AuditLog
    log = AuditLog(who=emp["id"], action="update_employee_status", entity="employee",
                   entity_id=employee_id, field="status", new_value=status)
    await db.audit_logs().insert_one(log.model_dump())

    return {"message": f"Employee status updated to {status}"}


@router.get("/{employee_id}/performance")
async def get_employee_performance(employee_id: str, emp: dict = Depends(get_current_employee)):
    # Only founder/teamlead/themselves can see performance
    role = emp["role"]
    if role not in ["founder", "admin", "team_lead"] and emp["id"] != employee_id:
        raise HTTPException(status_code=403, detail="Not authorised")

    lead_count = await db.leads().count_documents({"assigned_to": employee_id})
    closed_won = await db.leads().count_documents(
        {"assigned_to": employee_id, "status": "closed_won"}
    )
    task_count = await db.tasks().count_documents({"assigned_to": employee_id})
    completed_tasks = await db.tasks().count_documents(
        {"assigned_to": employee_id, "status": "completed"}
    )
    visit_count = await db.site_visits().count_documents({"employee_id": employee_id})
    deal_count = await db.deals().count_documents({"assigned_employee": employee_id})

    conversion_rate = round((closed_won / lead_count * 100), 1) if lead_count > 0 else 0

    return {
        "employee_id": employee_id,
        "total_leads": lead_count,
        "closed_won": closed_won,
        "conversion_rate": conversion_rate,
        "total_tasks": task_count,
        "completed_tasks": completed_tasks,
        "site_visits": visit_count,
        "deals": deal_count,
    }
