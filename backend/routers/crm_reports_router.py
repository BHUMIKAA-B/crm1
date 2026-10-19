"""CRM Reports & Analytics router — strict role-based authorization + employee-wise team performance metrics + Excel/CSV export + download history.

Security:
  - Executive/Trainee/DPO → 403 on all download endpoints (enforced at backend)
  - Team Leader → can only download their own team's report
  - BDO → can download reports for teams within their authorized scope
  - Founder/Admin → can download all teams or individual team reports

Download history tracks baselines so reports can show "work since last report".
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import Response
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import io
import csv
import asyncio
import db
from fpdf import FPDF
from services.rbac_service import get_current_employee
from crm_models import now_iso, new_id

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

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
    Calculate 4 core performance metrics for an employee using actual CRM data concurrently:
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

    audit_query: dict = {"who": eid, "entity": "lead"}
    lead_query: dict = {"$or": [{"assigned_to": eid}, {"created_by": eid}]}
    lead_token_query: dict = {
        "$or": [{"assigned_to": eid}, {"created_by": eid}],
        "status": {"$in": ["token", "token_received"]}
    }
    deal_token_query: dict = {
        "assigned_employee": eid,
        "$or": [{"status": "token_received"}, {"token_amount": {"$gt": 0}}]
    }
    pay_query: dict = {"payment_type": "token", "status": "paid"}
    sv_query: dict = {"$or": [{"employee_id": eid}, {"created_by": eid}]}
    deal_conv_query: dict = {
        "assigned_employee": eid,
        "status": {"$in": ["closed", "registration_done", "agreement_done", "closed_won"]}
    }
    lead_conv_query: dict = {
        "$or": [{"assigned_to": eid}, {"created_by": eid}],
        "status": "closed_won"
    }

    if since_timestamp:
        audit_query["timestamp"] = {"$gte": since_timestamp}
        lead_query["updated_at"] = {"$gte": since_timestamp}
        lead_token_query["updated_at"] = {"$gte": since_timestamp}
        deal_token_query["updated_at"] = {"$gte": since_timestamp}
        pay_query["created_at"] = {"$gte": since_timestamp}
        sv_query["updated_at"] = {"$gte": since_timestamp}
        deal_conv_query["updated_at"] = {"$gte": since_timestamp}
        lead_conv_query["updated_at"] = {"$gte": since_timestamp}

    # Execute all 8 queries concurrently
    (
        audit_lead_updates,
        assigned_or_created_leads,
        token_leads,
        token_deals,
        token_payments,
        site_visits_list,
        conv_deals,
        conv_leads
    ) = await asyncio.gather(
        db.audit_logs().count_documents(audit_query),
        db.leads().count_documents(lead_query),
        db.leads().find(lead_token_query, {"_id": 0, "id": 1}).to_list(length=1000),
        db.deals().find(deal_token_query, {"_id": 0, "id": 1}).to_list(length=1000),
        db.payments().find(pay_query, {"_id": 0, "deal_id": 1}).to_list(length=1000),
        db.site_visits().find(sv_query, {"_id": 0, "id": 1}).to_list(length=1000),
        db.deals().find(deal_conv_query, {"_id": 0, "id": 1}).to_list(length=1000),
        db.leads().find(lead_conv_query, {"_id": 0, "id": 1}).to_list(length=1000),
    )

    leads_updates = max(audit_lead_updates, assigned_or_created_leads)
    leads_count = assigned_or_created_leads

    token_lead_ids = {l["id"] for l in token_leads if "id" in l}
    token_deal_ids = {d["id"] for d in token_deals if "id" in d}

    # Single bulk query for token payments instead of N+1 loop
    pay_deal_ids = list({p["deal_id"] for p in token_payments if p.get("deal_id")})
    if pay_deal_ids:
        matching_deals = await db.deals().find(
            {"id": {"$in": pay_deal_ids}, "assigned_employee": eid},
            {"_id": 0, "id": 1}
        ).to_list(length=1000)
        for md in matching_deals:
            token_deal_ids.add(md["id"])

    token_received = len(token_lead_ids) + len(token_deal_ids)
    site_visits = len(site_visits_list)

    conversion_ids = {d["id"] for d in conv_deals if "id" in d} | {l["id"] for l in conv_leads if "id" in l}
    conversions = len(conversion_ids)
    closed_won_count = conversions
    conversion_rate = round(closed_won_count / leads_updates * 100, 1) if leads_updates > 0 else 0.0

    return {
        "id": eid,
        "employee_id": emp_official_id,
        "name": name,
        "role": role_raw,
        "role_display": role_display,
        "leads": leads_count,
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
    Groups employees by team and calculates team metrics and team totals concurrently.
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

        # Calculate performance for all team members concurrently
        emp_perf_list = list(await asyncio.gather(*[
            _calculate_employee_performance(emp_rec, since_timestamp)
            for emp_rec in group_emps
        ]))
        for perf in emp_perf_list:
            perf["team_name"] = team_doc.get("name", "Team")

        emp_perf_list.sort(key=lambda x: (0 if x.get("role") == "team_lead" else 1, -(x.get("conversions_based_on_deals") or 0)))

        totals = {
            "total_employees": len(emp_perf_list),
            "leads": sum(p.get("leads", 0) for p in emp_perf_list),
            "leads_updates": sum(p.get("leads_updates", 0) for p in emp_perf_list),
            "token_received": sum(p.get("token_received", 0) for p in emp_perf_list),
            "site_visits": sum(p.get("site_visits", 0) for p in emp_perf_list),
            "conversions": sum(p.get("conversions_based_on_deals", 0) for p in emp_perf_list)
        }

        tl_name = tl_emp.get("name", "Unknown") if tl_emp else "Unknown"

        result_teams.append({
            "team_id": tid,
            "team_name": team_doc.get("name", "Team"),
            "team_leader_name": tl_name,
            "employees": emp_perf_list,
            "totals": totals
        })

    if unassigned:
        unassigned_perf = list(await asyncio.gather(*[
            _calculate_employee_performance(emp_rec, since_timestamp)
            for emp_rec in unassigned
        ]))
        for perf in unassigned_perf:
            perf["team_name"] = "Management / Direct Staff"

        unassigned_perf.sort(key=lambda x: -(x.get("conversions_based_on_deals") or 0))
        totals = {
            "total_employees": len(unassigned_perf),
            "leads": sum(p.get("leads", 0) for p in unassigned_perf),
            "leads_updates": sum(p.get("leads_updates", 0) for p in unassigned_perf),
            "token_received": sum(p.get("token_received", 0) for p in unassigned_perf),
            "site_visits": sum(p.get("site_visits", 0) for p in unassigned_perf),
            "conversions": sum(p.get("conversions_based_on_deals", 0) for p in unassigned_perf)
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
    """Fetch detailed leads, site visits, and deals concurrently for reporting."""
    emps, custs, props, leads, site_visits, deals = await asyncio.gather(
        db.employees().find({"id": {"$in": emp_ids}}, {"_id": 0, "id": 1, "employee_id": 1, "name": 1, "role": 1}).to_list(length=1000),
        db.customers().find({}, {"_id": 0, "id": 1, "name": 1}).to_list(length=5000),
        db.properties().find({}, {"_id": 0, "id": 1, "title": 1}).to_list(length=5000),
        db.leads().find({"$or": [{"assigned_to": {"$in": emp_ids}}, {"created_by": {"$in": emp_ids}}]}, {"_id": 0}).sort("created_at", -1).to_list(length=5000),
        db.site_visits().find({"$or": [{"employee_id": {"$in": emp_ids}}, {"created_by": {"$in": emp_ids}}]}, {"_id": 0}).sort("date", -1).to_list(length=2000),
        db.deals().find({"assigned_employee": {"$in": emp_ids}}, {"_id": 0}).sort("created_at", -1).to_list(length=2000),
    )

    emp_map = {e["id"]: e for e in emps}
    cust_map = {c["id"]: c.get("name", "") for c in custs}
    prop_map = {p["id"]: p.get("title", "") for p in props}

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

    site_visits_detail = []
    for sv in site_visits:
        emp_info = emp_map.get(sv.get("employee_id"), {})
        prop_titles = [prop_map.get(pid, pid) for pid in (sv.get("properties") or [])]
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
def _fmt_date(val: str) -> str:
    """Format ISO date string to readable YYYY-MM-DD, or return as-is."""
    if not val:
        return ""
    try:
        return val[:10]
    except Exception:
        return str(val)


def _apply_sheet_header(ws, headers: list, header_fill, header_font, thin_border, data_rows_start: int = 2):
    """Write headers, apply styles, freeze top row, add auto-filter."""
    ws.append(headers)
    h_row = ws.max_row
    for col_idx, _ in enumerate(headers, 1):
        c = ws.cell(row=h_row, column=col_idx)
        c.fill = header_fill
        c.font = header_font
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=False)
        c.border = thin_border
    ws.freeze_panes = ws.cell(row=h_row + 1, column=1)
    ws.auto_filter.ref = ws.dimensions


def _auto_col_widths(ws, min_w=12, max_w=40, skip_rows=None):
    """Auto-size column widths."""
    skip_rows = skip_rows or set()
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            if cell.row in skip_rows:
                continue
            try:
                val_str = str(cell.value or "")
                if len(val_str) > max_len:
                    max_len = len(val_str)
            except Exception:
                pass
        ws.column_dimensions[col_letter].width = min(max(max_len + 3, min_w), max_w)


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

    # Style palette
    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    section_fill = PatternFill(start_color="2D4A6B", end_color="2D4A6B", fill_type="solid")
    section_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    total_fill = PatternFill(start_color="E8F0FE", end_color="E8F0FE", fill_type="solid")
    total_font = Font(name="Calibri", size=10, bold=True, color="0F172A")
    title_font = Font(name="Calibri", size=16, bold=True, color="1E3A5F")
    meta_font = Font(name="Calibri", size=10, italic=True, color="475569")
    regular_font = Font(name="Calibri", size=10, color="0F172A")
    summary_header_fill = PatternFill(start_color="0F2233", end_color="0F2233", fill_type="solid")

    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    period_str = f"Since {since_timestamp[:10]} (previous report baseline)" if since_timestamp else "All available records"
    generated_on = datetime.now(timezone.utc).strftime('%d %b %Y  %H:%M UTC')

    # ── SHEET 1: Employee Performance Summary (first sheet) ──
    ws1 = wb.create_sheet(title="Employee Performance Summary")
    ws1.views.sheetView[0].showGridLines = True

    # Title
    ws1.append(["EMPLOYEE PERFORMANCE SUMMARY"])
    ws1.cell(row=1, column=1).font = Font(name="Calibri", size=13, bold=True, color="1E3A5F")
    ws1.merge_cells("A1:G1")
    ws1.append([f"Scope: {report_title}     |     {period_str}"])
    ws1.cell(row=2, column=1).font = meta_font
    ws1.merge_cells("A2:G2")
    ws1.append([])  # blank

    perf_headers = [
        "Employee ID", "Employee Name", "Role", "Team",
        "Leads Updates", "Token Received", "Site Visits", "Conversions"
    ]

    for team in team_data:
        if not isinstance(team, dict):
            continue
        # Section header row per team
        ws1.append([f"TEAM: {team.get('team_name', 'Team')}  —  Leader: {team.get('team_leader_name', 'N/A')}"])
        r_idx = ws1.max_row
        ws1.merge_cells(start_row=r_idx, start_column=1, end_row=r_idx, end_column=len(perf_headers))
        cell = ws1.cell(row=r_idx, column=1)
        cell.fill = section_fill
        cell.font = section_font
        cell.alignment = Alignment(horizontal="left", vertical="center")
        ws1.row_dimensions[r_idx].height = 18

        # Header row
        ws1.append(perf_headers)
        h_row = ws1.max_row
        for col_idx, _ in enumerate(perf_headers, 1):
            c = ws1.cell(row=h_row, column=col_idx)
            c.fill = header_fill
            c.font = header_font
            c.alignment = Alignment(horizontal="center", vertical="center")
            c.border = thin_border
        
        # Sort employees by Role, then Name (None-safe)
        emp_list = team.get("employees") or []
        sorted_emps = sorted(
            [e for e in emp_list if isinstance(e, dict)],
            key=lambda x: (
                0 if x.get("role") == "team_lead" else 1,
                str(x.get("name") or "").lower()
            )
        )

        # Data rows — matching website: Leads Updates, Token Received, Site Visits, Conversions
        for emp in sorted_emps:
            ws1.append([
                emp.get("employee_id") or emp.get("id") or "",
                emp.get("name") or "",
                emp.get("role_display") or "",
                emp.get("team_name") or "",
                emp.get("leads_updates") or emp.get("leads") or 0,
                emp.get("token_received") or 0,
                emp.get("site_visits") or 0,
                emp.get("conversions_based_on_deals") or 0
            ])
            curr = ws1.max_row
            for ci in range(1, len(perf_headers) + 1):
                c = ws1.cell(row=curr, column=ci)
                c.font = regular_font
                c.border = thin_border
                c.alignment = Alignment(horizontal="center" if ci in [5, 6, 7, 8] else "left")

        # Team Total
        t = team.get("totals") or {}
        ws1.append([
            "", f"{(team.get('team_name') or 'TEAM').upper()} TOTAL", "", "",
            t.get("leads") or 0, t.get("token_received") or 0, t.get("site_visits") or 0, t.get("conversions") or 0
        ])
        tot_row = ws1.max_row
        for ci in range(1, len(perf_headers) + 1):
            c = ws1.cell(row=tot_row, column=ci)
            c.fill = total_fill
            c.font = total_font
            c.border = thin_border
            c.alignment = Alignment(horizontal="center" if ci in [5, 6, 7, 8] else "left")

        ws1.append([])

    ws1.freeze_panes = ws1.cell(row=4, column=1)
    
    # Column widths for employee summary
    ws1.column_dimensions["A"].width = 16
    ws1.column_dimensions["B"].width = 24
    ws1.column_dimensions["C"].width = 16
    ws1.column_dimensions["D"].width = 20
    ws1.column_dimensions["E"].width = 14
    ws1.column_dimensions["F"].width = 16
    ws1.column_dimensions["G"].width = 12
    ws1.column_dimensions["H"].width = 14

    # ── SHEET 2: Team Summary (second sheet — quick overview per team) ──
    ws2 = wb.create_sheet(title="Team Summary")
    ws2.views.sheetView[0].showGridLines = True

    # Title block
    ws2.append(["VISITSARVA CRM — TEAM PERFORMANCE REPORT"])
    ws2.cell(row=1, column=1).font = title_font
    ws2.merge_cells("A1:I1")
    ws2.row_dimensions[1].height = 28

    ws2.append([f"Scope: {report_title}     |     Period: {period_str}     |     Generated: {generated_on}"])
    ws2.cell(row=2, column=1).font = meta_font
    ws2.merge_cells("A2:I2")
    ws2.append([])  # blank row

    sum_headers = ["#", "Team Name", "Team Leader", "Total Employees",
                   "Leads", "Tokens Received", "Site Visits", "Conversions", "Report Period"]
    ws2.append(sum_headers)
    h_row = ws2.max_row
    for col_idx, _ in enumerate(sum_headers, 1):
        c = ws2.cell(row=h_row, column=col_idx)
        c.fill = summary_header_fill
        c.font = header_font
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = thin_border
    ws2.freeze_panes = ws2.cell(row=h_row + 1, column=1)
    ws2.row_dimensions[h_row].height = 18

    row_num = 1
    grand = {"employees": 0, "leads": 0, "tokens": 0, "visits": 0, "conversions": 0}
    for team in team_data:
        t = team["totals"]
        row_vals = [
            row_num,
            team["team_name"],
            team["team_leader_name"],
            t["total_employees"],
            t["leads"],
            t["token_received"],
            t["site_visits"],
            t["conversions"],
            period_str,
        ]
        ws2.append(row_vals)
        curr = ws2.max_row
        for ci in range(1, len(row_vals) + 1):
            c = ws2.cell(row=curr, column=ci)
            c.font = regular_font
            c.border = thin_border
            c.alignment = Alignment(horizontal="center" if ci in [1, 4, 5, 6, 7, 8] else "left")
        grand["employees"] += t["total_employees"]
        grand["leads"] += t["leads"]
        grand["tokens"] += t["token_received"]
        grand["visits"] += t["site_visits"]
        grand["conversions"] += t["conversions"]
        row_num += 1

    # Grand total row
    ws2.append([
        "", "GRAND TOTAL", "",
        grand["employees"], grand["leads"], grand["tokens"],
        grand["visits"], grand["conversions"], ""
    ])
    gt_row = ws2.max_row
    for ci in range(1, 10):
        c = ws2.cell(row=gt_row, column=ci)
        c.fill = total_fill
        c.font = total_font
        c.border = thin_border
        c.alignment = Alignment(horizontal="center" if ci in [4, 5, 6, 7, 8] else "left")

    # Column widths for summary
    ws2.column_dimensions["A"].width = 5
    ws2.column_dimensions["B"].width = 28
    ws2.column_dimensions["C"].width = 24
    ws2.column_dimensions["D"].width = 16
    ws2.column_dimensions["E"].width = 14
    ws2.column_dimensions["F"].width = 16
    ws2.column_dimensions["G"].width = 12
    ws2.column_dimensions["H"].width = 14
    ws2.column_dimensions["I"].width = 38
    # ── SHEET 3: Detailed Lead Records (sorted by employee → date) ──
    ws3 = wb.create_sheet(title="Lead Details")
    ws3.views.sheetView[0].showGridLines = True

    ws3.append(["Detailed Lead Records"])
    ws3.cell(row=1, column=1).font = Font(name="Calibri", size=13, bold=True, color="1E3A5F")
    ws3.merge_cells("A1:J1")
    ws3.append([f"Scope: {report_title}     |     {period_str}"])
    ws3.cell(row=2, column=1).font = meta_font
    ws3.merge_cells("A2:J2")
    ws3.append([])

    l_headers = [
        "Lead ID", "Customer Name", "Source", "Lead Status",
        "Assigned Employee", "Employee ID", "Role", "Created By", "Created At", "Notes"
    ]
    _apply_sheet_header(ws3, l_headers, header_fill, header_font, thin_border)

    # Sort: by employee → date
    sorted_leads = sorted(
        leads_detail,
        key=lambda x: (
            x.get("assigned_name", "").lower(),
            x.get("created_at", "")
        )
    )

    for l in sorted_leads:
        ws3.append([
            l.get("lead_id", ""),
            l.get("customer_name", ""),
            l.get("source", "").replace("_", " ").title() if l.get("source") else "",
            l.get("status", "").replace("_", " ").title() if l.get("status") else "",
            l.get("assigned_name", ""),
            l.get("assigned_employee_id", ""),
            l.get("assigned_role", ""),
            l.get("creator_name", ""),
            _fmt_date(l.get("created_at", "")),
            l.get("notes", "")
        ])
        curr = ws3.max_row
        for ci in range(1, 11):
            ws3.cell(row=curr, column=ci).font = regular_font
            ws3.cell(row=curr, column=ci).border = thin_border

    _auto_col_widths(ws3, skip_rows={1, 2, 3})

    # ── SHEET 4: Site Visit Details (sorted by employee → date) ──
    ws4 = wb.create_sheet(title="Site Visits")
    ws4.views.sheetView[0].showGridLines = True

    ws4.append(["Site Visit Details"])
    ws4.cell(row=1, column=1).font = Font(name="Calibri", size=13, bold=True, color="1E3A5F")
    ws4.merge_cells("A1:I1")
    ws4.append([f"Scope: {report_title}     |     {period_str}"])
    ws4.cell(row=2, column=1).font = meta_font
    ws4.merge_cells("A2:I2")
    ws4.append([])

    sv_headers = [
        "Visit ID", "Customer Name", "Assigned Employee", "Employee ID",
        "Visit Date", "Visit Time", "Status", "Properties Visited", "Notes"
    ]
    _apply_sheet_header(ws4, sv_headers, header_fill, header_font, thin_border)

    # Sort: by employee → date
    sorted_sv = sorted(
        site_visits_detail,
        key=lambda x: (
            x.get("employee_name", "").lower(),
            x.get("date", "")
        )
    )

    for sv in sorted_sv:
        ws4.append([
            sv.get("visit_id", ""),
            sv.get("customer_name", ""),
            sv.get("employee_name", ""),
            sv.get("employee_official_id", ""),
            _fmt_date(sv.get("date", "")),
            sv.get("time", ""),
            sv.get("status", "").replace("_", " ").title() if sv.get("status") else "",
            ", ".join(sv.get("property_titles", [])),
            sv.get("notes", "")
        ])
        curr = ws4.max_row
        for ci in range(1, 10):
            ws4.cell(row=curr, column=ci).font = regular_font
            ws4.cell(row=curr, column=ci).border = thin_border

    _auto_col_widths(ws4, skip_rows={1, 2, 3})

    # ── SHEET 5: Deals & Conversions (sorted by employee → date) ──
    ws5 = wb.create_sheet(title="Deals & Conversions")
    ws5.views.sheetView[0].showGridLines = True

    ws5.append(["Deals & Conversions"])
    ws5.cell(row=1, column=1).font = Font(name="Calibri", size=13, bold=True, color="1E3A5F")
    ws5.merge_cells("A1:J1")
    ws5.append([f"Scope: {report_title}     |     {period_str}"])
    ws5.cell(row=2, column=1).font = meta_font
    ws5.merge_cells("A2:J2")
    ws5.append([])

    d_headers = [
        "Deal ID", "Customer Name", "Property",
        "Assigned Employee", "Employee ID",
        "Deal Status", "Deal Value (₹)", "Token Amount (₹)",
        "Expected Commission (₹)", "Registration Date"
    ]
    _apply_sheet_header(ws5, d_headers, header_fill, header_font, thin_border)

    sorted_deals = sorted(
        deals_detail,
        key=lambda x: (
            x.get("assigned_name", "").lower(),
            x.get("registration_date", "") or ""
        )
    )

    num_fmt = '#,##0'
    for d in sorted_deals:
        ws5.append([
            d.get("deal_id", ""),
            d.get("customer_name", ""),
            d.get("property_title", ""),
            d.get("assigned_name", ""),
            d.get("assigned_employee_id", ""),
            d.get("status", "").replace("_", " ").title() if d.get("status") else "",
            d.get("final_deal_value", 0) or 0,
            d.get("token_amount", 0) or 0,
            d.get("expected_commission", 0) or 0,
            _fmt_date(d.get("registration_date", ""))
        ])
        curr = ws5.max_row
        for ci in range(1, 11):
            c = ws5.cell(row=curr, column=ci)
            c.font = regular_font
            c.border = thin_border
        # Number formatting for currency columns
        for ci in [7, 8, 9]:
            ws5.cell(row=curr, column=ci).number_format = num_fmt

    _auto_col_widths(ws5, skip_rows={1, 2, 3})

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
        if not isinstance(team, dict):
            continue
        lines.append(f'"=== TEAM: {team.get("team_name", "Team")} (Leader: {team.get("team_leader_name", "N/A")}) ==="')
        lines.append(headers)

        for emp in (team.get("employees") or []):
            if not isinstance(emp, dict):
                continue
            row = (
                f'"{emp.get("team_name", "")}","{emp.get("employee_id", emp.get("id", ""))}","{emp.get("name", "")}","{emp.get("role_display", "")}",'
                f'"{emp.get("leads_updates", emp.get("leads", 0))}","{emp.get("token_received", 0)}","{emp.get("site_visits", 0)}","{emp.get("conversions_based_on_deals", 0)}"'
            )
            lines.append(row)

        tot = team.get("totals") or {}
        tot_row = (
            f'"TEAM TOTALS ({team.get("team_name", "Team")})","","Total Employees: {tot.get("total_employees", 0)}","",'
            f'"{tot.get("leads_updates", tot.get("leads", 0))}","{tot.get("token_received", 0)}","{tot.get("site_visits", 0)}","{tot.get("conversions", 0)}"'
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
# PDF Generation — Professional Team Performance Report
# ──────────────────────────────────────────────────────────
def _safe_str(value, max_len: int = 40) -> str:
    """Convert any value to a Latin-1-safe string for fpdf2 Helvetica font."""
    if value is None:
        return ""
    s = str(value)
    # Encode to latin-1, replacing unsupported characters with '?'
    s = s.encode("latin-1", errors="replace").decode("latin-1")
    return s[:max_len]


def _build_pdf_report(
    team_data: list,
    leads_detail: list,
    site_visits_detail: list,
    deals_detail: list,
    report_title: str,
    since_timestamp: Optional[str] = None
) -> bytes:
    import traceback
    import logging
    log = logging.getLogger("visitsarva")

    safe_title = _safe_str(report_title or "Report", 60)

    class PDFReport(FPDF):
        def header(self):
            if self.page_no() > 1:
                # Save current font state before setting header font
                self.set_font("Helvetica", "B", 9)
                self.set_text_color(30, 58, 95)
                self.set_y(5)
                self.cell(0, 7, f"VisitSarva  |  {safe_title}  |  Page {self.page_no()}", align="R")
                self.ln(3)
                # Reset to default body font/color so body rows on page 2+ stay normal font
                self.set_font("Helvetica", "", 9)
                self.set_text_color(0, 0, 0)

        def footer(self):
            self.set_y(-12)
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(150, 150, 150)
            self.cell(0, 8, f"Page {self.page_no()}  |  Generated by VisitSarva CRM", align="C")

    try:
        pdf = PDFReport(orientation="L", unit="mm", format="A4")
        pdf.set_auto_page_break(auto=True, margin=18)
        pdf.add_page()

        period_str = _safe_str(
            f"Since {str(since_timestamp)[:10]} (baseline)" if since_timestamp else "All available records", 60
        )
        generated_on = datetime.now(timezone.utc).strftime("%d %b %Y  %H:%M UTC")

        # ── Cover / KPI ─────────────────────────────────
        pdf.set_font("Helvetica", "B", 26)
        pdf.set_text_color(30, 58, 95)
        pdf.ln(8)
        pdf.cell(0, 14, "VISITSARVA", align="C", ln=True)
        pdf.set_font("Helvetica", "B", 17)
        pdf.cell(0, 10, "TEAM PERFORMANCE REPORT", align="C", ln=True)
        pdf.ln(4)

        pdf.set_font("Helvetica", "", 11)
        pdf.set_text_color(70, 70, 70)
        pdf.cell(0, 6, f"Scope: {safe_title}", align="C", ln=True)
        pdf.cell(0, 6, f"Period: {period_str}", align="C", ln=True)
        pdf.cell(0, 6, f"Generated: {_safe_str(generated_on)}", align="C", ln=True)
        pdf.ln(10)

        g_leads_updates = sum(((t.get("totals") or {}).get("leads") or 0) for t in (team_data or []) if isinstance(t, dict))
        g_token_received = sum(((t.get("totals") or {}).get("token_received") or 0) for t in (team_data or []) if isinstance(t, dict))
        g_visits = sum(((t.get("totals") or {}).get("site_visits") or 0) for t in (team_data or []) if isinstance(t, dict))
        g_conversions = sum(((t.get("totals") or {}).get("conversions") or 0) for t in (team_data or []) if isinstance(t, dict))

        # KPI boxes — match CRM website metrics
        kpi_labels = ["LEADS UPDATES", "TOKEN RECEIVED", "SITE VISITS", "CONVERSIONS"]
        kpi_values = [str(g_leads_updates), str(g_token_received), str(g_visits), str(g_conversions)]
        kpi_colors = [(59, 130, 246), (99, 102, 241), (245, 158, 11), (16, 185, 129)]
        box_w = 60
        gap = 8
        total_w = box_w * 4 + gap * 3
        sx = (pdf.w - total_w) / 2

        for i in range(4):
            x = sx + i * (box_w + gap)
            # Label band
            pdf.set_fill_color(*kpi_colors[i])
            pdf.set_xy(x, pdf.get_y())
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_text_color(255, 255, 255)
            pdf.cell(box_w, 9, kpi_labels[i], border=0, align="C", fill=True)
        pdf.ln(9)

        for i in range(4):
            x = sx + i * (box_w + gap)
            pdf.set_fill_color(240, 248, 255)
            pdf.set_xy(x, pdf.get_y())
            pdf.set_font("Helvetica", "B", 20)
            pdf.set_text_color(30, 58, 95)
            pdf.cell(box_w, 14, kpi_values[i], border=1, align="C", fill=True)
        pdf.ln(18)

        # ── Team Summary Table ───────────────────────────
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(30, 58, 95)
        pdf.cell(0, 8, "TEAM SUMMARY", ln=True)
        pdf.ln(2)

        t_cols = [50, 50, 24, 28, 28, 28, 28]
        t_hdrs = ["Team Name", "Team Leader", "Members", "Leads Updates", "Token Recv", "Site Visits", "Conversions"]
        pdf.set_fill_color(30, 58, 95)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 8)
        for j, h in enumerate(t_hdrs):
            pdf.cell(t_cols[j], 8, h, border=1, align="C", fill=True)
        pdf.ln()

        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(0, 0, 0)
        for t in (team_data or []):
            if not isinstance(t, dict):
                continue
            tot = t.get("totals") or {}
            vals = [
                _safe_str(t.get("team_name") or "Team", 24),
                _safe_str(t.get("team_leader_name") or "N/A", 24),
                str(tot.get("total_employees") or 0),
                str(tot.get("leads") or 0),
                str(tot.get("token_received") or 0),
                str(tot.get("site_visits") or 0),
                str(tot.get("conversions") or 0),
            ]
            aligns = ["L", "L", "C", "C", "C", "C", "C"]
            for j, v in enumerate(vals):
                pdf.cell(t_cols[j], 8, v, border=1, align=aligns[j])
            pdf.ln()

        # ── Lead Analytics Breakdown (Source & Status Funnel) ────
        pdf.ln(5)
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(30, 58, 95)
        pdf.cell(0, 8, "LEAD ANALYTICS BREAKDOWN", ln=True)
        pdf.ln(2)

        src_counts = {}
        st_counts = {}
        for l in (leads_detail or []):
            s = (l.get("source") or "Unknown").replace("_", " ").title()
            st = (l.get("status") or "Unknown").replace("_", " ").title()
            src_counts[s] = src_counts.get(s, 0) + 1
            st_counts[st] = st_counts.get(st, 0) + 1

        total_l = len(leads_detail or []) or 1

        col_w1 = 110
        gap_w = 15
        start_y = pdf.get_y()

        # Table 1: Leads by Source
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(30, 58, 95)
        pdf.cell(col_w1, 7, "Leads by Source", ln=True)
        pdf.set_fill_color(30, 58, 95)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 8)
        pdf.cell(50, 6, "Source", border=1, fill=True, align="C")
        pdf.cell(30, 6, "Count", border=1, fill=True, align="C")
        pdf.cell(30, 6, "Percentage", border=1, fill=True, align="C")
        pdf.ln()

        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(0, 0, 0)
        if not src_counts:
            pdf.cell(col_w1, 6, "No lead source data available", border=1, align="C")
            pdf.ln()
        else:
            for s_name, s_count in sorted(src_counts.items(), key=lambda x: x[1], reverse=True):
                pct = f"{(s_count / total_l) * 100:.1f}%"
                pdf.cell(50, 6, _safe_str(s_name, 24), border=1)
                pdf.cell(30, 6, str(s_count), border=1, align="C")
                pdf.cell(30, 6, pct, border=1, align="C")
                pdf.ln()

        end_y1 = pdf.get_y()

        # Table 2: Lead Status Funnel
        pdf.set_xy(10 + col_w1 + gap_w, start_y)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(30, 58, 95)
        pdf.cell(col_w1, 7, "Lead Status Funnel", ln=True)
        pdf.set_x(10 + col_w1 + gap_w)
        pdf.set_fill_color(30, 58, 95)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 8)
        pdf.cell(50, 6, "Status", border=1, fill=True, align="C")
        pdf.cell(30, 6, "Count", border=1, fill=True, align="C")
        pdf.cell(30, 6, "Percentage", border=1, fill=True, align="C")
        pdf.ln()

        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(0, 0, 0)
        if not st_counts:
            pdf.set_x(10 + col_w1 + gap_w)
            pdf.cell(col_w1, 6, "No lead status data available", border=1, align="C")
            pdf.ln()
        else:
            for st_name, st_count in sorted(st_counts.items(), key=lambda x: x[1], reverse=True):
                pdf.set_x(10 + col_w1 + gap_w)
                pct = f"{(st_count / total_l) * 100:.1f}%"
                pdf.cell(50, 6, _safe_str(st_name, 24), border=1)
                pdf.cell(30, 6, str(st_count), border=1, align="C")
                pdf.cell(30, 6, pct, border=1, align="C")
                pdf.ln()

        end_y2 = pdf.get_y()
        pdf.set_y(max(end_y1, end_y2) + 5)

        # ── Employee Performance — matches CRM website columns exactly ──
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 15)
        pdf.set_text_color(30, 58, 95)
        pdf.cell(0, 10, "EMPLOYEE PERFORMANCE SUMMARY", ln=True)
        pdf.ln(3)

        # Columns: Employee ID, Employee Name, Role, Leads Updates, Token Received, Site Visits, Conversions (Deals)
        e_cols = [32, 48, 36, 28, 28, 28, 28]
        e_hdrs = ["Emp ID", "Employee Name", "Role", "Leads Upd", "Token Recv", "Site Visits", "Conversions"]

        for team in (team_data or []):
            if not isinstance(team, dict):
                continue
            # Team header band
            pdf.set_fill_color(200, 220, 240)
            pdf.set_text_color(20, 40, 80)
            pdf.set_font("Helvetica", "B", 10)
            t_name = _safe_str(team.get("team_name") or "Team", 30)
            tl_name = _safe_str(team.get("team_leader_name") or "N/A", 30)
            label = _safe_str(f"TEAM: {t_name}  —  Leader: {tl_name}", 70)
            pdf.cell(sum(e_cols), 8, label, border=1, fill=True, ln=True)

            # Column headers
            pdf.set_fill_color(30, 58, 95)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("Helvetica", "B", 8)
            for j, h in enumerate(e_hdrs):
                pdf.cell(e_cols[j], 7, h, border=1, align="C", fill=True)
            pdf.ln()

            # Data rows — sorted: team_lead first, then alphabetical
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(0, 0, 0)
            emp_list = team.get("employees") or []
            sorted_emps = sorted(
                [e for e in emp_list if isinstance(e, dict)],
                key=lambda x: (0 if x.get("role") == "team_lead" else 1, str(x.get("name") or "").lower())
            )
            for emp in sorted_emps:
                row = [
                    _safe_str(emp.get("employee_id") or emp.get("id") or "", 16),
                    _safe_str(emp.get("name") or "", 24),
                    _safe_str(emp.get("role_display") or "", 18),
                    str(emp.get("leads_updates") or emp.get("leads") or 0),
                    str(emp.get("token_received") or 0),
                    str(emp.get("site_visits") or 0),
                    str(emp.get("conversions_based_on_deals") or 0),
                ]
                row_aligns = ["L", "L", "L", "C", "C", "C", "C"]
                for j, v in enumerate(row):
                    pdf.cell(e_cols[j], 7, v, border=1, align=row_aligns[j])
                pdf.ln()

            # Team total row
            tot = team.get("totals") or {}
            pdf.set_fill_color(232, 240, 254)
            pdf.set_font("Helvetica", "B", 8)
            pdf.cell(e_cols[0] + e_cols[1] + e_cols[2], 7, "TEAM TOTAL", border=1, fill=True, align="R")
            pdf.cell(e_cols[3], 7, str(tot.get("leads") or 0), border=1, fill=True, align="C")
            pdf.cell(e_cols[4], 7, str(tot.get("token_received") or 0), border=1, fill=True, align="C")
            pdf.cell(e_cols[5], 7, str(tot.get("site_visits") or 0), border=1, fill=True, align="C")
            pdf.cell(e_cols[6], 7, str(tot.get("conversions") or 0), border=1, fill=True, align="C")
            pdf.ln(10)

        # ── Bar Charts — matching CRM website metrics ────
        all_emps = []
        for t in (team_data or []):
            if isinstance(t, dict):
                all_emps.extend([e for e in (t.get("employees") or []) if isinstance(e, dict)])

        def _draw_bar_section(title: str, sorted_data: list, value_key: str, rgb: tuple):
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(30, 58, 95)
            pdf.cell(0, 9, _safe_str(title), ln=True)
            pdf.ln(2)
            if not sorted_data:
                pdf.set_font("Helvetica", "", 9)
                pdf.set_text_color(100, 100, 100)
                pdf.cell(0, 7, "No data available.", ln=True)
                pdf.ln(5)
                return
            top = sorted_data[:20]
            max_val = max(((e.get(value_key) or 0) for e in top), default=1) or 1
            bar_area = 180  # mm
            name_w = 52
            val_w = 18
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(30, 30, 30)
            for e in top:
                val = e.get(value_key) or 0
                bar_px = (val / max_val) * bar_area
                name = _safe_str(e.get("name") or "", 24)
                pdf.cell(name_w, 6, name, border=0)
                bx, by = pdf.get_x(), pdf.get_y()
                if bar_px > 0:
                    pdf.set_fill_color(*rgb)
                    pdf.rect(bx, by + 1, bar_px, 4, style="F")
                pdf.set_xy(bx + bar_area + 2, by)
                pdf.cell(val_w, 6, str(val), border=0, ln=True)
            pdf.ln(6)

        pdf.add_page()
        _draw_bar_section(
            "LEADS UPDATES BY EMPLOYEE",
            sorted(all_emps, key=lambda x: (x.get("leads_updates") or x.get("leads") or 0), reverse=True),
            "leads_updates", (59, 130, 246)
        )
        pdf.ln(5)
        _draw_bar_section(
            "TOKEN RECEIVED BY EMPLOYEE",
            sorted(all_emps, key=lambda x: (x.get("token_received") or 0), reverse=True),
            "token_received", (99, 102, 241)
        )

        pdf.add_page()
        _draw_bar_section(
            "SITE VISITS BY EMPLOYEE",
            sorted(all_emps, key=lambda x: (x.get("site_visits") or 0), reverse=True),
            "site_visits", (245, 158, 11)
        )
        pdf.ln(5)
        _draw_bar_section(
            "CONVERSIONS BY EMPLOYEE",
            sorted(all_emps, key=lambda x: (x.get("conversions_based_on_deals") or 0), reverse=True),
            "conversions_based_on_deals", (16, 185, 129)
        )

        # ── Detailed Lead Records ────────────────────────
        if leads_detail:
            pdf.add_page()
            pdf.set_font("Helvetica", "B", 13)
            pdf.set_text_color(30, 58, 95)
            pdf.cell(0, 9, "DETAILED LEAD RECORDS", ln=True)
            pdf.ln(2)
            l_cols = [58, 38, 38, 55, 38]
            l_hdrs = ["Customer Name", "Source", "Status", "Assigned Employee", "Created At"]
            pdf.set_fill_color(30, 58, 95)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("Helvetica", "B", 8)
            for j, h in enumerate(l_hdrs):
                pdf.cell(l_cols[j], 7, h, border=1, align="C", fill=True)
            pdf.ln()
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(0, 0, 0)
            for rec in leads_detail:
                row = [
                    _safe_str(rec.get("customer_name") or "", 28),
                    _safe_str(str(rec.get("source") or "").replace("_", " ").title(), 18),
                    _safe_str(str(rec.get("status") or "").replace("_", " ").title(), 18),
                    _safe_str(rec.get("assigned_name") or "", 26),
                    _safe_str(str(rec.get("created_at") or "")[:10], 12),
                ]
                for j, v in enumerate(row):
                    pdf.cell(l_cols[j], 6, v, border=1)
                pdf.ln()

        # ── Site Visit Details ───────────────────────────
        if site_visits_detail:
            pdf.add_page()
            pdf.set_font("Helvetica", "B", 13)
            pdf.set_text_color(30, 58, 95)
            pdf.cell(0, 9, "SITE VISIT DETAILS", ln=True)
            pdf.ln(2)
            sv_cols = [55, 55, 28, 25, 45]
            sv_hdrs = ["Customer Name", "Assigned Employee", "Date", "Time", "Status"]
            pdf.set_fill_color(30, 58, 95)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("Helvetica", "B", 8)
            for j, h in enumerate(sv_hdrs):
                pdf.cell(sv_cols[j], 7, h, border=1, align="C", fill=True)
            pdf.ln()
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(0, 0, 0)
            for rec in site_visits_detail:
                row = [
                    _safe_str(rec.get("customer_name") or "", 26),
                    _safe_str(rec.get("employee_name") or "", 26),
                    _safe_str(str(rec.get("date") or "")[:10], 12),
                    _safe_str(str(rec.get("time") or "")[:8], 8),
                    _safe_str(str(rec.get("status") or "").replace("_", " ").title(), 22),
                ]
                for j, v in enumerate(row):
                    pdf.cell(sv_cols[j], 6, v, border=1)
                pdf.ln()

        # ── Deal / Conversion Details ────────────────────
        if deals_detail:
            pdf.add_page()
            pdf.set_font("Helvetica", "B", 13)
            pdf.set_text_color(30, 58, 95)
            pdf.cell(0, 9, "DEAL & CONVERSION DETAILS", ln=True)
            pdf.ln(2)
            d_cols = [55, 55, 55, 28, 38]
            d_hdrs = ["Customer Name", "Property", "Assigned Employee", "Deal Value", "Status"]
            pdf.set_fill_color(30, 58, 95)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("Helvetica", "B", 8)
            for j, h in enumerate(d_hdrs):
                pdf.cell(d_cols[j], 7, h, border=1, align="C", fill=True)
            pdf.ln()
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(0, 0, 0)
            for rec in deals_detail:
                row = [
                    _safe_str(rec.get("customer_name") or "", 26),
                    _safe_str(rec.get("property_title") or "", 26),
                    _safe_str(rec.get("assigned_name") or "", 26),
                    _safe_str(str(rec.get("final_deal_value") or 0), 14),
                    _safe_str(str(rec.get("status") or "").replace("_", " ").title(), 18),
                ]
                for j, v in enumerate(row):
                    pdf.cell(d_cols[j], 6, v, border=1)
                pdf.ln()

        return bytes(pdf.output())

    except Exception as exc:
        tb = traceback.format_exc()
        log.error(f"PDF generation failed: {exc}\n{tb}")
        raise HTTPException(
            status_code=500,
            detail=f"PDF generation failed: {exc}\n\nTraceback:\n{tb}"
        )


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
# ──────────────────────────────────────────────────────────
# Export — All-scope or team report
# ──────────────────────────────────────────────────────────
@router.get("/export")
async def export_report(
    team_id: Optional[str] = Query(None, description="Optional team ID filter"),
    format: str = Query("xlsx", description="Report format: xlsx or csv"),
    emp: dict = Depends(get_current_employee)
):
    """
    Export Team Performance Report scoped to the authenticated user's role.
    - Founder/Admin → all employees & all teams (or specific team if team_id provided)
    - BDO → employees & teams under BDO's scope
    - Team Lead → ONLY their own team members (rejects any attempt to request another team)
    - Executive/Trainee/DPO → 403 Forbidden
    """
    role = emp["role"]

    if role in ["executive", "trainee", "dpo"]:
        raise HTTPException(
            status_code=403,
            detail="Report downloads are not permitted for your role. Contact your Team Leader or BDO."
        )

    if role == "team_lead":
        team_doc = await db.teams().find_one({"team_leader_id": emp["id"]})
        if not team_doc:
            team_id_val = emp.get("team_id")
            if team_id_val:
                team_doc = await db.teams().find_one(
                    {"$or": [{"id": team_id_val}, {"team_id": team_id_val}]}
                )

        team_uuid = team_doc["id"] if team_doc else None
        team_display_id = team_doc.get("team_id") if team_doc else None
        valid_team_ids = list(filter(None, [team_uuid, team_display_id, emp.get("team_id"), emp["id"]]))

        # Security Enforcement: Reject if Team Leader attempts to pass another team's ID
        if team_id and team_id not in valid_team_ids:
            raise HTTPException(
                status_code=403,
                detail="You are not authorised to download another team's report."
            )

        emp_ids = await _get_scoped_emp_ids(emp)
        label = team_doc.get("name", "My Team") if team_doc else "My Team"
        team_scope = team_uuid or emp.get("team_id", emp["id"])

    elif role == "bdo":
        if team_id:
            target_team = await db.teams().find_one({"$or": [{"id": team_id}, {"team_id": team_id}]})
            if not target_team:
                raise HTTPException(status_code=404, detail="Team not found")
            tl_id = target_team.get("team_leader_id")
            tl = await db.employees().find_one({"id": tl_id})
            if not tl or tl.get("reporting_manager") != emp["id"]:
                raise HTTPException(
                    status_code=403,
                    detail="You are not authorised to download this team's report."
                )
            
            members = await db.employees().find(
                {"$or": [
                    {"id": tl_id},
                    {"team_id": {"$in": list(filter(None, [target_team.get("id"), target_team.get("team_id")]))}},
                    {"reporting_manager": tl_id}
                ]},
                {"_id": 0, "id": 1}
            ).to_list(length=500)
            emp_ids = list({m["id"] for m in members})
            if tl_id and tl_id not in emp_ids:
                emp_ids.append(tl_id)
            label = f"Team {target_team.get('name', team_id)}"
            team_scope = target_team.get("id", team_id)
        else:
            emp_ids = await _get_scoped_emp_ids(emp)
            label = "BDO Scope"
            team_scope = f"bdo_{emp['id']}"

    else:  # founder, admin
        if team_id:
            target_team = await db.teams().find_one({"$or": [{"id": team_id}, {"team_id": team_id}]})
            if not target_team:
                raise HTTPException(status_code=404, detail="Team not found")
            tl_id = target_team.get("team_leader_id")
            members = await db.employees().find(
                {"$or": [
                    {"id": tl_id},
                    {"team_id": {"$in": list(filter(None, [target_team.get("id"), target_team.get("team_id")]))}},
                    {"reporting_manager": tl_id}
                ]},
                {"_id": 0, "id": 1}
            ).to_list(length=500)
            emp_ids = list({m["id"] for m in members})
            if tl_id and tl_id not in emp_ids:
                emp_ids.append(tl_id)
            label = f"Team {target_team.get('name', team_id)}"
            team_scope = target_team.get("id", team_id)
        else:
            emp_ids = await _get_scoped_emp_ids(emp)
            label = "All Teams"
            team_scope = "all"

    await _record_download(emp, "scope_report", team_scope)
    # Always fetch real-time full metrics matching the CRM website UI
    since_timestamp = None

    team_data = await _get_team_grouped_performance(emp_ids, since_timestamp)
    leads_detail, site_visits_detail, deals_detail = await _get_detailed_records(emp_ids)

    date_str = datetime.now().strftime('%Y%m%d')

    if format.lower() == "csv" or (not HAS_OPENPYXL and format.lower() == "xlsx"):
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
    elif format.lower() == "pdf":
        filename = f"VisitSarva_{label.replace(' ', '_')}_Report_{date_str}.pdf"
        pdf_bytes = _build_pdf_report(
            team_data, leads_detail, site_visits_detail, deals_detail,
            report_title=label, since_timestamp=since_timestamp
        )
        return Response(
            content=bytes(pdf_bytes),
            media_type="application/pdf",
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
# Export — Specific Team
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
    - Team Lead → allowed ONLY if team_id is their own team (otherwise 403)
    - Executive/Trainee/DPO → 403 Forbidden
    """
    role = emp["role"]

    if role in ["executive", "trainee", "dpo"]:
        raise HTTPException(
            status_code=403,
            detail="Report downloads are not permitted for your role."
        )

    if role == "team_lead":
        team_doc = await db.teams().find_one({"team_leader_id": emp["id"]})
        if not team_doc:
            team_id_val = emp.get("team_id")
            if team_id_val:
                team_doc = await db.teams().find_one(
                    {"$or": [{"id": team_id_val}, {"team_id": team_id_val}]}
                )

        team_uuid = team_doc["id"] if team_doc else None
        team_disp_id = team_doc.get("team_id") if team_doc else None
        valid_team_ids = list(filter(None, [team_uuid, team_disp_id, emp.get("team_id")]))

        if team_id not in valid_team_ids:
            raise HTTPException(
                status_code=403,
                detail="You are not authorised to download another team's report."
            )

    return await export_report(team_id=team_id, format=format, emp=emp)


