import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import db
from crm_models import (
    Employee, Customer, Requirement, Lead, PropertyOwner, Broker,
    SiteVisit, SiteVisitFeedback, Deal, Negotiation, Task, Followup,
    CrmDocument, Payment, Notification, AuditLog, now_iso
)
from auth import hash_password

async def seed_crm():
    print("Seeding real CRM users & business entities...")
    
    # Remove legacy demo employee accounts if present
    legacy_demo_emails = [
        "founder@visitsarva.com",
        "bdo@visitsarva.com",
        "teamlead@visitsarva.com",
        "executive@visitsarva.com",
        "trainee@visitsarva.com"
    ]
    await db.employees().delete_many({"email": {"$in": legacy_demo_emails}})
    
    users = [
        {"email": "sanjayj@visitsarva.com", "role": "founder", "name": "Sanjay J", "dept": "Executive Board", "phone": "+919876540001"},
        {"email": "lakshmi@visitsarva.com", "role": "bdo", "name": "Lakshmi", "dept": "Business Development", "phone": "+919876540002"},
        {"email": "varun@visitsarva.com", "role": "team_lead", "name": "Varun", "dept": "Sales Management", "phone": "+919876540003"},
        {"email": "ramachari@visitsarva.com", "role": "executive", "name": "Ramachari", "dept": "Residential Sales", "phone": "+919876540004"},
        {"email": "rehan@visitsarva.com", "role": "trainee", "name": "Rehan", "dept": "Sales Trainee", "phone": "+919876540005"},
    ]
    
    password = hash_password(os.environ.get("CRM_DEFAULT_EMPLOYEE_PASSWORD", "Password123!"))
    emp_ids = {}
    
    for i, u in enumerate(users):
        existing = await db.employees().find_one({"email": u["email"]})
        if not existing:
            emp = Employee(
                employee_id=f"VS-EMP-{(i+1):06d}",
                name=u["name"],
                email=u["email"],
                phone=u["phone"],
                role=u["role"],
                department=u["dept"]
            )
            doc = emp.model_dump()
            doc["password_hash"] = password
            await db.employees().insert_one(doc)
            emp_ids[u["role"]] = emp.id
            print(f"Created real employee: {u['role']} - {u['email']}")
        else:
            # Always sync the password on startup so .env changes take effect immediately
            await db.employees().update_one(
                {"email": u["email"]},
                {"$set": {"password_hash": password, "role": u["role"], "name": u["name"]}}
            )
            emp_ids[u["role"]] = existing["id"]
            print(f"Updated password for: {u['role']} - {u['email']}")
            
    # Set reporting managers, team_id, created_by
    founder_id = emp_ids.get("founder")
    team_lead_id = emp_ids.get("team_lead")
    bdo_id = emp_ids.get("bdo")
    exec_id = emp_ids.get("executive")
    trainee_id = emp_ids.get("trainee")

    if founder_id:
        if team_lead_id:
            await db.employees().update_one({"id": team_lead_id}, {"$set": {"reporting_manager": founder_id, "created_by": founder_id}})
        if bdo_id:
            await db.employees().update_one({"id": bdo_id}, {"$set": {"reporting_manager": founder_id, "created_by": founder_id}})
    if team_lead_id:
        if exec_id:
            await db.employees().update_one({"id": exec_id}, {"$set": {"reporting_manager": team_lead_id, "team_id": team_lead_id, "created_by": team_lead_id}})
        if trainee_id:
            await db.employees().update_one({"id": trainee_id}, {"$set": {"reporting_manager": team_lead_id, "team_id": team_lead_id, "created_by": team_lead_id}})
            
    # ── Customers & Requirements ─────────────────────────────
    if await db.customers().count_documents({}) == 0:
        print("Seeding realistic customers, leads & deals...")
        cust_specs = [
            {"name": "Vikram Sethi", "phone": "+919876543210", "email": "vikram.sethi@gmail.com", "address": "Indiranagar, Bangalore", "type": "buyer"},
            {"name": "Meera Nair", "phone": "+919811223344", "email": "meera.nair@yahoo.com", "address": "Koramangala, Bangalore", "type": "lead"},
            {"name": "Suresh Patel", "phone": "+919700112233", "email": "suresh.patel@techcorp.com", "address": "Whitefield, Bangalore", "type": "investor"},
            {"name": "Kavita Reddy", "phone": "+919655443322", "email": "kavita.reddy@outlook.com", "address": "Jubilee Hills, Hyderabad", "type": "buyer"},
            {"name": "Rohan Gupta", "phone": "+919544332211", "email": "rohan.gupta@startup.in", "address": "HSR Layout, Bangalore", "type": "referral"}
        ]
        
        cust_ids = []
        for i, cs in enumerate(cust_specs):
            cust = Customer(
                name=cs["name"],
                phone=cs["phone"],
                email=cs["email"],
                address=cs["address"],
                created_by=emp_ids["executive"],
                type=cs["type"]
            )
            c_doc = cust.model_dump()
            await db.customers().insert_one(c_doc)
            cust_ids.append(cust.id)
            
            # Requirement
            req = Requirement(
                customer_id=cust.id,
                type="buy",
                property_type="apartment" if i % 2 == 0 else "villa",
                preferred_location=["Whitefield", "Sarjapur Road", "Indiranagar"],
                budget_min=8000000,
                budget_max=18000000,
                size_min=1400,
                size_max=2400,
                purpose="Self-use",
                timeline="Immediate"
            )
            await db.requirements().insert_one(req.model_dump())
            
            # Lead
            status_list = ["new", "contacted", "qualified", "site_visit_completed", "negotiation"]
            lead = Lead(
                lead_id=f"VS-LEAD-{(i+1):06d}",
                customer_id=cust.id,
                source="Website" if i % 2 == 0 else "Referral",
                assigned_to=emp_ids["executive"] if i < 3 else emp_ids["trainee"],
                created_by=emp_ids["executive"],
                status=status_list[i % len(status_list)],
                notes=f"Interested in 3 BHK in Bangalore. High intent."
            )
            await db.leads().insert_one(lead.model_dump())
            
            # Audit log
            await db.audit_logs().insert_one(AuditLog(who=emp_ids["executive"], action="create_lead", entity="lead", entity_id=lead.id).model_dump())

    # ── Property Owners & Brokers ─────────────────────────────
    if await db.owners().count_documents({}) == 0:
        print("Seeding owners & brokers...")
        owner = PropertyOwner(
            owner_id="VS-OWN-000001",
            name="Ramesh Chandra",
            mobile="+919443322110",
            email="ramesh.chandra@landlord.com",
            address="Devanahalli, Bangalore",
            assigned_employee=emp_ids["bdo"],
            notes="Owns 3 premium plots near Bangalore International Airport"
        )
        await db.owners().insert_one(owner.model_dump())
        
        broker = Broker(
            broker_id="VS-BROK-000001",
            name="Apex Realty Network",
            phone="+919332211009",
            area="North Bangalore",
            specialization="Plots & Commercial",
            reliability=5,
            assigned_employee=emp_ids["bdo"]
        )
        await db.brokers().insert_one(broker.model_dump())

    # ── Follow-ups & Tasks ─────────────────────────────────────
    if await db.tasks().count_documents({}) == 0:
        print("Seeding tasks & follow-ups...")
        today = datetime.now(timezone.utc)
        yesterday = (today - timedelta(days=2)).strftime("%Y-%m-%d")
        tomorrow = (today + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Overdue followup
        f1 = Followup(
            title="Follow-up with Vikram Sethi regarding budget verification",
            description="Confirm if home loan pre-approval is completed",
            due_date=yesterday,
            due_time="11:00 AM",
            priority="high",
            status="pending",
            assigned_to=emp_ids["executive"],
            created_by=emp_ids["team_lead"],
            followup_reason="Loan approval status update"
        )
        await db.tasks().insert_one(f1.model_dump())
        
        # Upcoming task
        t1 = Task(
            title="Prepare brochure deck for Sarjapur project",
            description="Send custom PDF to Meera Nair",
            due_date=tomorrow,
            due_time="03:00 PM",
            priority="medium",
            status="pending",
            assigned_to=emp_ids["trainee"],
            created_by=emp_ids["executive"]
        )
        await db.tasks().insert_one(t1.model_dump())

    # ── Deals & Site Visits ───────────────────────────────────
    if await db.deals().count_documents({}) == 0 and "executive" in emp_ids:
        print("Seeding demo deal & site visit...")
        cust = await db.customers().find_one({})
        prop = await db.properties().find_one({})
        if cust and prop:
            visit = SiteVisit(
                customer_id=cust["id"],
                employee_id=emp_ids["executive"],
                date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                time="04:00 PM",
                properties=[prop["id"]],
                status="completed",
                notes="Customer loved the layout and garden facing view.",
                feedback=SiteVisitFeedback(
                    interested=True,
                    rating=5,
                    price_feedback="Slightly negotiable",
                    location_feedback="Excellent connectivity",
                    next_action="Initiate token negotiation"
                )
            )
            await db.site_visits().insert_one(visit.model_dump())
            
            deal = Deal(
                deal_id="VS-DEAL-000001",
                customer_id=cust["id"],
                property_id=prop["id"],
                assigned_employee=emp_ids["executive"],
                status="token_received",
                final_deal_value=14500000,
                token_amount=500000,
                agreement_amount=2000000,
                expected_commission=290000,
                actual_commission=290000,
                employee_commission_share=58000,
                broker_commission_share=29000
            )
            await db.deals().insert_one(deal.model_dump())
            
            neg = Negotiation(
                deal_id=deal.id,
                seller_asking_price=15000000,
                buyer_offer=14200000,
                counter_offer=14500000,
                current_expected_price=14500000,
                notes="Agreed on 1.45 Cr with woodwork included",
                next_action="Draft agreement"
            )
            await db.negotiations().insert_one(neg.model_dump())
            
            pay = Payment(
                deal_id=deal.id,
                payment_type="token",
                amount=500000,
                due_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                received_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                status="paid",
                reference_no="UPI-REF-992019",
                notes="Token advance received"
            )
            await db.payments().insert_one(pay.model_dump())
            
            notif = Notification(
                recipient_id=emp_ids["executive"],
                title="New Token Received",
                message="Token payment of ₹5,00,000 received for Deal VS-DEAL-000001",
                type="deal",
                related_entity_type="deal",
                related_entity_id=deal.id
            )
            await db.crm_notifications().insert_one(notif.model_dump())

    print("CRM seed completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_crm())
