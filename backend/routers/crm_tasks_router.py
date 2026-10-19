"""CRM Tasks & Follow-ups router — daily goals with strict team authorization.

Security model:
  - team_lead    → can assign tasks only to their own team members; views own team's tasks
  - executive    → views/updates only tasks assigned to themselves; cannot assign to others
  - trainee      → same as executive
  - bdo          → views tasks within authorized scope
  - founder/admin → views all tasks
  - DPO          → views own tasks only

Backend enforces team membership on task creation — not trusted from frontend.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import date, datetime, timezone
import db
from crm_models import TaskCreate, Task, FollowupCreate, Followup, TaskProgressUpdate, TaskUpdate, now_iso, new_id, AuditLog
from services.rbac_service import get_current_employee, get_team_member_ids

router = APIRouter(prefix="/api/crm/tasks", tags=["crm_tasks"])


# ─────────────────────────────────────────────────
# Helper — resolve team_id for an employee
# ─────────────────────────────────────────────────
async def _resolve_team_id_for_emp(emp_dict: dict) -> Optional[str]:
    emp_id = emp_dict["id"]
    role = emp_dict.get("role")
    if role == "team_lead":
        team = await db.teams().find_one({"team_leader_id": emp_id})
        if team:
            return team.get("id")
    team_id_val = emp_dict.get("team_id")
    if team_id_val:
        team = await db.teams().find_one({"$or": [{"id": team_id_val}, {"team_id": team_id_val}]})
        if team:
            return team.get("id")
    return None


# ─────────────────────────────────────────────────
# POST / — Create task (team_lead assigns; exec/trainee self-assign only)
# ─────────────────────────────────────────────────
@router.post("")
async def create_task(body: TaskCreate, emp: dict = Depends(get_current_employee)):
    role = emp["role"]
    assigned_to = body.assigned_to or emp["id"]

    # Team leader can assign to members of their own team only
    if role == "team_lead":
        member_ids = await get_team_member_ids(emp)
        if assigned_to not in member_ids and assigned_to != emp["id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only assign tasks to members of your own team."
            )
    elif role in ["executive", "trainee"]:
        # Executives/trainees can only self-assign
        if assigned_to != emp["id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only create tasks assigned to yourself."
            )
    elif role in ["dpo"]:
        if assigned_to != emp["id"]:
            raise HTTPException(status_code=403, detail="You can only create tasks for yourself.")
    # bdo / founder / admin can assign to anyone in scope

    # Derive team_id from creator's team (not trusted from frontend)
    team_id = await _resolve_team_id_for_emp(emp)

    task = Task(
        **body.model_dump(exclude={"assigned_to"}),
        assigned_to=assigned_to,
        created_by=emp["id"],
        team_id=team_id,
        task_date=body.task_date or date.today().isoformat(),
    )
    await db.tasks().insert_one(task.model_dump())
    await db.audit_logs().insert_one(
        AuditLog(who=emp["id"], action="create_task", entity="task", entity_id=task.id).model_dump()
    )
    return {"message": "Task created", "id": task.id}


# ─────────────────────────────────────────────────
# POST /followups — Create a follow-up task
# ─────────────────────────────────────────────────
@router.post("/followups")
async def create_followup(body: FollowupCreate, emp: dict = Depends(get_current_employee)):
    role = emp["role"]
    assigned_to = body.assigned_to or emp["id"]

    if role in ["executive", "trainee", "dpo"]:
        if assigned_to != emp["id"]:
            raise HTTPException(status_code=403, detail="You can only create follow-ups for yourself.")

    if role == "team_lead":
        member_ids = await get_team_member_ids(emp)
        if assigned_to not in member_ids and assigned_to != emp["id"]:
            raise HTTPException(status_code=403, detail="You can only assign follow-ups to your own team members.")

    team_id = await _resolve_team_id_for_emp(emp)
    fu = Followup(
        **body.model_dump(exclude={"assigned_to"}),
        assigned_to=assigned_to,
        created_by=emp["id"],
        team_id=team_id,
    )
    await db.tasks().insert_one(fu.model_dump())
    return {"message": "Follow-up created", "id": fu.id}


# ─────────────────────────────────────────────────
# GET / — List tasks (scoped by role)
# ─────────────────────────────────────────────────
@router.get("")
async def list_tasks(
    status: Optional[str] = None,
    overdue: Optional[bool] = None,
    task_date: Optional[str] = None,
    assigned_to: Optional[str] = None,
    emp: dict = Depends(get_current_employee),
):
    role = emp["role"]
    query: dict = {}

    if role in ["executive", "trainee", "dpo"]:
        query["assigned_to"] = emp["id"]
    elif role == "team_lead":
        team = await db.employees().find(
            {"reporting_manager": emp["id"]}, {"id": 1}
        ).to_list(length=None)
        ids = [t["id"] for t in team] + [emp["id"]]
        query["assigned_to"] = {"$in": ids}
        # Team leader can also filter by a specific team member
        if assigned_to and assigned_to in ids:
            query["assigned_to"] = assigned_to
    elif role == "bdo":
        # BDO scope: all employees under BDO's teams
        tl_docs = await db.employees().find(
            {"reporting_manager": emp["id"], "role": "team_lead"}, {"id": 1}
        ).to_list(length=200)
        tl_ids = [t["id"] for t in tl_docs]
        all_members = await db.employees().find(
            {"$or": [{"reporting_manager": {"$in": tl_ids}}, {"id": {"$in": tl_ids}}, {"id": emp["id"]}]},
            {"id": 1}
        ).to_list(length=2000)
        scope_ids = list({m["id"] for m in all_members})
        query["assigned_to"] = {"$in": scope_ids}
    # founder / admin → no filter (see all)

    if status:
        query["status"] = status

    today = date.today().isoformat()
    if overdue:
        query["due_date"] = {"$lt": today}
        query["status"] = {"$in": ["pending", "in_progress"]}

    if task_date:
        query["task_date"] = task_date

    cursor = db.tasks().find(query, {"_id": 0}).sort("due_date", 1).limit(500)
    tasks = await cursor.to_list(length=500)

    # Enrich with creator and assignee names
    emp_ids = list({t.get("created_by") for t in tasks} | {t.get("assigned_to") for t in tasks})
    emp_ids = [e for e in emp_ids if e]
    emp_map = {}
    if emp_ids:
        emps = await db.employees().find(
            {"id": {"$in": emp_ids}}, {"_id": 0, "id": 1, "name": 1, "role": 1}
        ).to_list(length=500)
        emp_map = {e["id"]: e for e in emps}

    for t in tasks:
        creator = emp_map.get(t.get("created_by"), {})
        assignee = emp_map.get(t.get("assigned_to"), {})
        t["created_by_name"] = creator.get("name", "")
        t["assigned_to_name"] = assignee.get("name", "")
        t["assigned_to_role"] = assignee.get("role", "")

    return tasks


# ─────────────────────────────────────────────────
# GET /{task_id} — Get single task
# ─────────────────────────────────────────────────
@router.get("/{task_id}")
async def get_task(task_id: str, emp: dict = Depends(get_current_employee)):
    task = await db.tasks().find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    role = emp["role"]
    if role in ["executive", "trainee", "dpo"]:
        if task["assigned_to"] != emp["id"]:
            raise HTTPException(status_code=403, detail="Not authorised to view this task")
    elif role == "team_lead":
        member_ids = await get_team_member_ids(emp)
        if task["assigned_to"] not in member_ids and task.get("created_by") != emp["id"]:
            raise HTTPException(status_code=403, detail="Not authorised to view this task")

    return task


# ─────────────────────────────────────────────────
# PATCH /{task_id} — Update task (team_lead who created it, or founder/admin)
# ─────────────────────────────────────────────────
@router.patch("/{task_id}")
async def update_task(task_id: str, body: TaskUpdate, emp: dict = Depends(get_current_employee)):
    task = await db.tasks().find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    role = emp["role"]
    # Only the creator (team_lead) or admin/founder can update task metadata
    if role in ["executive", "trainee", "dpo"]:
        raise HTTPException(status_code=403, detail="You cannot edit task details. Contact your Team Leader.")
    if role == "team_lead" and task.get("created_by") != emp["id"]:
        raise HTTPException(status_code=403, detail="You can only edit tasks you created.")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()

    await db.tasks().update_one({"id": task_id}, {"$set": updates})
    return {"message": "Task updated"}


# ─────────────────────────────────────────────────
# PATCH /{task_id}/complete — Mark a task as completed
# ─────────────────────────────────────────────────
@router.patch("/{task_id}/complete")
async def complete_task(task_id: str, notes: str = "", emp: dict = Depends(get_current_employee)):
    task = await db.tasks().find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    role = emp["role"]
    # Only the assigned employee, their team leader, or admin/founder can complete
    if role in ["executive", "trainee", "dpo"]:
        if task["assigned_to"] != emp["id"]:
            raise HTTPException(status_code=403, detail="Not authorised to complete this task")
    elif role == "team_lead":
        member_ids = await get_team_member_ids(emp)
        if task["assigned_to"] not in member_ids and task.get("created_by") != emp["id"]:
            raise HTTPException(status_code=403, detail="Not authorised to complete this task")

    completed_at = datetime.now(timezone.utc).isoformat()
    await db.tasks().update_one(
        {"id": task_id},
        {"$set": {
            "status": "completed",
            "completion_note": notes,
            "completed_at": completed_at,
            "progress": 100,
            "updated_at": now_iso()
        }},
    )
    await db.audit_logs().insert_one(
        AuditLog(who=emp["id"], action="complete_task", entity="task", entity_id=task_id).model_dump()
    )
    return {"message": "Task completed"}


# ─────────────────────────────────────────────────
# PATCH /{task_id}/progress — Update task progress (assigned employee only)
# ─────────────────────────────────────────────────
@router.patch("/{task_id}/progress")
async def update_task_progress(task_id: str, body: TaskProgressUpdate, emp: dict = Depends(get_current_employee)):
    task = await db.tasks().find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Only the assigned employee can update their own progress
    if task["assigned_to"] != emp["id"]:
        if emp["role"] not in ["founder", "admin", "team_lead"]:
            raise HTTPException(status_code=403, detail="Only the assigned employee can update task progress")
        # team_lead scope check
        if emp["role"] == "team_lead":
            member_ids = await get_team_member_ids(emp)
            if task["assigned_to"] not in member_ids:
                raise HTTPException(status_code=403, detail="Not authorised to update this task's progress")

    new_status = "completed" if body.progress == 100 else ("in_progress" if body.progress > 0 else task["status"])
    updates = {
        "progress": body.progress,
        "status": new_status,
        "updated_at": now_iso(),
    }
    if body.note:
        updates["completion_note"] = body.note
    if body.progress == 100:
        updates["completed_at"] = datetime.now(timezone.utc).isoformat()

    await db.tasks().update_one({"id": task_id}, {"$set": updates})
    return {"message": "Progress updated", "progress": body.progress}


# ─────────────────────────────────────────────────
# GET /team/members — Get team members for task assignment dropdown (team_lead only)
# ─────────────────────────────────────────────────
@router.get("/team/members")
async def get_team_members_for_tasks(emp: dict = Depends(get_current_employee)):
    """Returns team members that the current team_lead can assign tasks to."""
    role = emp["role"]
    if role not in ["team_lead", "founder", "admin", "bdo"]:
        raise HTTPException(status_code=403, detail="Not authorised to list team members for task assignment")

    if role == "team_lead":
        member_ids = await get_team_member_ids(emp)
        members = await db.employees().find(
            {"id": {"$in": member_ids}, "status": "active"},
            {"_id": 0, "id": 1, "name": 1, "role": 1, "employee_id": 1}
        ).to_list(length=200)
    else:
        members = await db.employees().find(
            {"status": "active"},
            {"_id": 0, "id": 1, "name": 1, "role": 1, "employee_id": 1}
        ).to_list(length=500)

    return members
