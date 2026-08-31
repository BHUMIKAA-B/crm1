from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import db
from crm_models import SiteVisit, SiteVisitFeedback, now_iso, new_id, AuditLog
from services.rbac_service import get_current_employee, get_team_member_ids

router = APIRouter(prefix="/api/crm/site-visits", tags=["crm_site_visits"])

@router.post("")
async def schedule_site_visit(data: dict, emp: dict = Depends(get_current_employee)):
    count = await db.site_visits().count_documents({})
    display_id = f"VS-OV-{(count + 1):06d}"
    
    visit = SiteVisit(
        customer_id=data["customer_id"],
        employee_id=data.get("employee_id", emp["id"]),
        date=data["date"],
        time=data["time"],
        properties=data.get("properties", []),
        notes=data.get("notes", "")
    )
    doc = visit.model_dump()
    doc["visit_id"] = display_id
    doc["created_by"] = emp["id"]
    await db.site_visits().insert_one(doc)
    
    await db.audit_logs().insert_one(AuditLog(who=emp["id"], action="schedule_office_visit", entity="office_visit", entity_id=visit.id).model_dump())
    return {"message": "Office visit scheduled", "id": visit.id, "visit_id": display_id}

@router.get("")
async def list_site_visits(status: Optional[str] = None, emp: dict = Depends(get_current_employee)):
    query = {}
    role = emp["role"]
    if role in ["executive", "trainee", "dpo"]:
        query["$or"] = [{"employee_id": emp["id"]}, {"created_by": emp["id"]}]
    elif role == "team_lead":
        member_ids = await get_team_member_ids(emp)
        query["$or"] = [{"employee_id": {"$in": member_ids}}, {"created_by": {"$in": member_ids}}]
    # Founder, Admin, and BDO see all site/office visits

    if status:
        query["status"] = status
        
    cursor = db.site_visits().find(query).sort("date", -1).limit(100)
    visits = await cursor.to_list(length=100)
    for v in visits:
        v.pop("_id", None)
        cust = await db.customers().find_one({"id": v["customer_id"]}, {"_id": 0})
        v["customer"] = cust
        # Resolve property IDs to titles so frontend never shows raw UUIDs
        prop_titles = []
        for pid in v.get("properties", []):
            prop = await db.properties().find_one({"id": pid}, {"_id": 0, "title": 1})
            prop_titles.append(prop["title"] if prop and prop.get("title") else pid)
        v["property_titles"] = prop_titles
    return visits

@router.get("/{visit_id}")
async def get_site_visit(visit_id: str, emp: dict = Depends(get_current_employee)):
    visit = await db.site_visits().find_one({"$or": [{"id": visit_id}, {"visit_id": visit_id}]}, {"_id": 0})
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found")
        
    role = emp["role"]
    if role in ["executive", "trainee", "dpo"]:
        if visit.get("employee_id") != emp["id"] and visit.get("created_by") != emp["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to view this office visit")
    elif role == "team_lead":
        member_ids = await get_team_member_ids(emp)
        if visit.get("employee_id") not in member_ids and visit.get("created_by") not in member_ids:
            raise HTTPException(status_code=403, detail="Not authorized to view this office visit")

    cust = await db.customers().find_one({"id": visit["customer_id"]}, {"_id": 0})
    visit["customer"] = cust
    return visit

@router.post("/{visit_id}/feedback")
async def submit_site_visit_feedback(visit_id: str, feedback: SiteVisitFeedback, emp: dict = Depends(get_current_employee)):
    visit = await db.site_visits().find_one({"$or": [{"id": visit_id}, {"visit_id": visit_id}]})
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found")
        
    role = emp["role"]
    if role in ["executive", "trainee"]:
        if visit.get("employee_id") != emp["id"] and visit.get("created_by") != emp["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to submit feedback for this office visit")

    fb_doc = feedback.model_dump()
    await db.site_visits().update_one(
        {"id": visit["id"]},
        {"$set": {
            "status": "completed",
            "feedback": fb_doc,
            "updated_at": now_iso()
        }}
    )
    
    await db.audit_logs().insert_one(AuditLog(who=emp["id"], action="site_visit_feedback", entity="site_visit", entity_id=visit["id"]).model_dump())
    return {"message": "Office visit feedback submitted"}

