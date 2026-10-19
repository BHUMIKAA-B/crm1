"""CRM Site Visits router — manual entry supported for all authenticated employees.

Permission model:
  - executive / trainee / dpo → can create and see own site visits
  - team_lead → can create and see all site visits for their team
  - bdo / founder / admin → can see all site visits

The user-facing label is "Site Visit". Internal DB identifier is site_visits (unchanged).
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import db
from crm_models import SiteVisit, SiteVisitFeedback, now_iso, new_id, AuditLog, Customer, CustomerCreate
from services.rbac_service import get_current_employee, get_team_member_ids

router = APIRouter(prefix="/api/crm/site-visits", tags=["crm_site_visits"])


async def _resolve_team_id(emp: dict) -> Optional[str]:
    """Return team UUID for this employee."""
    emp_id = emp["id"]
    if emp.get("role") == "team_lead":
        team = await db.teams().find_one({"team_leader_id": emp_id})
        if team:
            return team.get("id")
    team_id_val = emp.get("team_id")
    if team_id_val:
        team = await db.teams().find_one({"$or": [{"id": team_id_val}, {"team_id": team_id_val}]})
        if team:
            return team.get("id")
    return None


# ──────────────────────────────────────────────────────────
# POST / — Schedule / manually create a Site Visit
# ──────────────────────────────────────────────────────────
@router.post("")
async def schedule_site_visit(data: dict, emp: dict = Depends(get_current_employee)):
    """
    Manually create a Site Visit entry. All authenticated employees can create
    site visits for themselves. Team Leaders can create for their team members.
    """
    # Handle inline customer creation if no customer_id provided
    customer_id = data.get("customer_id")
    if not customer_id:
        # Create a customer record from the provided customer details
        cust_name = data.get("customer_name", "").strip()
        cust_phone = data.get("customer_phone", "").strip()
        if not cust_name or not cust_phone:
            raise HTTPException(
                status_code=400,
                detail="Either customer_id or both customer_name and customer_phone are required."
            )
        # Check if a customer with this phone already exists
        existing_cust = await db.customers().find_one({"phone": cust_phone}, {"_id": 0, "id": 1})
        if existing_cust:
            customer_id = existing_cust["id"]
        else:
            new_cust = Customer(
                name=cust_name,
                phone=cust_phone,
                email=data.get("customer_email"),
                notes=data.get("customer_notes", ""),
                created_by=emp["id"],
            )
            cust_dict = new_cust.model_dump()
            await db.customers().insert_one(cust_dict)
            customer_id = new_cust.id

    # Determine the employee assigned to this visit
    raw_emp_id = data.get("employee_id") or data.get("assigned_to") or data.get("assigned_employee")
    if not raw_emp_id or not str(raw_emp_id).strip():
        assigned_emp_id = emp["id"]
    else:
        assigned_emp_id = str(raw_emp_id).strip()

    # Role/Team aware authorization logic
    role = emp.get("role", "")
    if assigned_emp_id != emp["id"]:
        if role in ["founder", "admin"]:
            # Founder / Admin can assign site visit to any employee
            target_emp = await db.employees().find_one({"id": assigned_emp_id})
            if not target_emp:
                raise HTTPException(status_code=404, detail="Assigned employee not found.")
        elif role == "bdo":
            # BDO can assign site visits to employees under their scope
            from routers.crm_reports_router import _get_scoped_emp_ids
            scoped_emp_ids = await _get_scoped_emp_ids(emp)
            if assigned_emp_id not in scoped_emp_ids:
                raise HTTPException(
                    status_code=403,
                    detail="You can only schedule site visits for employees under your scope."
                )
        elif role == "team_lead":
            # Team Leader can assign site visits to active Executive/Trainee members of their team
            member_ids = await get_team_member_ids(emp)
            if assigned_emp_id not in member_ids:
                raise HTTPException(
                    status_code=403,
                    detail="You can only schedule site visits for members of your own team."
                )
            target_emp = await db.employees().find_one({"id": assigned_emp_id})
            if not target_emp or target_emp.get("role") not in ["executive", "trainee"]:
                raise HTTPException(
                    status_code=403,
                    detail="Team Leaders can only assign site visits to Executive or Trainee team members of their team."
                )
        else:  # executive, trainee, dpo
            raise HTTPException(
                status_code=403,
                detail="You can only create site visits for yourself."
            )

    count = await db.site_visits().count_documents({})
    display_id = f"VS-SV-{(count + 1):06d}"

    # Resolve team ID from logged-in user or assigned employee
    assigned_emp_doc = await db.employees().find_one({"id": assigned_emp_id}, {"_id": 0, "team_id": 1, "name": 1})
    team_id = await _resolve_team_id(emp)
    if not team_id and assigned_emp_doc and assigned_emp_doc.get("team_id"):
        team_id = assigned_emp_doc.get("team_id")

    visit = SiteVisit(
        customer_id=customer_id,
        employee_id=assigned_emp_id,
        date=data["date"],
        time=data["time"],
        properties=data.get("properties", []),
        notes=data.get("notes", ""),
        status=data.get("status", "scheduled"),
    )
    doc = visit.model_dump()
    doc["visit_id"] = display_id
    doc["created_by"] = emp["id"]
    doc["assigned_to"] = assigned_emp_id
    doc["assigned_employee"] = assigned_emp_id
    doc["team_id"] = team_id
    doc["visit_purpose"] = data.get("visit_purpose", "")
    doc["follow_up_date"] = data.get("follow_up_date", "")
    doc["next_action"] = data.get("next_action", "")

    await db.site_visits().insert_one(doc)

    await db.audit_logs().insert_one(
        AuditLog(who=emp["id"], action="create_site_visit", entity="site_visit", entity_id=visit.id).model_dump()
    )
    return {"message": "Site visit created successfully", "id": visit.id, "visit_id": display_id}


# ──────────────────────────────────────────────────────────
# GET / — List Site Visits (scoped by role)
# ──────────────────────────────────────────────────────────
@router.get("")
async def list_site_visits(status: Optional[str] = None, emp: dict = Depends(get_current_employee)):
    query = {}
    role = emp["role"]
    if role in ["executive", "trainee", "dpo"]:
        query["$or"] = [{"employee_id": emp["id"]}, {"created_by": emp["id"]}]
    elif role == "team_lead":
        member_ids = await get_team_member_ids(emp)
        query["$or"] = [{"employee_id": {"$in": member_ids}}, {"created_by": {"$in": member_ids}}]
    # Founder, Admin, and BDO see all site visits

    if status:
        query["status"] = status

    cursor = db.site_visits().find(query).sort("date", -1).limit(200)
    visits = await cursor.to_list(length=200)
    for v in visits:
        v.pop("_id", None)
        cust = await db.customers().find_one({"id": v["customer_id"]}, {"_id": 0})
        v["customer"] = cust
        # Resolve property IDs to titles
        prop_titles = []
        for pid in v.get("properties", []):
            prop = await db.properties().find_one({"id": pid}, {"_id": 0, "title": 1})
            prop_titles.append(prop["title"] if prop and prop.get("title") else pid)
        v["property_titles"] = prop_titles
        # Enrich with employee name
        emp_doc = await db.employees().find_one({"id": v.get("employee_id")}, {"_id": 0, "name": 1, "role": 1})
        v["employee_name"] = emp_doc.get("name", "") if emp_doc else ""
    return visits


# ──────────────────────────────────────────────────────────
# GET /{visit_id} — Get single Site Visit
# ──────────────────────────────────────────────────────────
@router.get("/{visit_id}")
async def get_site_visit(visit_id: str, emp: dict = Depends(get_current_employee)):
    visit = await db.site_visits().find_one({"$or": [{"id": visit_id}, {"visit_id": visit_id}]}, {"_id": 0})
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found")

    role = emp["role"]
    if role in ["executive", "trainee", "dpo"]:
        if visit.get("employee_id") != emp["id"] and visit.get("created_by") != emp["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to view this site visit")
    elif role == "team_lead":
        member_ids = await get_team_member_ids(emp)
        if visit.get("employee_id") not in member_ids and visit.get("created_by") not in member_ids:
            raise HTTPException(status_code=403, detail="Not authorized to view this site visit")

    cust = await db.customers().find_one({"id": visit["customer_id"]}, {"_id": 0})
    visit["customer"] = cust
    return visit


# ──────────────────────────────────────────────────────────
# PUT /{visit_id} — Update a Site Visit (team_lead+ or owner)
# ──────────────────────────────────────────────────────────
@router.put("/{visit_id}")
async def update_site_visit(visit_id: str, data: dict, emp: dict = Depends(get_current_employee)):
    visit = await db.site_visits().find_one({"$or": [{"id": visit_id}, {"visit_id": visit_id}]})
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found")

    role = emp["role"]
    # Only the creator, the assigned employee, or a higher role can edit
    if role in ["executive", "trainee"]:
        if visit.get("employee_id") != emp["id"] and visit.get("created_by") != emp["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to edit this site visit")
    elif role == "team_lead":
        member_ids = await get_team_member_ids(emp)
        if visit.get("employee_id") not in member_ids and visit.get("created_by") not in member_ids:
            raise HTTPException(status_code=403, detail="Not authorized to edit this site visit")

    # Don't allow changing employee_id or customer_id to something outside scope
    allowed_updates = {
        "date", "time", "properties", "notes", "status",
        "visit_purpose", "follow_up_date", "next_action"
    }
    updates = {k: v for k, v in data.items() if k in allowed_updates}
    updates["updated_at"] = now_iso()

    await db.site_visits().update_one({"id": visit["id"]}, {"$set": updates})
    await db.audit_logs().insert_one(
        AuditLog(who=emp["id"], action="update_site_visit", entity="site_visit", entity_id=visit["id"]).model_dump()
    )
    return {"message": "Site visit updated successfully"}


# ──────────────────────────────────────────────────────────
# POST /{visit_id}/feedback — Submit feedback for a Site Visit
# ──────────────────────────────────────────────────────────
@router.post("/{visit_id}/feedback")
async def submit_site_visit_feedback(visit_id: str, feedback: SiteVisitFeedback, emp: dict = Depends(get_current_employee)):
    visit = await db.site_visits().find_one({"$or": [{"id": visit_id}, {"visit_id": visit_id}]})
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found")

    role = emp["role"]
    if role in ["executive", "trainee"]:
        if visit.get("employee_id") != emp["id"] and visit.get("created_by") != emp["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to submit feedback for this site visit")

    fb_doc = feedback.model_dump()
    await db.site_visits().update_one(
        {"id": visit["id"]},
        {"$set": {
            "status": "completed",
            "feedback": fb_doc,
            "updated_at": now_iso()
        }}
    )

    await db.audit_logs().insert_one(
        AuditLog(who=emp["id"], action="site_visit_feedback", entity="site_visit", entity_id=visit["id"]).model_dump()
    )
    return {"message": "Site visit feedback submitted"}
