"""CRM Reports & Analytics router — Founder/BDO access for financial, all roles for own data."""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta, timezone
import db
from services.rbac_service import get_current_employee

router = APIRouter(prefix="/api/crm/reports", tags=["crm_reports"])

FINANCIAL_ROLES = ["founder", "admin", "bdo"]


@router.get("/dashboard-summary")
async def dashboard_summary(emp: dict = Depends(get_current_employee)):
    """Real-time Founder CEO summary from actual DB."""
    role = emp["role"]

    # Scoped queries
    lead_filter: dict = {}
    if role in ["executive", "trainee"]:
        lead_filter["assigned_to"] = emp["id"]
    elif role == "team_lead":
        team = await db.employees().find(
            {"reporting_manager": emp["id"]}, {"id": 1}
        ).to_list(length=None)
        ids = [t["id"] for t in team] + [emp["id"]]
        lead_filter["assigned_to"] = {"$in": ids}

    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()

    total_leads = await db.leads().count_documents(lead_filter)
    new_today = await db.leads().count_documents(
        {**lead_filter, "created_at": {"$gte": today_start}}
    )
    active_leads = await db.leads().count_documents(
        {**lead_filter, "status": {"$nin": ["closed_won", "closed_lost"]}}
    )

    today_str = datetime.now(timezone.utc).date().isoformat()
    overdue_tasks = await db.tasks().count_documents(
        {"assigned_to": emp["id"] if role in ["executive", "trainee"] else {"$exists": True},
         "due_date": {"$lt": today_str}, "status": {"$in": ["pending", "in_progress"]}}
    )
    due_today = await db.tasks().count_documents(
        {"assigned_to": emp["id"] if role in ["executive", "trainee"] else {"$exists": True},
         "due_date": today_str, "status": {"$in": ["pending", "in_progress"]}}
    )

    site_visits = await db.site_visits().count_documents(
        {"date": today_str}
    )

    summary = {
        "total_leads": total_leads,
        "new_leads_today": new_today,
        "active_leads": active_leads,
        "overdue_tasks": overdue_tasks,
        "due_today": due_today,
        "site_visits_today": site_visits,
    }

    # Founder-only extras
    if role in FINANCIAL_ROLES:
        total_properties = await db.properties().count_documents({})
        total_employees = await db.employees().count_documents({"status": "active"})
        total_deals = await db.deals().count_documents({})

        # Revenue — aggregate final_deal_value where status closed
        pipeline = [
            {"$match": {"status": "closed"}},
            {"$group": {"_id": None, "total": {"$sum": "$final_deal_value"}}},
        ]
        rev_result = await db.deals().aggregate(pipeline).to_list(length=1)
        revenue = rev_result[0]["total"] if rev_result else 0

        pending_comm_pipeline = [
            {"$match": {"status": {"$ne": "closed"}}},
            {"$group": {"_id": None, "total": {"$sum": "$expected_commission"}}},
        ]
        comm_result = await db.deals().aggregate(pending_comm_pipeline).to_list(length=1)
        pending_commission = comm_result[0]["total"] if comm_result else 0

        summary.update({
            "total_properties": total_properties,
            "total_employees": total_employees,
            "total_deals": total_deals,
            "total_revenue": revenue,
            "pending_commission": pending_commission,
        })

    return summary


@router.get("/lead-sources")
async def lead_source_breakdown(emp: dict = Depends(get_current_employee)):
    """Leads grouped by source."""
    pipeline = [
        {"$group": {"_id": "$source", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    results = await db.leads().aggregate(pipeline).to_list(length=50)
    return [{"source": r["_id"], "count": r["count"]} for r in results]


@router.get("/lead-statuses")
async def lead_status_breakdown(emp: dict = Depends(get_current_employee)):
    """Leads grouped by status for funnel view."""
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    results = await db.leads().aggregate(pipeline).to_list(length=30)
    return [{"status": r["_id"], "count": r["count"]} for r in results]


@router.get("/employee-performance")
async def all_employee_performance(emp: dict = Depends(get_current_employee)):
    """Team performance overview — Founder & Team Lead only."""
    if emp["role"] not in ["founder", "admin", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorised")

    employees = await db.employees().find(
        {"status": "active"}, {"_id": 0, "id": 1, "name": 1, "role": 1, "employee_id": 1}
    ).to_list(length=100)

    results = []
    for e in employees:
        eid = e["id"]
        leads = await db.leads().count_documents({"assigned_to": eid})
        won = await db.leads().count_documents({"assigned_to": eid, "status": "closed_won"})
        tasks = await db.tasks().count_documents({"assigned_to": eid, "status": "completed"})
        visits = await db.site_visits().count_documents({"employee_id": eid})
        results.append({
            **e,
            "leads": leads,
            "closed_won": won,
            "conversion_rate": round(won / leads * 100, 1) if leads > 0 else 0,
            "completed_tasks": tasks,
            "site_visits": visits,
        })

    results.sort(key=lambda x: x["closed_won"], reverse=True)
    return results


@router.get("/audit-logs")
async def get_audit_logs(
    entity: Optional[str] = None,
    emp: dict = Depends(get_current_employee),
):
    """Audit log viewer — Founder/Admin only."""
    if emp["role"] not in ["founder", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorised")

    query: dict = {}
    if entity:
        query["entity"] = entity

    cursor = db.audit_logs().find(query, {"_id": 0}).sort("timestamp", -1).limit(500)
    logs = await cursor.to_list(length=500)
    return logs
