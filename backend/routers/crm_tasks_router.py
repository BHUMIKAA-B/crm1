"""CRM Tasks & Follow-ups router."""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import date
import db
from crm_models import TaskCreate, Task, FollowupCreate, Followup, now_iso
from services.rbac_service import get_current_employee

router = APIRouter(prefix="/api/crm/tasks", tags=["crm_tasks"])


@router.post("")
async def create_task(body: TaskCreate, emp: dict = Depends(get_current_employee)):
    assigned_to = body.assigned_to or emp["id"]
    task = Task(
        **body.model_dump(exclude={"assigned_to"}),
        assigned_to=assigned_to,
        created_by=emp["id"],
    )
    await db.tasks().insert_one(task.model_dump())
    return {"message": "Task created", "id": task.id}


@router.post("/followups")
async def create_followup(body: FollowupCreate, emp: dict = Depends(get_current_employee)):
    assigned_to = body.assigned_to or emp["id"]
    fu = Followup(
        **body.model_dump(exclude={"assigned_to"}),
        assigned_to=assigned_to,
        created_by=emp["id"],
    )
    await db.tasks().insert_one(fu.model_dump())
    return {"message": "Follow-up created", "id": fu.id}


@router.get("")
async def list_tasks(
    status: Optional[str] = None,
    overdue: Optional[bool] = None,
    emp: dict = Depends(get_current_employee),
):
    role = emp["role"]
    query: dict = {}

    if role in ["executive", "trainee"]:
        query["assigned_to"] = emp["id"]
    elif role == "team_lead":
        team = await db.employees().find(
            {"reporting_manager": emp["id"]}, {"id": 1}
        ).to_list(length=None)
        ids = [t["id"] for t in team] + [emp["id"]]
        query["assigned_to"] = {"$in": ids}

    if status:
        query["status"] = status

    today = date.today().isoformat()
    if overdue:
        query["due_date"] = {"$lt": today}
        query["status"] = {"$in": ["pending", "in_progress"]}

    cursor = db.tasks().find(query, {"_id": 0}).sort("due_date", 1).limit(200)
    tasks = await cursor.to_list(length=200)
    return tasks


@router.patch("/{task_id}/complete")
async def complete_task(task_id: str, notes: str = "", emp: dict = Depends(get_current_employee)):
    task = await db.tasks().find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["assigned_to"] != emp["id"] and emp["role"] not in ["founder", "admin", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorised")

    await db.tasks().update_one(
        {"id": task_id},
        {"$set": {"status": "completed", "notes": notes, "updated_at": now_iso()}},
    )
    return {"message": "Task completed"}
