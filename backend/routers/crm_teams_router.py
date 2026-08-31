from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import db
from crm_models import Team, TeamCreate, now_iso, new_id, AuditLog
from services.rbac_service import get_current_employee, get_team_member_ids

router = APIRouter(prefix="/api/crm/teams", tags=["crm_teams"])


@router.post("")
async def create_team(body: TeamCreate, emp: dict = Depends(get_current_employee)):
    creator_role = emp["role"]
    if creator_role not in ["founder", "admin", "bdo"]:
        raise HTTPException(
            status_code=403,
            detail="Only Founder, Admin, and BDO can create teams."
        )

    # Verify team leader exists
    leader = await db.employees().find_one({"id": body.team_leader_id})
    if not leader:
        raise HTTPException(status_code=404, detail="Team leader employee not found.")

    count = await db.teams().count_documents({})
    team_display_id = f"VS-TEAM-{(count + 1):06d}"

    team = Team(
        team_id=team_display_id,
        name=body.name.strip(),
        team_leader_id=body.team_leader_id,
        status="active",
        created_by=emp["id"],
        created_at=now_iso(),
        updated_at=now_iso(),
    )

    doc = team.model_dump()
    await db.teams().insert_one(doc)

    # Assign team_id to the team leader
    await db.employees().update_one(
        {"id": body.team_leader_id},
        {"$set": {"team_id": team.id, "role": "team_lead", "updated_at": now_iso()}}
    )

    # Audit log
    audit = AuditLog(
        who=emp["id"],
        action="create_team",
        entity="team",
        entity_id=team.id,
    )
    await db.audit_logs().insert_one(audit.model_dump())

    return {
        "message": f"Team '{team.name}' created successfully",
        "id": team.id,
        "team_id": team_display_id,
    }


@router.get("")
async def list_teams(emp: dict = Depends(get_current_employee)):
    role = emp["role"]
    query = {}

    if role == "team_lead":
        emp_team_id = emp.get("team_id")
        query = {"$or": [{"team_leader_id": emp["id"]}, {"id": emp_team_id}]}
    elif role in ["executive", "trainee", "dpo"]:
        emp_team_id = emp.get("team_id")
        if emp_team_id:
            query = {"id": emp_team_id}
        else:
            return []

    cursor = db.teams().find(query, {"_id": 0}).sort("created_at", -1)
    teams_list = await cursor.to_list(length=100)

    # Enrich each team with leader details & member count
    for t in teams_list:
        leader = await db.employees().find_one({"id": t["team_leader_id"]}, {"_id": 0, "name": 1, "email": 1, "phone": 1})
        t["team_leader"] = leader
        member_count = await db.employees().count_documents({
            "$or": [{"team_id": t["id"]}, {"reporting_manager": t["team_leader_id"]}]
        })
        t["member_count"] = member_count

    return teams_list


@router.get("/{team_id}")
async def get_team(team_id: str, emp: dict = Depends(get_current_employee)):
    role = emp["role"]
    team = await db.teams().find_one(
        {"$or": [{"id": team_id}, {"team_id": team_id}]},
        {"_id": 0}
    )
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Scoping check
    if role == "team_lead" and team["team_leader_id"] != emp["id"] and team["id"] != emp.get("team_id"):
        raise HTTPException(status_code=403, detail="Not authorized to view this team")
    elif role in ["executive", "trainee"] and team["id"] != emp.get("team_id"):
        raise HTTPException(status_code=403, detail="Not authorized to view this team")

    # Fetch leader & members
    leader = await db.employees().find_one({"id": team["team_leader_id"]}, {"_id": 0, "password_hash": 0})
    members_cursor = db.employees().find(
        {"$or": [{"team_id": team["id"]}, {"reporting_manager": team["team_leader_id"]}]},
        {"_id": 0, "password_hash": 0}
    )
    members = await members_cursor.to_list(length=100)

    team["team_leader"] = leader
    team["members"] = members
    return team


@router.patch("/{team_id}")
async def update_team(team_id: str, body: dict, emp: dict = Depends(get_current_employee)):
    if emp["role"] not in ["founder", "admin", "bdo"]:
        raise HTTPException(status_code=403, detail="Only Founder, Admin, and BDO can modify teams.")

    team = await db.teams().find_one({"$or": [{"id": team_id}, {"team_id": team_id}]})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    upd = {"updated_at": now_iso()}
    if "name" in body and body["name"].strip():
        upd["name"] = body["name"].strip()
    if "status" in body and body["status"] in ["active", "inactive"]:
        upd["status"] = body["status"]
    if "team_leader_id" in body and body["team_leader_id"]:
        new_leader_id = body["team_leader_id"]
        leader = await db.employees().find_one({"id": new_leader_id})
        if not leader:
            raise HTTPException(status_code=404, detail="New team leader employee not found.")
        upd["team_leader_id"] = new_leader_id
        await db.employees().update_one({"id": new_leader_id}, {"$set": {"team_id": team["id"], "role": "team_lead"}})

    await db.teams().update_one({"id": team["id"]}, {"$set": upd})

    # Audit log
    audit = AuditLog(
        who=emp["id"],
        action="update_team",
        entity="team",
        entity_id=team["id"],
    )
    await db.audit_logs().insert_one(audit.model_dump())

    return {"message": "Team updated successfully"}
