from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import db
from crm_models import now_iso, new_id
from services.rbac_service import get_current_employee, require_employee_roles

router = APIRouter(prefix="/api/crm/properties", tags=["crm_properties"])

@router.get("")
async def list_internal_properties(
    status: Optional[str] = None,
    emp: dict = Depends(get_current_employee)
):
    query = {}
    if status:
        query["status"] = status
        
    properties_cursor = db.properties().find(query).sort("created_at", -1).limit(100)
    properties_list = await properties_cursor.to_list(length=100)
    
    for p in properties_list:
        p.pop("_id", None)

    return properties_list

@router.post("")
async def create_internal_property(
    prop_data: dict,
    emp: dict = Depends(get_current_employee)
):
    count = await db.properties().count_documents({})
    display_id = f"VS-PROP-{(count + 1):06d}"
    
    doc = {
        **prop_data,
        "id": new_id(),
        "property_id": display_id,
        "status": prop_data.get("status", "UNDER_VERIFICATION"),
        "verification_status": prop_data.get("verification_status", "pending"),
        "created_by": emp["id"],
        "assigned_employee": emp["id"],
        "created_at": now_iso(),
        "updated_at": now_iso()
    }
    await db.properties().insert_one(doc)
    
    from crm_models import AuditLog
    await db.audit_logs().insert_one(AuditLog(who=emp["id"], action="create_property", entity="property", entity_id=doc["id"]).model_dump())
    
    return {"message": "Property created successfully", "id": doc["id"], "property_id": display_id}


@router.patch("/{property_id}/verify")
async def verify_property(
    property_id: str,
    verification_status: str,
    notes: str = "",
    emp: dict = Depends(get_current_employee)
):
    if emp["role"] not in ["founder", "admin", "bdo", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized to verify properties")
        
    status_map = {
        "verified": "LIVE",
        "rejected": "REJECTED",
        "pending": "UNDER_VERIFICATION"
    }
    new_status = status_map.get(verification_status, "UNDER_VERIFICATION")
    
    await db.properties().update_one(
        {"$or": [{"id": property_id}, {"property_id": property_id}]},
        {"$set": {
            "verification_status": verification_status,
            "status": new_status,
            "verified_by": emp["id"],
            "verification_notes": notes,
            "updated_at": now_iso()
        }}
    )
    return {"message": f"Property verification status updated to {verification_status}"}


@router.get("/match/{requirement_id}")
async def match_properties_to_requirement(
    requirement_id: str,
    emp: dict = Depends(get_current_employee)
):
    req = await db.requirements().find_one({"id": requirement_id})
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
        
    all_props = await db.properties().find({}).to_list(length=200)
    matched = []
    
    req_type = req.get("property_type", "").lower()
    b_min = float(req.get("budget_min") or 0)
    b_max = float(req.get("budget_max") or 9999999999)
    locs = [l.lower() for l in req.get("preferred_location", [])]
    facings = [f.lower() for f in req.get("preferred_facing", [])]
    
    for p in all_props:
        p.pop("_id", None)
        score = 50 # base score for active property
        
        cat = (p.get("category") or p.get("sub_category") or "").lower()
        if req_type and (req_type in cat or cat in req_type):
            score += 25
            
        price = float(p.get("price") or 0)
        if price > 0 and b_min <= price <= b_max:
            score += 15
        elif price > 0 and b_max * 0.8 <= price <= b_max * 1.2:
            score += 8
            
        loc_str = str(p.get("location") or "").lower()
        if any(l in loc_str for l in locs if l):
            score += 10
            
        p_facing = (p.get("facing") or "").lower()
        if p_facing and facings and p_facing in facings:
            score += 5
            
        p["match_percentage"] = min(score, 98)
        matched.append(p)
        
    matched.sort(key=lambda x: x["match_percentage"], reverse=True)
    return matched[:15]


@router.post("/share")
async def share_properties(
    customer_id: str,
    property_ids: List[str],
    emp: dict = Depends(get_current_employee)
):
    # Log the sharing event
    from crm_models import TimelineEvent
    event = TimelineEvent(
        entity_type="customer",
        entity_id=customer_id,
        action="property_shared",
        description=f"Shared {len(property_ids)} properties with customer",
        new_value=property_ids,
        performed_by=emp["id"]
    )
    await db.timeline_events().insert_one(event.model_dump())
    
    return {"message": "Properties shared successfully"}

@router.post("/site-visits")
async def create_site_visit(
    customer_id: str,
    properties: List[str],
    date: str,
    time: str,
    notes: str = "",
    emp: dict = Depends(get_current_employee)
):
    from crm_models import SiteVisit
    visit = SiteVisit(
        customer_id=customer_id,
        employee_id=emp["id"],
        date=date,
        time=time,
        properties=properties,
        notes=notes
    )
    await db.site_visits().insert_one(visit.model_dump())
    return {"message": "Site visit scheduled", "id": visit.id}