# ──────────────────────────────────────────────────────────
# Upload — Executive uploads their own report data
# ──────────────────────────────────────────────────────────
EXECUTIVE_UPLOAD_COLS = {
    "customer_name", "date", "activity_type"
}

@router.post("/upload/executive")
async def upload_executive_report(
    file: UploadFile = File(...),
    emp: dict = Depends(get_current_employee)
):
    """
    Executive uploads their own report/activity data.
    Backend enforces:
    - Only executive (or trainee) can call this endpoint
    - All rows are automatically stamped with the logged-in employee's ID/team
    - Employee ID from spreadsheet is IGNORED — server determines ownership from JWT
    """
    role = emp["role"]
    if role not in ["executive", "trainee"]:
        raise HTTPException(
            status_code=403,
            detail="Only Executive or Trainee employees can upload personal report data."
        )

    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ["xlsx", "csv"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Only .xlsx and .csv files are accepted."
        )

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5 MB limit
        raise HTTPException(status_code=400, detail="File size exceeds 5 MB limit.")

    rows = []
    try:
        if ext == "xlsx":
            if not HAS_OPENPYXL:
                raise HTTPException(status_code=500, detail="Excel support unavailable on this server.")
            xwb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
            xws = xwb.active
            headers_row = next(xws.iter_rows(min_row=1, max_row=1, values_only=True), [])
            headers = [str(h).strip().lower().replace(" ", "_") if h else "" for h in headers_row]
            for row in xws.iter_rows(min_row=2, values_only=True):
                if all(v is None for v in row):
                    continue
                rows.append(dict(zip(headers, [str(v).strip() if v is not None else "" for v in row])))
        else:  # csv
            text = content.decode("utf-8", errors="replace")
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                cleaned = {k.strip().lower().replace(" ", "_"): v.strip() for k, v in row.items()}
                rows.append(cleaned)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {str(e)}")

    if not rows:
        raise HTTPException(status_code=400, detail="File is empty or contains no data rows.")

    # Validate and stamp rows — ignore any employee/team IDs in the file
    imported = []
    rejected = []

    required_cols = {"date", "activity_type"}
    actual_cols = set(rows[0].keys()) if rows else set()
    missing_cols = required_cols - actual_cols
    if missing_cols:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {', '.join(sorted(missing_cols))}. Required: date, activity_type. Optional: customer_name, notes, outcome."
        )

    for idx, row in enumerate(rows, 1):
        errors = []
        date_val = row.get("date", "").strip()
        activity = row.get("activity_type", "").strip()

        if not date_val:
            errors.append("'date' is missing")
        else:
            # Basic date validation
            try:
                datetime.strptime(date_val[:10], "%Y-%m-%d")
            except ValueError:
                try:
                    datetime.strptime(date_val[:10], "%d/%m/%Y")
                except ValueError:
                    errors.append(f"'date' value '{date_val}' is not a recognised date format (use YYYY-MM-DD)")

        if not activity:
            errors.append("'activity_type' is missing")

        if errors:
            rejected.append({"row": idx, "reasons": errors, "data": {k: v for k, v in row.items() if k in ["date", "activity_type", "customer_name"]}})
        else:
            # Stamp with server-side identity — ignore spreadsheet-supplied IDs
            imported.append({
                "row_index": idx,
                "employee_id": emp["id"],
                "employee_name": emp.get("name", ""),
                "employee_official_id": emp.get("employee_id", ""),
                "team_id": emp.get("team_id", ""),
                "date": date_val[:10],
                "activity_type": activity,
                "customer_name": row.get("customer_name", ""),
                "notes": row.get("notes", ""),
                "outcome": row.get("outcome", ""),
            })

    # Persist upload record
    upload_record = {
        "id": new_id(),
        "upload_type": "executive_self",
        "uploaded_by": emp["id"],
        "uploaded_by_name": emp.get("name", ""),
        "uploaded_by_role": emp.get("role", ""),
        "uploaded_by_official_id": emp.get("employee_id", ""),
        "team_id": emp.get("team_id", ""),
        "file_name": filename,
        "upload_date": now_iso(),
        "records_imported": len(imported),
        "records_rejected": len(rejected),
        "rejected_rows": rejected,
        "rows": imported,
    }
    await db.report_uploads().insert_one(upload_record)

    return {
        "message": "Upload processed.",
        "file_name": filename,
        "uploaded_by": emp.get("name", ""),
        "upload_date": upload_record["upload_date"],
        "records_imported": len(imported),
        "records_rejected": len(rejected),
        "rejected_rows": rejected[:20],  # Return first 20 rejections for display
    }


