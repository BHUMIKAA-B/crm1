"""CRM Organizational Hierarchy API — returns the full org tree for UI display."""
from fastapi import APIRouter, Depends, HTTPException
import db
from services.rbac_service import get_current_employee

router = APIRouter(prefix="/api/crm/org", tags=["crm_org"])


@router.get("/hierarchy")
async def get_org_hierarchy(emp: dict = Depends(get_current_employee)):
    """
    Returns the organizational hierarchy tree.
    Founders/Admins see the full organization.
    BDO sees their teams.
    Team Lead sees their own team.
    """
    role = emp["role"]

    # Fetch all employees without passwords
    all_emps_cursor = db.employees().find({}, {"_id": 0, "password_hash": 0})
    all_emps = await all_emps_cursor.to_list(length=500)

    # Build a lookup by id
    emp_by_id = {e["id"]: e for e in all_emps}

    # Fetch all teams
    all_teams_cursor = db.teams().find({}, {"_id": 0})
    all_teams = await all_teams_cursor.to_list(length=100)
    team_by_id = {t["id"]: t for t in all_teams}

    # Build hierarchy based on role
    if role in ["founder", "admin"]:
        # Full org tree: Founder → BDO → Team(s) → Members
        founders = [e for e in all_emps if e["role"] == "founder"]
        bdos = [e for e in all_emps if e["role"] == "bdo"]

        result = []
        for f in founders:
            f_node = {
                "id": f["id"],
                "name": f["name"],
                "email": f["email"],
                "role": "founder",
                "employee_id": f.get("employee_id"),
                "children": []
            }
            # Each BDO under this founder
            for bdo in bdos:
                if bdo.get("reporting_manager") == f["id"] or not bdo.get("reporting_manager"):
                    bdo_node = {
                        "id": bdo["id"],
                        "name": bdo["name"],
                        "email": bdo["email"],
                        "role": "bdo",
                        "employee_id": bdo.get("employee_id"),
                        "children": []
                    }
                    # Teams under this BDO (teams created by BDO or assigned TLs that report to BDO)
                    for team in all_teams:
                        tl = emp_by_id.get(team.get("team_leader_id"))
                        if not tl:
                            continue
                        if tl.get("reporting_manager") == bdo["id"]:
                            team_node = _build_team_node(team, tl, all_emps, team_by_id)
                            bdo_node["children"].append(team_node)

                    # Also include TLs that report to this BDO but may not be in a team
                    tls_covered = {c["team_leader_id"] for c in bdo_node["children"] if "team_leader_id" in c}
                    for e in all_emps:
                        if e["role"] == "team_lead" and e.get("reporting_manager") == bdo["id"] and e["id"] not in tls_covered:
                            tl_team = next((t for t in all_teams if t.get("team_leader_id") == e["id"]), None)
                            if tl_team:
                                bdo_node["children"].append(_build_team_node(tl_team, e, all_emps, team_by_id))
                            else:
                                bdo_node["children"].append({
                                    "id": e["id"],
                                    "name": e["name"],
                                    "email": e["email"],
                                    "role": "team_lead",
                                    "employee_id": e.get("employee_id"),
                                    "children": []
                                })

                    f_node["children"].append(bdo_node)
            result.append(f_node)

        # Also include unattached BDOs
        for bdo in bdos:
            if not any(bdo["id"] in [c["id"] for c in f["children"]] for f in result):
                bdo_node = {
                    "id": bdo["id"],
                    "name": bdo["name"],
                    "email": bdo["email"],
                    "role": "bdo",
                    "employee_id": bdo.get("employee_id"),
                    "children": []
                }
                if result:
                    result[0]["children"].append(bdo_node)

        return {"hierarchy": result, "viewer_role": role}

    elif role == "bdo":
        # BDO sees their teams
        bdo_node = {
            "id": emp["id"],
            "name": emp["name"],
            "email": emp["email"],
            "role": "bdo",
            "employee_id": emp.get("employee_id"),
            "children": []
        }
        for team in all_teams:
            tl = emp_by_id.get(team.get("team_leader_id"))
            if not tl:
                continue
            if tl.get("reporting_manager") == emp["id"]:
                bdo_node["children"].append(_build_team_node(team, tl, all_emps, team_by_id))

        return {"hierarchy": [bdo_node], "viewer_role": role}

    elif role == "team_lead":
        # Team Lead sees their own team
        team = await db.teams().find_one({"team_leader_id": emp["id"]})
        if not team:
            team_id_val = emp.get("team_id")
            if team_id_val:
                team = await db.teams().find_one(
                    {"$or": [{"id": team_id_val}, {"team_id": team_id_val}]}
                )

        if not team:
            return {"hierarchy": [], "viewer_role": role}

        tl_node = _build_team_node(team, emp, all_emps, team_by_id)
        return {"hierarchy": [tl_node], "viewer_role": role}

    else:
        # Executive / Trainee — only their team
        team_id = emp.get("team_id")
        if not team_id:
            return {"hierarchy": [], "viewer_role": role}

        team = await db.teams().find_one({"$or": [{"id": team_id}, {"team_id": team_id}]})
        if not team:
            return {"hierarchy": [], "viewer_role": role}

        tl = emp_by_id.get(team.get("team_leader_id"))
        node = {
            "id": team["id"],
            "team_id": team.get("team_id"),
            "name": team["name"],
            "type": "team",
            "team_leader": {
                "id": tl["id"] if tl else None,
                "name": tl["name"] if tl else "Unknown",
                "email": tl.get("email") if tl else None,
                "role": "team_lead",
            } if tl else None,
            "members": [
                {
                    "id": e["id"],
                    "name": e["name"],
                    "email": e.get("email"),
                    "role": e["role"],
                    "employee_id": e.get("employee_id"),
                }
                for e in all_emps
                if (e.get("team_id") == team["id"] or e.get("reporting_manager") == tl["id"])
                and e["id"] != (tl["id"] if tl else None)
                and e["role"] in ["executive", "trainee"]
            ]
        }
        return {"hierarchy": [node], "viewer_role": role}


def _build_team_node(team: dict, tl: dict, all_emps: list, team_by_id: dict) -> dict:
    """Build a team hierarchy node with members."""
    members = [
        {
            "id": e["id"],
            "name": e["name"],
            "email": e.get("email"),
            "role": e["role"],
            "employee_id": e.get("employee_id"),
            "status": e.get("status", "active"),
        }
        for e in all_emps
        if (e.get("team_id") == team["id"] or e.get("reporting_manager") == tl["id"])
        and e["id"] != tl["id"]
        and e["role"] in ["executive", "trainee"]
    ]
    return {
        "id": team["id"],
        "team_id": team.get("team_id"),
        "name": team["name"],
        "type": "team",
        "status": team.get("status", "active"),
        "team_leader_id": tl["id"],
        "team_leader": {
            "id": tl["id"],
            "name": tl["name"],
            "email": tl.get("email"),
            "role": "team_lead",
            "employee_id": tl.get("employee_id"),
            "status": tl.get("status", "active"),
        },
        "members": members,
        "member_count": len(members),
    }
