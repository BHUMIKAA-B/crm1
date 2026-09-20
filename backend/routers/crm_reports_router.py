"""CRM Reports & Analytics router — strict role-based authorization + team summary + download history.

Security:
  - Executive/Trainee/DPO → 403 on all download endpoints (enforced at backend)
  - Team Leader → can only download their own team's report
  - BDO → can download reports for teams within their authorized scope
  - Founder/Admin → can download all teams or individual team reports

Download history tracks baselines so reports can show "work since last report".
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta, timezone
import db
from services.rbac_service import get_current_employee
from crm_models import now_iso, new_id

router = APIRouter(prefix="/api/crm/reports", tags=["crm_reports"])

FINANCIAL_ROLES = ["founder", "admin", "bdo"]
DOWNLOAD_ALLOWED_ROLES = ["founder", "admin", "bdo", "team_lead"]
ADMIN_ROLES = ["founder", "admin", "bdo"]


# ──────────────────────────────────────────────────────────
# Helper — build scoped employee IDs list for a given employee
# ──────────────────────────────────────────────────────────
async def _get_scoped_emp_ids(emp: dict) -> list:
    """Return list of employee IDs that this employee is authorised to report on."""
    from services.rbac_service import get_team_member_ids
    role = emp["role"]
    if role in ["founder", "admin"]:
        all_emps = await db.employees().find({}, {"_id": 0, "id": 1}).to_list(length=2000)
        return [e["id"] for e in all_emps]
    elif role == "bdo":
        tls = await db.employees().find({"reporting_manager": emp["id"]}, {"_id": 0, "id": 1}).to_list(length=200)
        tl_ids = [t["id"] for t in tls] + [emp["id"]]
        team_members = await db.employees().find(
            {"$or": [{"reporting_manager": {"$in": tl_ids}}, {"id": {"$in": tl_ids}}]},
            {"_id": 0, "id": 1}
        ).to_list(length=2000)
        return list({m["id"] for m in team_members})
    elif role == "team_lead":
        return await get_team_member_ids(emp)
    else:
        return [emp["id"]]


# ──────────────────────────────────────────────────────────
# Helper — record a report download for baseline tracking
# ──────────────────────────────────────────────────────────
async def _record_download(emp: dict, report_type: str, team_scope: str) -> None:
    """Persist a report download event for future baseline comparisons."""
    record = {
        "id": new_id(),
        "downloaded_by": emp["id"],
        "downloaded_by_name": emp.get("name", ""),
        "downloaded_by_role": emp.get("role", ""),
        "report_type": report_type,      # "all_teams", "team", "bdo_scope"
        "team_scope": team_scope,        # team UUID or "all"
        "timestamp": now_iso(),
    }
    await db.report_download_history().insert_one(record)


# ──────────────────────────────────────────────────────────
# Helper — get the previous download timestamp for a given scope
# ──────────────────────────────────────────────────────────
async def _get_previous_download_timestamp(emp_id: str, team_scope: str) -> Optional[str]:
    """
    Return the timestamp of the second-to-last download for this employee+scope.
    (The 'last' download is being recorded NOW, so we look for the one before.)
    """
    records = await db.report_download_history().find(
        {"downloaded_by": emp_id, "team_scope": team_scope},
        {"_id": 0, "timestamp": 1}
    ).sort("timestamp", -1).limit(2).to_list(length=2)

    if len(records) >= 2:
        return records[1]["timestamp"]  # Second most recent = previous baseline
    return None


# ──────────────────────────────────────────────────────────
# Helper — generate team summary section (CSV rows)
# ──────────────────────────────────────────────────────────
async def _generate_team_summary(emp_ids: list, team_name: str, since_timestamp: Optional[str]) -> list:
    """
    Build CSV lines for the team summary block.
    Returns a list of CSV-formatted strings.
    """
    employees = await db.employees().find(
        {"id": {"$in": emp_ids}, "status": "active"},
        {"_id": 0, "id": 1, "name": 1, "role": 1, "employee_id": 1}
    ).to_list(length=500)

    lines = []
    lines.append('"=== TEAM SUMMARY REPORT ==="')
    lines.append(f'"Team Name","{team_name}"')
    lines.append(f'"Report Generated On","{datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}"')
    if since_timestamp:
        since_fmt = since_timestamp[:10]  # YYYY-MM-DD
        lines.append(f'"Reporting Period","Since {since_fmt} (previous report baseline)"')
    else:
        lines.append('"Reporting Period","All available records"')
    lines.append("")
    lines.append('"Employee Name","Employee ID","Role","Leads Assigned","Leads Won","Completed Tasks","Site Visits","Work Since Last Report"')

    since_filter: dict = {}
    if since_timestamp:
        since_filter = {"$gte": since_timestamp}

    for emp_rec in employees:
        eid = emp_rec["id"]
        leads_total = await db.leads().count_documents({"assigned_to": eid})
        leads_won = await db.leads().count_documents({"assigned_to": eid, "status": "closed_won"})
        
        # Tasks completed since last report (or all time if no baseline)
        task_query = {"assigned_to": eid, "status": "completed"}
        if since_timestamp:
            task_query["completed_at"] = {"$gte": since_timestamp}
        tasks_since = await db.tasks().count_documents(task_query)
        tasks_total = await db.tasks().count_documents({"assigned_to": eid, "status": "completed"})

        # Site visits since last report
        sv_query = {"employee_id": eid, "status": "completed"}
        if since_timestamp:
            sv_query["updated_at"] = {"$gte": since_timestamp}
        site_visits_since = await db.site_visits().count_documents(sv_query)
        site_visits_total = await db.site_visits().count_documents({"employee_id": eid})

        # Summarize work since last report
        if since_timestamp:
            work_summary = f"Tasks: {tasks_since} completed | Site Visits: {site_visits_since} completed"
        else:
            work_summary = f"Tasks: {tasks_total} completed (all time) | Site Visits: {site_visits_total} (all time)"

        role_display = emp_rec.get("role", "").replace("_", " ").title()
        row = (
            f'"{emp_rec.get("name", "")}","{emp_rec.get("employee_id", "")}","{role_display}",'
            f'"{leads_total}","{leads_won}","{tasks_total}","{site_visits_total}",'
            f'"{work_summary}"'
        )
        lines.append(row)

    lines.append("")
    lines.append('"=== DETAILED LEAD RECORDS ==="')
    lines.append("")
    return lines


# ──────────────────────────────────────────────────────────
# Helper — generate CSV content from employee ids
# ──────────────────────────────────────────────────────────
async def _generate_csv(
    emp_ids: list,
    filename_label: str,
    role_label: str,
    team_name: str = "All Teams",
    since_timestamp: Optional[str] = None
) -> str:
    # Build team summary header
    summary_lines = await _generate_team_summary(emp_ids, team_name, since_timestamp)

    leads = await db.leads().find(
        {"$or": [{"assigned_to": {"$in": emp_ids}}, {"created_by": {"$in": emp_ids}}]},
        {"_id": 0}
    ).to_list(length=5000)

    # Build employee lookup for name resolution
    emps = await db.employees().find(
        {"id": {"$in": emp_ids}}, {"_id": 0, "id": 1, "name": 1, "role": 1, "employee_id": 1}
    ).to_list(length=500)
    emp_map = {e["id"]: e for e in emps}

    detail_lines = ["Lead ID,Customer Name,Source,Status,Assigned To,Assignee Role,Created By,Created At,Notes"]
    for lead in leads:
        assignee = emp_map.get(lead.get("assigned_to"), {})
        creator = emp_map.get(lead.get("created_by"), {})
        cust = await db.customers().find_one({"id": lead.get("customer_id")}, {"_id": 0, "name": 1})
        cust_name = cust.get("name", "") if cust else ""
        assignee_name = assignee.get("name", lead.get("assigned_to", ""))
        assignee_role = assignee.get("role", "").replace("_", " ").title()
        creator_name = creator.get("name", lead.get("created_by", ""))
        row = (
            f'"{lead.get("lead_id", "")}","{cust_name}","{lead.get("source", "")}","{lead.get("status", "")}",'\
            f'"{assignee_name}","{assignee_role}",'\
            f'"{creator_name}","{lead.get("created_at", "")}","{lead.get("notes", "")}"'
        )
        detail_lines.append(row)

    return "\n".join(summary_lines + detail_lines)


# ──────────────────────────────────────────────────────────
# Dashboard Summary
# ──────────────────────────────────────────────────────────
@router.get("/dashboard-summary")
async def dashboard_summary(emp: dict = Depends(get_current_employee)):
    """Real-time summary from actual DB — scoped by role."""
    role = emp["role"]

    lead_filter: dict = {}
    if role in ["executive", "trainee"]:
        lead_filter["assigned_to"] = emp["id"]
    elif role == "team_lead":
        from services.rbac_service import get_team_member_ids
        team = await get_team_member_ids(emp)
        lead_filter["assigned_to"] = {"$in": team}

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
    task_filter = {"assigned_to": emp["id"] if role in ["executive", "trainee"] else {"$exists": True}}
    overdue_tasks = await db.tasks().count_documents(
        {**task_filter, "due_date": {"$lt": today_str}, "status": {"$in": ["pending", "in_progress"]}}
    )
    due_today = await db.tasks().count_documents(
        {**task_filter, "due_date": today_str, "status": {"$in": ["pending", "in_progress"]}}
    )
    site_visits = await db.site_visits().count_documents({"date": today_str})

    summary = {
        "total_leads": total_leads,
        "new_leads_today": new_today,
        "active_leads": active_leads,
        "overdue_tasks": overdue_tasks,
        "due_today": due_today,
        "site_visits_today": site_visits,
    }

    if role in FINANCIAL_ROLES:
        total_properties = await db.properties().count_documents({})
        total_employees = await db.employees().count_documents({"status": "active"})
        total_deals = await db.deals().count_documents({})

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


# ──────────────────────────────────────────────────────────
# Lead Sources & Statuses (analytics charts — all roles can view)
# ──────────────────────────────────────────────────────────
@router.get("/lead-sources")
async def lead_source_breakdown(emp: dict = Depends(get_current_employee)):
    """Leads grouped by source — scoped by role."""
    emp_ids = await _get_scoped_emp_ids(emp)
    pipeline = [
        {"$match": {"assigned_to": {"$in": emp_ids}}},
        {"$group": {"_id": "$source", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    results = await db.leads().aggregate(pipeline).to_list(length=50)
    return [{"source": r["_id"], "count": r["count"]} for r in results]


@router.get("/lead-statuses")
async def lead_status_breakdown(emp: dict = Depends(get_current_employee)):
    """Leads grouped by status for funnel view — scoped by role."""
    emp_ids = await _get_scoped_emp_ids(emp)
    pipeline = [
        {"$match": {"assigned_to": {"$in": emp_ids}}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    results = await db.leads().aggregate(pipeline).to_list(length=30)
    return [{"status": r["_id"], "count": r["count"]} for r in results]


# ──────────────────────────────────────────────────────────
# Employee Performance (Founder, BDO, Team Lead only)
# ──────────────────────────────────────────────────────────
@router.get("/employee-performance")
async def all_employee_performance(emp: dict = Depends(get_current_employee)):
    """Team performance overview — scoped by role."""
    if emp["role"] not in ["founder", "admin", "bdo", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorised to view employee performance")

    emp_ids = await _get_scoped_emp_ids(emp)
    employees = await db.employees().find(
        {"id": {"$in": emp_ids}, "status": "active"},
        {"_id": 0, "id": 1, "name": 1, "role": 1, "employee_id": 1}
    ).to_list(length=200)

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


# ──────────────────────────────────────────────────────────
# Audit Logs (Founder/Admin/DPO only)
# ──────────────────────────────────────────────────────────
@router.get("/audit-logs")
async def get_audit_logs(
    entity: Optional[str] = None,
    emp: dict = Depends(get_current_employee),
):
    """Audit log viewer — Founder/Admin/DPO only."""
    if emp["role"] not in ["founder", "admin", "dpo"]:
        raise HTTPException(status_code=403, detail="Not authorised")

    query: dict = {}
    if entity:
        query["entity"] = entity

    cursor = db.audit_logs().find(query, {"_id": 0}).sort("timestamp", -1).limit(500)
    logs = await cursor.to_list(length=500)
    return logs


# ──────────────────────────────────────────────────────────
# Teams List — for Founder/BDO team-selector dropdown
# ──────────────────────────────────────────────────────────
@router.get("/teams")
async def list_teams_for_reports(emp: dict = Depends(get_current_employee)):
    """Return list of teams that this user is authorised to download reports for."""
    role = emp["role"]
    if role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Not authorised to list teams for reports")

    if role in ["founder", "admin"]:
        teams = await db.teams().find({}, {"_id": 0}).to_list(length=500)
    else:
        # BDO — teams whose team_leader reports to this BDO
        tl_docs = await db.employees().find(
            {"reporting_manager": emp["id"], "role": "team_lead"},
            {"_id": 0, "id": 1}
        ).to_list(length=200)
        tl_ids = [t["id"] for t in tl_docs]
        teams = await db.teams().find(
            {"team_leader_id": {"$in": tl_ids}},
            {"_id": 0}
        ).to_list(length=200)

    result = []
    for t in teams:
        t.pop("_id", None)
        leader = await db.employees().find_one({"id": t.get("team_leader_id")}, {"_id": 0, "name": 1, "employee_id": 1})
        t["team_leader_name"] = leader.get("name") if leader else "Unknown"
        result.append(t)
    return result


# ──────────────────────────────────────────────────────────
# Download History — view report download records (founder/bdo only)
# ──────────────────────────────────────────────────────────
@router.get("/download-history")
async def get_download_history(emp: dict = Depends(get_current_employee)):
    """View report download history for baseline tracking."""
    if emp["role"] not in ["founder", "admin", "bdo", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorised")

    query: dict = {}
    if emp["role"] == "team_lead":
        # Team leader only sees their own download history
        query["downloaded_by"] = emp["id"]
    elif emp["role"] == "bdo":
        # BDO sees history for their own downloads
        query["downloaded_by"] = emp["id"]

    cursor = db.report_download_history().find(query, {"_id": 0}).sort("timestamp", -1).limit(100)
    history = await cursor.to_list(length=100)
    return history


# ──────────────────────────────────────────────────────────
# Export — All-scope report (Founder/BDO/Team Lead only)
# Executive and Trainee are BLOCKED at backend
# ──────────────────────────────────────────────────────────
@router.get("/export")
async def export_report(emp: dict = Depends(get_current_employee)):
    """
    Export CSV report scoped to the authenticated user's role.
    - Founder/Admin → all employees, all teams summary
    - BDO → employees under BDO's scope
    - Team Lead → only their own team members
    - Executive/Trainee/DPO → 403 Forbidden
    """
    role = emp["role"]

    # ── STRICT AUTHORIZATION — backend enforced ──
    if role in ["executive", "trainee", "dpo"]:
        raise HTTPException(
            status_code=403,
            detail="Report downloads are not permitted for your role. Contact your Team Leader or BDO."
        )

    emp_ids = await _get_scoped_emp_ids(emp)

    if role in ["founder", "admin"]:
        filename = f"VisitSarva_AllTeams_Report_{datetime.now().strftime('%Y%m%d')}.csv"
        label = "All Teams"
        team_scope = "all"
    elif role == "bdo":
        filename = f"VisitSarva_BDO_Report_{datetime.now().strftime('%Y%m%d')}.csv"
        label = "BDO Scope"
        team_scope = f"bdo_{emp['id']}"
    else:  # team_lead
        filename = f"VisitSarva_MyTeam_Report_{datetime.now().strftime('%Y%m%d')}.csv"
        label = "My Team"
        team_scope = emp.get("team_id", emp["id"])

    # Record BEFORE generating so the baseline query finds the previous record
    await _record_download(emp, "scope_report", team_scope)
    since_timestamp = await _get_previous_download_timestamp(emp["id"], team_scope)

    # Resolve team name for the summary header
    if role == "team_lead":
        team_doc = await db.teams().find_one({"team_leader_id": emp["id"]})
        team_name = team_doc.get("name", "My Team") if team_doc else "My Team"
    else:
        team_name = label

    csv_content = await _generate_csv(emp_ids, label, role, team_name=team_name, since_timestamp=since_timestamp)

    from fastapi.responses import Response
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# ──────────────────────────────────────────────────────────
# Export — Specific Team (Founder/BDO only)
# ──────────────────────────────────────────────────────────
@router.get("/export/team/{team_id}")
async def export_team_report(team_id: str, emp: dict = Depends(get_current_employee)):
    """
    Export report for a specific team.
    - Founder/Admin → any team
    - BDO → only teams within their scope
    - Team Lead → blocked (use /export instead for own team)
    - All other roles → 403 Forbidden
    """
    role = emp["role"]

    if role not in ADMIN_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Only Founder and BDO can download individual team reports via this endpoint. Team Leaders use /export."
        )

    # Validate the team exists
    team = await db.teams().find_one({"$or": [{"id": team_id}, {"team_id": team_id}]})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # BDO scope check — ensure this team's leader reports to the BDO
    if role == "bdo":
        tl_id = team.get("team_leader_id")
        tl = await db.employees().find_one({"id": tl_id})
        if not tl or tl.get("reporting_manager") != emp["id"]:
            raise HTTPException(
                status_code=403,
                detail="You are not authorised to download this team's report."
            )

    # Gather all employees in this team
    team_uuid = team.get("id")
    team_display_id = team.get("team_id")
    team_leader_id = team.get("team_leader_id")

    members = await db.employees().find(
        {"$or": [
            {"id": team_leader_id},
            {"team_id": {"$in": list(filter(None, [team_uuid, team_display_id]))}},
            {"reporting_manager": team_leader_id},
        ]},
        {"_id": 0, "id": 1}
    ).to_list(length=500)
    emp_ids = list({m["id"] for m in members})
    if team_leader_id and team_leader_id not in emp_ids:
        emp_ids.append(team_leader_id)

    team_name = team.get("name", team_id)
    team_scope = team_uuid or team_id
    filename = f"VisitSarva_{team_name.replace(' ', '_')}_Report_{datetime.now().strftime('%Y%m%d')}.csv"

    # Record the download for baseline tracking
    await _record_download(emp, "team_report", team_scope)
    since_timestamp = await _get_previous_download_timestamp(emp["id"], team_scope)

    csv_content = await _generate_csv(
        emp_ids, team_name, role,
        team_name=team_name, since_timestamp=since_timestamp
    )

    from fastapi.responses import Response
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