# ──────────────────────────────────────────────────────────
# Upload history — Executive can see own uploads
# ──────────────────────────────────────────────────────────
@router.get("/upload/executive/history")
async def get_executive_upload_history(emp: dict = Depends(get_current_employee)):
    """Return this executive's own upload history."""
    if emp["role"] not in ["executive", "trainee"]:
        raise HTTPException(status_code=403, detail="Only Executive or Trainee can view their upload history.")

    records = await db.report_uploads().find(
        {"uploaded_by": emp["id"], "upload_type": "executive_self"},
        {"_id": 0, "rows": 0, "rejected_rows": 0}
    ).sort("upload_date", -1).limit(50).to_list(length=50)
    return records


# ──────────────────────────────────────────────────────────
# Upload — Team Leader uploads team report data
# ──────────────────────────────────────────────────────────
@router.post("/upload/team")
async def upload_team_report(
    file: UploadFile = File(...),
    emp: dict = Depends(get_current_employee)
):
    """
    Team Leader uploads report data for their team.
    Backend enforces:
    - Only team_lead (or higher) can call this
    - Each employee row is validated against actual CRM team membership
    - Employee IDs from the spreadsheet are resolved and validated
    - No rows for employees outside this team are accepted
    """
    role = emp["role"]
    if role not in ["team_lead", "bdo", "founder", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only Team Leaders and above can upload team report data."
        )

    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ["xlsx", "csv"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Only .xlsx and .csv files are accepted."
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10 MB limit for team reports
        raise HTTPException(status_code=400, detail="File size exceeds 10 MB limit.")

    rows = []
    try:
        if ext == "xlsx":
            if not HAS_OPENPYXL:
                raise HTTPException(status_code=500, detail="Excel support unavailable on this server.")
            xwb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
            xws = xwb.active
            headers_row = next(xws.iter_rows(min_row=1, max_row=1, values_only=True), [])
            headers = [str(h).strip().lower().replace(" ", "_") if h else "" for h in headers_row]
            for row in xws.iter_rows(min_row=2, values_only=True):
                if all(v is None for v in row):
                    continue
                rows.append(dict(zip(headers, [str(v).strip() if v is not None else "" for v in row])))
        else:  # csv
            text = content.decode("utf-8", errors="replace")
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                cleaned = {k.strip().lower().replace(" ", "_"): v.strip() for k, v in row.items()}
                rows.append(cleaned)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {str(e)}")

    if not rows:
        raise HTTPException(status_code=400, detail="File is empty or contains no data rows.")

    required_cols = {"date", "activity_type"}
    actual_cols = set(rows[0].keys()) if rows else set()
    missing_cols = required_cols - actual_cols
    if missing_cols:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {', '.join(sorted(missing_cols))}. Required: date, activity_type. Optional: employee_name, employee_id, customer_name, notes, outcome."
        )

    # Resolve this team leader's actual team members from the DB
    from services.rbac_service import get_team_member_ids
    team_doc = await db.teams().find_one({"team_leader_id": emp["id"]})
    team_name = team_doc.get("name", "My Team") if team_doc else "My Team"
    team_id = team_doc.get("id", emp.get("team_id", "")) if team_doc else emp.get("team_id", "")

    member_ids = await get_team_member_ids(emp)
    members = await db.employees().find(
        {"id": {"$in": member_ids}},
        {"_id": 0, "id": 1, "employee_id": 1, "name": 1, "role": 1}
    ).to_list(length=500)
    # Build lookup maps for resolving employee from name or official employee_id
    name_to_member = {m["name"].lower().strip(): m for m in members}
    official_id_to_member = {m.get("employee_id", "").lower().strip(): m for m in members if m.get("employee_id")}

    imported = []
    rejected = []

    for idx, row in enumerate(rows, 1):
        errors = []
        date_val = row.get("date", "").strip()
        activity = row.get("activity_type", "").strip()
        emp_name_col = row.get("employee_name", "").strip()
        emp_id_col = row.get("employee_id", "").strip()

        # Validate date
        if not date_val:
            errors.append("'date' is missing")
        else:
            try:
                datetime.strptime(date_val[:10], "%Y-%m-%d")
            except ValueError:
                try:
                    datetime.strptime(date_val[:10], "%d/%m/%Y")
                except ValueError:
                    errors.append(f"'date' value '{date_val}' is not a recognised date format")

        if not activity:
            errors.append("'activity_type' is missing")

        # Resolve employee from spreadsheet — validate against real team membership
        resolved_member = None
        if emp_id_col:
            resolved_member = official_id_to_member.get(emp_id_col.lower())
        if not resolved_member and emp_name_col:
            resolved_member = name_to_member.get(emp_name_col.lower())

        # Default to the team leader themselves if no employee column provided
        if not emp_id_col and not emp_name_col:
            resolved_member = next((m for m in members if m["id"] == emp["id"]), None)

        if emp_id_col or emp_name_col:  # Only validate if employee was specified
            if not resolved_member:
                errors.append(
                    f"Employee '{emp_name_col or emp_id_col}' is not a member of your team. "
                    "Only employees in your team can be included."
                )
            else:
                # SECURITY: reject if somehow resolved member is not in this team's member_ids
                if resolved_member["id"] not in member_ids:
                    errors.append(
                        f"Security check failed: employee '{emp_name_col or emp_id_col}' is not in your team."
                    )

        if errors:
            rejected.append({
                "row": idx,
                "reasons": errors,
                "data": {
                    k: v for k, v in row.items()
                    if k in ["date", "activity_type", "employee_name", "employee_id", "customer_name"]
                }
            })
        else:
            member = resolved_member or {}
            imported.append({
                "row_index": idx,
                "employee_id": member.get("id", emp["id"]),
                "employee_name": member.get("name", emp.get("name", "")),
                "employee_official_id": member.get("employee_id", ""),
                "employee_role": member.get("role", ""),
                "team_id": team_id,
                "team_name": team_name,
                "date": date_val[:10],
                "activity_type": activity,
                "customer_name": row.get("customer_name", ""),
                "notes": row.get("notes", ""),
                "outcome": row.get("outcome", ""),
            })

    # Persist upload record
    upload_record = {
        "id": new_id(),
        "upload_type": "team_leader",
        "uploaded_by": emp["id"],
        "uploaded_by_name": emp.get("name", ""),
        "uploaded_by_role": emp.get("role", ""),
        "uploaded_by_official_id": emp.get("employee_id", ""),
        "team_id": team_id,
        "team_name": team_name,
        "file_name": filename,
        "upload_date": now_iso(),
        "records_imported": len(imported),
        "records_rejected": len(rejected),
        "rejected_rows": rejected,
        "rows": imported,
    }
    await db.report_uploads().insert_one(upload_record)

    return {
        "message": "Upload processed.",
        "file_name": filename,
        "uploaded_by": emp.get("name", ""),
        "team_name": team_name,
        "upload_date": upload_record["upload_date"],
        "records_imported": len(imported),
        "records_rejected": len(rejected),
        "rejected_rows": rejected[:20],
    }


# ──────────────────────────────────────────────────────────
# Upload history — Team Leader can see own team uploads
# ──────────────────────────────────────────────────────────
@router.get("/upload/team/history")
async def get_team_upload_history(emp: dict = Depends(get_current_employee)):
    """Return this team leader's team upload history."""
    if emp["role"] not in ["team_lead", "bdo", "founder", "admin"]:
        raise HTTPException(status_code=403, detail="Only Team Leaders and above can view team upload history.")

    query: dict = {"upload_type": "team_leader"}
    if emp["role"] == "team_lead":
        query["uploaded_by"] = emp["id"]

    records = await db.report_uploads().find(
        query,
        {"_id": 0, "rows": 0, "rejected_rows": 0}
    ).sort("upload_date", -1).limit(100).to_list(length=100)
    return records
