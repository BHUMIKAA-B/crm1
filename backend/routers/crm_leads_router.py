from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import db
from crm_models import LeadCreate, LeadUpdate, Lead, now_iso, new_id, AuditLog
from services.rbac_service import get_current_employee, require_employee_roles

router = APIRouter(prefix="/api/crm/leads", tags=["crm_leads"])

async def _log_audit(who: str, action: str, entity: str, entity_id: str, field: str = None, old_value=None, new_value=None):
    log_doc = AuditLog(
        who=who,
        action=action,
        entity=entity,
        entity_id=entity_id,
        field=field,
        old_value=old_value,
        new_value=new_value
    ).model_dump()
    await db.audit_logs().insert_one(log_doc)

@router.get("/check-duplicate")
async def check_duplicate_lead(phone: Optional[str] = None, email: Optional[str] = None, emp: dict = Depends(get_current_employee)):
    query = {}
    if phone:
        query["phone"] = phone
    elif email:
        query["email"] = email
    else:
        return {"duplicate_found": False}
        
    cust = await db.customers().find_one(query, {"_id": 0})
    if not cust:
        return {"duplicate_found": False}
        
    active_lead = await db.leads().find_one({
        "customer_id": cust["id"],
        "status": {"$nin": ["closed_won", "closed_lost", "follow_up_later"]}
    }, {"_id": 0})
    
    return {
        "duplicate_found": True,
        "customer": {"name": cust["name"], "phone": cust["phone"], "id": cust["id"]},
        "existing_lead": active_lead
    }


@router.post("")
async def create_lead(lead_in: LeadCreate, emp: dict = Depends(get_current_employee)):

    # 1. Check for duplicates using phone number if customer info is provided
    cust_id = lead_in.customer_id
    if not cust_id and lead_in.customer:
        # Check if customer exists by phone
        existing_cust = await db.customers().find_one({"phone": lead_in.customer.phone})
        if existing_cust:
            cust_id = existing_cust["id"]
        else:
            # Create new customer
            from crm_models import Customer
            new_cust = Customer(
                name=lead_in.customer.name,
                phone=lead_in.customer.phone,
                alternate_phone=lead_in.customer.alternate_phone,
                email=lead_in.customer.email,
                address=lead_in.customer.address,
                created_by=emp["id"],
                notes=lead_in.customer.notes
            )
            cust_doc = new_cust.model_dump()
            await db.customers().insert_one(cust_doc)
            cust_id = new_cust.id

    if not cust_id:
        raise HTTPException(status_code=400, detail="Customer ID or Customer details required")

    # Check for recent active leads for this customer to prevent duplicate leads
    existing_active_lead = await db.leads().find_one({
        "customer_id": cust_id, 
        "status": {"$nin": ["closed_won", "closed_lost", "follow_up_later"]}
    })
    if existing_active_lead:
        # Instead of failing, we could warn, but for now we'll just allow it or raise 409
        # Let's just create it but flag it if necessary. Actually, the requirements say "Display possible duplicate" 
        # on frontend before creating. So backend allows it or we can add a force flag. 
        pass

    # Generate a unique VS-LEAD ID
    # In a real app we'd use a sequence generator, here we'll do a simple count + 1
    count = await db.leads().count_documents({})
    lead_id_str = f"VS-LEAD-{(count + 1):06d}"

    assigned_to = lead_in.assigned_to or emp["id"]

    new_lead = Lead(
        lead_id=lead_id_str,
        customer_id=cust_id,
        source=lead_in.source,
        assigned_to=assigned_to,
        created_by=emp["id"],
        registered_date=lead_in.registered_date or now_iso(),
        notes=lead_in.notes
    )
    
    lead_doc = new_lead.model_dump()
    await db.leads().insert_one(lead_doc)
    
    await _log_audit(emp["id"], "create", "lead", new_lead.id)

    return {"message": "Lead created successfully", "lead_id": new_lead.id, "display_id": lead_id_str}

@router.get("")
async def list_leads(
    status: Optional[str] = None,
    emp: dict = Depends(get_current_employee)
):
    query = {}
    if status:
        query["status"] = status
        
    # RBAC logic
    role = emp["role"]
    if role == "executive" or role == "trainee":
        # Can only see their own leads
        query["assigned_to"] = emp["id"]
    elif role == "team_lead":
        # Can see their leads and their team's leads
        team = await db.employees().find({"reporting_manager": emp["id"]}).to_list(length=None)
        team_ids = [t["id"] for t in team]
        team_ids.append(emp["id"])
        query["assigned_to"] = {"$in": team_ids}
    # founder, dpo, and bdo can see all leads

    leads_cursor = db.leads().find(query).sort("created_at", -1).limit(100)
    leads_list = await leads_cursor.to_list(length=100)
    
    # Optionally populate customer data & fallback registered_date
    for l in leads_list:
        l.pop("_id", None)
        if not l.get("registered_date"):
            l["registered_date"] = l.get("created_at")
        cust = await db.customers().find_one({"id": l["customer_id"]}, {"_id": 0})
        l["customer"] = cust

    return leads_list

@router.get("/{lead_id}")
async def get_lead(lead_id: str, emp: dict = Depends(get_current_employee)):
    lead = await db.leads().find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    # RBAC check
    role = emp["role"]
    if role in ["executive", "trainee"]:
        if lead["assigned_to"] != emp["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to view this lead")
    elif role == "team_lead":
        team = await db.employees().find({"reporting_manager": emp["id"]}).to_list(length=None)
        team_ids = [t["id"] for t in team]
        team_ids.append(emp["id"])
        if lead["assigned_to"] not in team_ids:
            raise HTTPException(status_code=403, detail="Not authorized to view this lead")
            
    cust = await db.customers().find_one({"id": lead["customer_id"]}, {"_id": 0})
    lead["customer"] = cust
    
    # fetch timeline/audit events
    events = await db.audit_logs().find({"entity": "lead", "entity_id": lead_id}, {"_id": 0}).sort("timestamp", -1).to_list(length=50)
    lead["timeline"] = events
    
    return lead

@router.patch("/{lead_id}/assign")
async def assign_lead(lead_id: str, assigned_to: str, emp: dict = Depends(get_current_employee)):
    # Only Founder or Team Lead can re-assign leads they manage
    role = emp["role"]
    if role not in ["founder", "team_lead", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to assign leads")
        
    lead = await db.leads().find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    old_assigned = lead.get("assigned_to")
    
    await db.leads().update_one({"id": lead_id}, {"$set": {"assigned_to": assigned_to, "updated_at": now_iso()}})
    
    await _log_audit(emp["id"], "reassign", "lead", lead_id, "assigned_to", old_assigned, assigned_to)
    
    return {"message": "Lead reassigned"}

@router.patch("/{lead_id}/status")
async def update_lead_status(lead_id: str, status: str, emp: dict = Depends(get_current_employee)):
    lead = await db.leads().find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    role = emp["role"]
    if role in ["executive", "trainee"] and lead["assigned_to"] != emp["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this lead")
        
    old_status = lead.get("status")
    await db.leads().update_one({"id": lead_id}, {"$set": {"status": status, "updated_at": now_iso()}})
    
    await _log_audit(emp["id"], "update_status", "lead", lead_id, "status", old_status, status)
    
    return {"message": "Lead status updated"}
