"""CRM Reports & Analytics router — strict role-based authorization + employee-wise team performance metrics + Excel/CSV export + download history.

Security:
  - Executive/Trainee/DPO → 403 on all download endpoints (enforced at backend)
  - Team Leader → can only download their own team's report
  - BDO → can download reports for teams within their authorized scope
  - Founder/Admin → can download all teams or individual team reports

Download history tracks baselines so reports can show "work since last report".
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import io
import db
from services.rbac_service import get_current_employee
from crm_models import now_iso, new_id

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False

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
# Core Metrics Engine — calculate metrics for a single employee
# ──────────────────────────────────────────────────────────
async def _calculate_employee_performance(emp_rec: dict, since_timestamp: Optional[str] = None) -> dict:
    """
    Calculate 4 core performance metrics for an employee using actual CRM data:
    1. Employee ID
    2. Employee Name
    3. Employee Role
    4. Leads Updates
    5. Token Received
    6. Site Visits
    7. Conversions Based on Deals
    """
    eid = emp_rec["id"]
    emp_official_id = emp_rec.get("employee_id") or eid
    name = emp_rec.get("name", "")
    role_raw = emp_rec.get("role", "")

    role_map = {
        "founder": "Founder",
        "admin": "Admin",
        "bdo": "BDO",
        "team_lead": "Team Leader",
        "executive": "Executive",
        "trainee": "Trainee",
        "dpo": "DPO"
    }
    role_display = role_map.get(role_raw, role_raw.replace("_", " ").title())

    # 1. LEADS UPDATES — Lead activity audit logs or assigned/created lead status updates
    audit_query: dict = {"who": eid, "entity": "lead"}
    if since_timestamp:
        audit_query["timestamp"] = {"$gte": since_timestamp}
    audit_lead_updates = await db.audit_logs().count_documents(audit_query)

    lead_query: dict = {"$or": [{"assigned_to": eid}, {"created_by": eid}]}
    if since_timestamp:
        lead_query["updated_at"] = {"$gte": since_timestamp}
    assigned_or_created_leads = await db.leads().count_documents(lead_query)

    leads_updates = max(audit_lead_updates, assigned_or_created_leads)

    # 2. TOKEN RECEIVED — Deduplicated across leads, deals, payments
    token_lead_ids = set()
    token_deal_ids = set()

    lead_token_query: dict = {
        "$or": [{"assigned_to": eid}, {"created_by": eid}],
        "status": {"$in": ["token", "token_received"]}
    }
    if since_timestamp:
        lead_token_query["updated_at"] = {"$gte": since_timestamp}
    token_leads = await db.leads().find(lead_token_query, {"_id": 0, "id": 1}).to_list(length=1000)
    for l in token_leads:
        token_lead_ids.add(l["id"])

    deal_token_query: dict = {
        "assigned_employee": eid,
        "$or": [{"status": "token_received"}, {"token_amount": {"$gt": 0}}]
    }
    if since_timestamp:
        deal_token_query["updated_at"] = {"$gte": since_timestamp}
    token_deals = await db.deals().find(deal_token_query, {"_id": 0, "id": 1}).to_list(length=1000)
    for d in token_deals:
        token_deal_ids.add(d["id"])

    pay_query: dict = {"payment_type": "token", "status": "paid"}
    if since_timestamp:
        pay_query["created_at"] = {"$gte": since_timestamp}
    token_payments = await db.payments().find(pay_query, {"_id": 0, "deal_id": 1}).to_list(length=1000)
    for p in token_payments:
        if p.get("deal_id"):
            deal_doc = await db.deals().find_one({"id": p["deal_id"]}, {"_id": 0, "assigned_employee": 1})
            if deal_doc and deal_doc.get("assigned_employee") == eid:
                token_deal_ids.add(p["deal_id"])

    token_received = len(token_lead_ids) + len(token_deal_ids)

    # 3. SITE VISITS — Unique Site Visit records assigned to or created by employee
    sv_query: dict = {"$or": [{"employee_id": eid}, {"created_by": eid}]}
    if since_timestamp:
        sv_query["updated_at"] = {"$gte": since_timestamp}
    site_visits_list = await db.site_visits().find(sv_query, {"_id": 0, "id": 1}).to_list(length=1000)
    site_visits = len(site_visits_list)

    # 4. CONVERSIONS BASED ON DEALS — Qualifying deals status
    conversion_ids = set()
    deal_conv_query: dict = {
        "assigned_employee": eid,
        "status": {"$in": ["closed", "registration_done", "agreement_done", "closed_won"]}
    }
    if since_timestamp:
        deal_conv_query["updated_at"] = {"$gte": since_timestamp}
    conv_deals = await db.deals().find(deal_conv_query, {"_id": 0, "id": 1}).to_list(length=1000)
    for d in conv_deals:
        conversion_ids.add(d["id"])

    lead_conv_query: dict = {
        "$or": [{"assigned_to": eid}, {"created_by": eid}],
        "status": "closed_won"
    }
    if since_timestamp:
        lead_conv_query["updated_at"] = {"$gte": since_timestamp}
    conv_leads = await db.leads().find(lead_conv_query, {"_id": 0, "id": 1}).to_list(length=1000)
    for l in conv_leads:
        conversion_ids.add(l["id"])

    conversions = len(conversion_ids)
    closed_won_count = conversions
    conversion_rate = round(closed_won_count / leads_updates * 100, 1) if leads_updates > 0 else 0.0

    return {
        "id": eid,
        "employee_id": emp_official_id,
        "name": name,
        "role": role_raw,
        "role_display": role_display,
        "leads_updates": leads_updates,
        "token_received": token_received,
        "site_visits": site_visits,
        "conversions_based_on_deals": conversions,
        "closed_won": closed_won_count,
        "conversion_rate": conversion_rate,
    }


# ──────────────────────────────────────────────────────────
# Helper — group employees by team and calculate team totals
# ──────────────────────────────────────────────────────────
async def _get_team_grouped_performance(emp_ids: list, since_timestamp: Optional[str] = None) -> list:
    """
    Groups employees by team and calculates team metrics and team totals.
    """
    employees = await db.employees().find(
        {"id": {"$in": emp_ids}, "status": "active"},
        {"_id": 0, "id": 1, "employee_id": 1, "name": 1, "role": 1, "team_id": 1, "reporting_manager": 1}
    ).to_list(length=1000)

    teams = await db.teams().find({}, {"_id": 0}).to_list(length=500)
    team_map = {t["id"]: t for t in teams}

    team_groups: Dict[str, List[dict]] = {}
    unassigned: List[dict] = []

    for e in employees:
        tid = e.get("team_id")
        if not tid and e.get("reporting_manager"):
            mgr_team = next((t for t in teams if t.get("team_leader_id") == e["reporting_manager"]), None)
            if mgr_team:
                tid = mgr_team["id"]

        if tid and tid in team_map:
            team_groups.setdefault(tid, []).append(e)
        else:
            unassigned.append(e)

    result_teams = []

    for tid, team_doc in team_map.items():
        if tid not in team_groups and team_doc.get("team_leader_id") not in emp_ids:
            continue
        group_emps = team_groups.get(tid, [])
        tl_id = team_doc.get("team_leader_id")
        tl_emp = next((e for e in employees if e["id"] == tl_id), None)
        if tl_emp and tl_emp not in group_emps:
            group_emps.insert(0, tl_emp)

        if not group_emps:
            continue

        emp_perf_list = []
        for emp_rec in group_emps:
            perf = await _calculate_employee_performance(emp_rec, since_timestamp)
            perf["team_name"] = team_doc.get("name", "Team")
            emp_perf_list.append(perf)

        emp_perf_list.sort(key=lambda x: (0 if x["role"] == "team_lead" else 1, -x["conversions_based_on_deals"]))

        totals = {
            "total_employees": len(emp_perf_list),
            "leads_updates": sum(p["leads_updates"] for p in emp_perf_list),
            "token_received": sum(p["token_received"] for p in emp_perf_list),
            "site_visits": sum(p["site_visits"] for p in emp_perf_list),
            "conversions": sum(p["conversions_based_on_deals"] for p in emp_perf_list)
        }

        tl_doc = await db.employees().find_one({"id": tl_id}, {"_id": 0, "name": 1})
        tl_name = tl_doc.get("name", "Unknown") if tl_doc else "Unknown"

        result_teams.append({
            "team_id": tid,
            "team_name": team_doc.get("name", "Team"),
            "team_leader_name": tl_name,
            "employees": emp_perf_list,
            "totals": totals
        })

    if unassigned:
        unassigned_perf = []
        for emp_rec in unassigned:
            perf = await _calculate_employee_performance(emp_rec, since_timestamp)
            perf["team_name"] = "Management / Direct Staff"
            unassigned_perf.append(perf)

        unassigned_perf.sort(key=lambda x: -x["conversions_based_on_deals"])
        totals = {
            "total_employees": len(unassigned_perf),
            "leads_updates": sum(p["leads_updates"] for p in unassigned_perf),
            "token_received": sum(p["token_received"] for p in unassigned_perf),
            "site_visits": sum(p["site_visits"] for p in unassigned_perf),
            "conversions": sum(p["conversions_based_on_deals"] for p in unassigned_perf)
        }
        result_teams.append({
            "team_id": "unassigned",
            "team_name": "Management / Direct Staff",
            "team_leader_name": "N/A",
            "employees": unassigned_perf,
            "totals": totals
        })

    return result_teams


# ──────────────────────────────────────────────────────────
# Helper — detailed records for Sheets 2, 3, and 4
# ──────────────────────────────────────────────────────────
async def _get_detailed_records(emp_ids: list):
    """Fetch detailed leads, site visits, and deals for reporting."""
    emps = await db.employees().find({"id": {"$in": emp_ids}}, {"_id": 0, "id": 1, "employee_id": 1, "name": 1, "role": 1}).to_list(length=1000)
    emp_map = {e["id"]: e for e in emps}

    custs = await db.customers().find({}, {"_id": 0, "id": 1, "name": 1}).to_list(length=5000)
    cust_map = {c["id"]: c.get("name", "") for c in custs}

    props = await db.properties().find({}, {"_id": 0, "id": 1, "title": 1}).to_list(length=5000)
    prop_map = {p["id"]: p.get("title", "") for p in props}

    leads = await db.leads().find(
        {"$or": [{"assigned_to": {"$in": emp_ids}}, {"created_by": {"$in": emp_ids}}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=5000)

    role_map = {"founder": "Founder", "admin": "Admin", "bdo": "BDO", "team_lead": "Team Leader", "executive": "Executive", "trainee": "Trainee", "dpo": "DPO"}

    leads_detail = []
    for l in leads:
        assignee = emp_map.get(l.get("assigned_to"), {})
        creator = emp_map.get(l.get("created_by"), {})
        assignee_role = role_map.get(assignee.get("role", ""), assignee.get("role", "").replace("_", " ").title())
        leads_detail.append({
            "lead_id": l.get("lead_id", ""),
            "customer_name": cust_map.get(l.get("customer_id"), ""),
            "source": l.get("source", ""),
            "status": l.get("status", ""),
            "assigned_name": assignee.get("name", l.get("assigned_to", "")),
            "assigned_employee_id": assignee.get("employee_id", assignee.get("id", "")),
            "assigned_role": assignee_role,
            "creator_name": creator.get("name", l.get("created_by", "")),
            "created_at": l.get("created_at", ""),
            "notes": l.get("notes", "")
        })

    site_visits = await db.site_visits().find(
        {"$or": [{"employee_id": {"$in": emp_ids}}, {"created_by": {"$in": emp_ids}}]},
        {"_id": 0}
    ).sort("date", -1).to_list(length=2000)

    site_visits_detail = []
    for sv in site_visits:
        emp_info = emp_map.get(sv.get("employee_id"), {})
        prop_titles = [prop_map.get(pid, pid) for pid in sv.get("properties", [])]
        site_visits_detail.append({
            "visit_id": sv.get("visit_id", sv.get("id", "")),
            "customer_name": cust_map.get(sv.get("customer_id"), ""),
            "employee_name": emp_info.get("name", sv.get("employee_id", "")),
            "employee_official_id": emp_info.get("employee_id", emp_info.get("id", "")),
            "date": sv.get("date", ""),
            "time": sv.get("time", ""),
            "status": sv.get("status", ""),
            "property_titles": prop_titles,
            "notes": sv.get("notes", "")
        })

    deals = await db.deals().find(
        {"assigned_employee": {"$in": emp_ids}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=2000)

    deals_detail = []
    for d in deals:
        emp_info = emp_map.get(d.get("assigned_employee"), {})
        deals_detail.append({
            "deal_id": d.get("deal_id", ""),
            "customer_name": cust_map.get(d.get("customer_id"), ""),
            "property_title": prop_map.get(d.get("property_id"), ""),
            "assigned_name": emp_info.get("name", d.get("assigned_employee", "")),
            "assigned_employee_id": emp_info.get("employee_id", emp_info.get("id", "")),
            "status": d.get("status", ""),
            "final_deal_value": d.get("final_deal_value", 0),
            "token_amount": d.get("token_amount", 0),
            "expected_commission": d.get("expected_commission", 0),
            "registration_date": d.get("registration_date", "")
        })

    return leads_detail, site_visits_detail, deals_detail


# ──────────────────────────────────────────────────────────
# Excel (.xlsx) Generation — Multi-sheet workbook
# ──────────────────────────────────────────────────────────
def _build_excel_workbook(
    team_data: list,
    leads_detail: list,
    site_visits_detail: list,
    deals_detail: list,
    report_title: str,
    since_timestamp: Optional[str] = None
) -> bytes:
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    section_fill = PatternFill(start_color="334155", end_color="334155", fill_type="solid")
    section_font = Font(name="Calibri", size=12, bold=True, color="FFFFFF")
    total_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    total_font = Font(name="Calibri", size=10, bold=True, color="0F172A")
    title_font = Font(name="Calibri", size=16, bold=True, color="0F172A")
    meta_font = Font(name="Calibri", size=10, italic=True, color="475569")
    regular_font = Font(name="Calibri", size=10, color="1E293B")

    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    # ── SHEET 1: Team Performance Summary ──
    ws1 = wb.create_sheet(title="Team Performance Summary")
    ws1.views.sheetView[0].showGridLines = True

    ws1.append(["VISITSARVA CRM — TEAM PERFORMANCE REPORT"])
    ws1.cell(row=1, column=1).font = title_font
    ws1.append([f"Report Scope: {report_title}"])
    ws1.cell(row=2, column=1).font = meta_font
    ws1.append([f"Report Generated On: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"])
    ws1.cell(row=3, column=1).font = meta_font
    period_str = f"Since {since_timestamp[:10]} (previous report baseline)" if since_timestamp else "All available records"
    ws1.append([f"Reporting Period: {period_str}"])
    ws1.cell(row=4, column=1).font = meta_font
    ws1.append([])

    headers = [
        "Team Name", "Employee ID", "Employee Name", "Role",
        "Leads Updates", "Token Received", "Site Visits", "Conversions Based on Deals"
    ]

    for team in team_data:
        team_title_row = [f"TEAM: {team['team_name']} (Leader: {team['team_leader_name']})"]
        ws1.append(team_title_row)
        r_idx = ws1.max_row
        ws1.merge_cells(start_row=r_idx, start_column=1, end_row=r_idx, end_column=len(headers))
        cell = ws1.cell(row=r_idx, column=1)
        cell.fill = section_fill
        cell.font = section_font
        cell.alignment = Alignment(horizontal="left", vertical="center")

        ws1.append(headers)
        h_row = ws1.max_row
        for col_idx in range(1, len(headers) + 1):
            c = ws1.cell(row=h_row, column=col_idx)
            c.fill = header_fill
            c.font = header_font
            c.alignment = Alignment(horizontal="center" if col_idx > 4 else "left", vertical="center")

        for emp in team["employees"]:
            row_vals = [
                team["team_name"],
                emp["employee_id"],
                emp["name"],
                emp["role_display"],
                emp["leads_updates"],
                emp["token_received"],
                emp["site_visits"],
                emp["conversions_based_on_deals"]
            ]
            ws1.append(row_vals)
            curr_row = ws1.max_row
            for col_idx in range(1, len(row_vals) + 1):
                c = ws1.cell(row=curr_row, column=col_idx)
                c.font = regular_font
                c.border = thin_border
                c.alignment = Alignment(horizontal="center" if col_idx in [2, 4, 5, 6, 7, 8] else "left")

        totals = team["totals"]
        tot_row = [
            f"TEAM TOTALS ({team['team_name']})",
            "",
            f"Total Employees: {totals['total_employees']}",
            "",
            totals["leads_updates"],
            totals["token_received"],
            totals["site_visits"],
            totals["conversions"]
        ]
        ws1.append(tot_row)
        t_row = ws1.max_row
        for col_idx in range(1, len(tot_row) + 1):
            c = ws1.cell(row=t_row, column=col_idx)
            c.fill = total_fill
            c.font = total_font
            c.border = thin_border
            c.alignment = Alignment(horizontal="center" if col_idx in [5, 6, 7, 8] else "left")

        ws1.append([])

    for col in ws1.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            val_str = str(cell.value or "")
            if cell.row in [1, 2, 3, 4] or cell.coordinate in ws1.merged_cells:
                continue
            max_len = max(max_len, len(val_str))
        ws1.column_dimensions[col_letter].width = max(max_len + 4, 15)

    # ── SHEET 2: Lead Details ──
    ws2 = wb.create_sheet(title="Lead Details")
    ws2.views.sheetView[0].showGridLines = True
    l_headers = ["Lead ID", "Customer Name", "Source", "Status", "Assigned Employee", "Employee ID", "Role", "Created By", "Created At", "Notes"]
    ws2.append(l_headers)
    for col_idx in range(1, len(l_headers) + 1):
        c = ws2.cell(row=1, column=col_idx)
        c.fill = header_fill
        c.font = header_font

    for l in leads_detail:
        ws2.append([
            l.get("lead_id", ""),
            l.get("customer_name", ""),
            l.get("source", ""),
            l.get("status", ""),
            l.get("assigned_name", ""),
            l.get("assigned_employee_id", ""),
            l.get("assigned_role", ""),
            l.get("creator_name", ""),
            l.get("created_at", ""),
            l.get("notes", "")
        ])
    for col in ws2.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        ws2.column_dimensions[get_column_letter(col[0].column)].width = min(max(max_len + 3, 12), 40)

    # ── SHEET 3: Site Visit Details ──
    ws3 = wb.create_sheet(title="Site Visit Details")
    ws3.views.sheetView[0].showGridLines = True
    sv_headers = ["Visit ID", "Customer Name", "Assigned Employee", "Employee ID", "Date", "Time", "Status", "Properties", "Notes"]
    ws3.append(sv_headers)
    for col_idx in range(1, len(sv_headers) + 1):
        c = ws3.cell(row=1, column=col_idx)
        c.fill = header_fill
        c.font = header_font

    for sv in site_visits_detail:
        ws3.append([
            sv.get("visit_id", ""),
            sv.get("customer_name", ""),
            sv.get("employee_name", ""),
            sv.get("employee_official_id", ""),
            sv.get("date", ""),
            sv.get("time", ""),
            sv.get("status", ""),
            ", ".join(sv.get("property_titles", [])),
            sv.get("notes", "")
        ])
    for col in ws3.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        ws3.column_dimensions[get_column_letter(col[0].column)].width = min(max(max_len + 3, 12), 40)

    # ── SHEET 4: Deal & Conversion Details ──
    ws4 = wb.create_sheet(title="Deal & Conversion Details")
    ws4.views.sheetView[0].showGridLines = True
    d_headers = ["Deal ID", "Customer Name", "Property", "Assigned Employee", "Employee ID", "Status", "Deal Value", "Token Amount", "Expected Commission", "Registration Date"]
    ws4.append(d_headers)
    for col_idx in range(1, len(d_headers) + 1):
        c = ws4.cell(row=1, column=col_idx)
        c.fill = header_fill
        c.font = header_font

    for d in deals_detail:
        ws4.append([
            d.get("deal_id", ""),
            d.get("customer_name", ""),
            d.get("property_title", ""),
            d.get("assigned_name", ""),
            d.get("assigned_employee_id", ""),
            d.get("status", ""),
            d.get("final_deal_value", 0),
            d.get("token_amount", 0),
            d.get("expected_commission", 0),
            d.get("registration_date", "")
        ])
    for col in ws4.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        ws4.column_dimensions[get_column_letter(col[0].column)].width = min(max(max_len + 3, 12), 40)

    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()


# ──────────────────────────────────────────────────────────
# CSV Generation — Structured multi-section CSV fallback
# ──────────────────────────────────────────────────────────
def _build_csv_report(
    team_data: list,
    leads_detail: list,
    site_visits_detail: list,
    deals_detail: list,
    report_title: str,
    since_timestamp: Optional[str] = None
) -> str:
    lines = []
    lines.append('"=== VISITSARVA CRM — TEAM PERFORMANCE REPORT ==="')
    lines.append(f'"Report Scope","{report_title}"')
    lines.append(f'"Report Generated On","{datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}"')
    period_str = f"Since {since_timestamp[:10]} (previous report baseline)" if since_timestamp else "All available records"
    lines.append(f'"Reporting Period","{period_str}"')
    lines.append("")

    headers = '"Team Name","Employee ID","Employee Name","Role","Leads Updates","Token Received","Site Visits","Conversions Based on Deals"'

    for team in team_data:
        lines.append(f'"=== TEAM: {team["team_name"]} (Leader: {team["team_leader_name"]}) ==="')
        lines.append(headers)

        for emp in team["employees"]:
            row = (
                f'"{emp["team_name"]}","{emp["employee_id"]}","{emp["name"]}","{emp["role_display"]}",'
                f'"{emp["leads_updates"]}","{emp["token_received"]}","{emp["site_visits"]}","{emp["conversions_based_on_deals"]}"'
            )
            lines.append(row)

        tot = team["totals"]
        tot_row = (
            f'"TEAM TOTALS ({team["team_name"]})","","Total Employees: {tot["total_employees"]}","",'
            f'"{tot["leads_updates"]}","{tot["token_received"]}","{tot["site_visits"]}","{tot["conversions"]}"'
        )
        lines.append(tot_row)
        lines.append("")

    lines.append('"=== DETAILED LEAD RECORDS ==="')
    lines.append('"Lead ID","Customer Name","Source","Status","Assigned Employee","Employee ID","Role","Created By","Created At","Notes"')
    for l in leads_detail:
        lines.append(
            f'"{l.get("lead_id","")}","{l.get("customer_name","")}","{l.get("source","")}","{l.get("status","")}",'
            f'"{l.get("assigned_name","")}","{l.get("assigned_employee_id","")}","{l.get("assigned_role","")}",'
            f'"{l.get("creator_name","")}","{l.get("created_at","")}","{l.get("notes","")}"'
        )

    lines.append("")
    lines.append('"=== SITE VISIT DETAILS ==="')
    lines.append('"Visit ID","Customer Name","Assigned Employee","Employee ID","Date","Time","Status","Properties","Notes"')
    for sv in site_visits_detail:
        props = ", ".join(sv.get("property_titles", []))
        lines.append(
            f'"{sv.get("visit_id","")}","{sv.get("customer_name","")}","{sv.get("employee_name","")}","{sv.get("employee_official_id","")}",'
            f'"{sv.get("date","")}","{sv.get("time","")}","{sv.get("status","")}","{props}","{sv.get("notes","")}"'
        )

    lines.append("")
    lines.append('"=== DEAL & CONVERSION DETAILS ==="')
    lines.append('"Deal ID","Customer Name","Property","Assigned Employee","Employee ID","Status","Deal Value","Token Amount","Expected Commission","Registration Date"')
    for d in deals_detail:
        lines.append(
            f'"{d.get("deal_id","")}","{d.get("customer_name","")}","{d.get("property_title","")}","{d.get("assigned_name","")}",'
            f'"{d.get("assigned_employee_id","")}","{d.get("status","")}","{d.get("final_deal_value",0)}","{d.get("token_amount",0)}",'
            f'"{d.get("expected_commission",0)}","{d.get("registration_date","")}"'
        )

    return "\n".join(lines)


# ──────────────────────────────────────────────────────────
# Dashboard Summary Endpoint
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
# Lead Sources & Statuses
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
# Employee Performance (Founder, BDO, Team Lead UI table)
# ──────────────────────────────────────────────────────────
@router.get("/employee-performance")
async def all_employee_performance(emp: dict = Depends(get_current_employee)):
    """Team performance overview — returns exact structured employee metrics."""
    if emp["role"] not in ["founder", "admin", "bdo", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorised to view employee performance")

    emp_ids = await _get_scoped_emp_ids(emp)
    employees = await db.employees().find(
        {"id": {"$in": emp_ids}, "status": "active"},
        {"_id": 0, "id": 1, "employee_id": 1, "name": 1, "role": 1}
    ).to_list(length=500)

    results = []
    for e in employees:
        perf = await _calculate_employee_performance(e)
        results.append(perf)

    results.sort(key=lambda x: x["conversions_based_on_deals"], reverse=True)
    return results


# ──────────────────────────────────────────────────────────
# Audit Logs
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
# Download History
# ──────────────────────────────────────────────────────────
@router.get("/download-history")
async def get_download_history(emp: dict = Depends(get_current_employee)):
    """View report download history for baseline tracking."""
    if emp["role"] not in ["founder", "admin", "bdo", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorised")

    query: dict = {}
    if emp["role"] in ["team_lead", "bdo"]:
        query["downloaded_by"] = emp["id"]

    cursor = db.report_download_history().find(query, {"_id": 0}).sort("timestamp", -1).limit(100)
    history = await cursor.to_list(length=100)
    return history


# ──────────────────────────────────────────────────────────
# Export — All-scope report (Founder/BDO/Team Lead only)
# ──────────────────────────────────────────────────────────
@router.get("/export")
async def export_report(
    format: str = Query("xlsx", description="Report format: xlsx or csv"),
    emp: dict = Depends(get_current_employee)
):
    """
    Export Team Performance Report scoped to the authenticated user's role.
    - Founder/Admin → all employees & all teams
    - BDO → employees & teams under BDO's scope
    - Team Lead → only their own team members
    - Executive/Trainee/DPO → 403 Forbidden
    """
    role = emp["role"]

    if role in ["executive", "trainee", "dpo"]:
        raise HTTPException(
            status_code=403,
            detail="Report downloads are not permitted for your role. Contact your Team Leader or BDO."
        )

    emp_ids = await _get_scoped_emp_ids(emp)

    if role in ["founder", "admin"]:
        label = "All Teams"
        team_scope = "all"
    elif role == "bdo":
        label = "BDO Scope"
        team_scope = f"bdo_{emp['id']}"
    else:  # team_lead
        team_doc = await db.teams().find_one({"team_leader_id": emp["id"]})
        label = team_doc.get("name", "My Team") if team_doc else "My Team"
        team_scope = emp.get("team_id", emp["id"])

    await _record_download(emp, "scope_report", team_scope)
    since_timestamp = await _get_previous_download_timestamp(emp["id"], team_scope)

    team_data = await _get_team_grouped_performance(emp_ids, since_timestamp)
    leads_detail, site_visits_detail, deals_detail = await _get_detailed_records(emp_ids)

    date_str = datetime.now().strftime('%Y%m%d')

    if format.lower() == "csv" or not HAS_OPENPYXL:
        filename = f"VisitSarva_{label.replace(' ', '_')}_Report_{date_str}.csv"
        csv_content = _build_csv_report(
            team_data, leads_detail, site_visits_detail, deals_detail,
            report_title=label, since_timestamp=since_timestamp
        )
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    else:
        filename = f"VisitSarva_{label.replace(' ', '_')}_Report_{date_str}.xlsx"
        excel_bytes = _build_excel_workbook(
            team_data, leads_detail, site_visits_detail, deals_detail,
            report_title=label, since_timestamp=since_timestamp
        )
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )


# ──────────────────────────────────────────────────────────
# Export — Specific Team (Founder/BDO only)
# ──────────────────────────────────────────────────────────
@router.get("/export/team/{team_id}")
async def export_team_report(
    team_id: str,
    format: str = Query("xlsx", description="Report format: xlsx or csv"),
    emp: dict = Depends(get_current_employee)
):
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

    team = await db.teams().find_one({"$or": [{"id": team_id}, {"team_id": team_id}]})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if role == "bdo":
        tl_id = team.get("team_leader_id")
        tl = await db.employees().find_one({"id": tl_id})
        if not tl or tl.get("reporting_manager") != emp["id"]:
            raise HTTPException(
                status_code=403,
                detail="You are not authorised to download this team's report."
            )

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
    date_str = datetime.now().strftime('%Y%m%d')

    await _record_download(emp, "team_report", team_scope)
    since_timestamp = await _get_previous_download_timestamp(emp["id"], team_scope)

    team_data = await _get_team_grouped_performance(emp_ids, since_timestamp)
    leads_detail, site_visits_detail, deals_detail = await _get_detailed_records(emp_ids)

    if format.lower() == "csv" or not HAS_OPENPYXL:
        filename = f"VisitSarva_{team_name.replace(' ', '_')}_Report_{date_str}.csv"
        csv_content = _build_csv_report(
            team_data, leads_detail, site_visits_detail, deals_detail,
            report_title=f"Team {team_name}", since_timestamp=since_timestamp
        )
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    else:
        filename = f"VisitSarva_{team_name.replace(' ', '_')}_Report_{date_str}.xlsx"
        excel_bytes = _build_excel_workbook(
            team_data, leads_detail, site_visits_detail, deals_detail,
            report_title=f"Team {team_name}", since_timestamp=since_timestamp
        )
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
