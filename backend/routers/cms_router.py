"""Hero CMS + Projects + Construction enquiry + Notifications routes."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

import db
import auth as auth_utils
from models import new_id, now_iso
from services.email import send_email, tpl_new_enquiry

router = APIRouter(prefix="/api", tags=["cms"])


# ---------------- Hero ----------------
class HeroIn(BaseModel):
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    headline: Optional[str] = None
    sub_headline: Optional[str] = None
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    accent_color: Optional[str] = None


@router.get("/hero")
async def get_hero():
    doc = await db.get_db()["site"].find_one({"key": "hero"}, {"_id": 0})
    if doc:
        doc.pop("key", None)
        return doc
    # default
    return {
        "image_url": "https://images.unsplash.com/photo-1748063578185-3d68121b11ff?w=1920&auto=format&fit=crop&q=80",
        "video_url": "",
        "headline": "Find Your Dream Property. Zero Brokerage.",
        "sub_headline": "Buy property, pay no brokerage. We connect you directly to verified sellers.",
        "cta_text": "Explore Properties",
        "cta_link": "/properties",
        "accent_color": "#78AFCF",
        "updated_at": now_iso(),
    }


@router.put("/hero")
async def update_hero(
    payload: HeroIn, _: dict = Depends(auth_utils.require_roles("admin"))
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    updates["updated_at"] = now_iso()
    updates["key"] = "hero"
    await db.get_db()["site"].update_one(
        {"key": "hero"}, {"$set": updates}, upsert=True
    )
    doc = await db.get_db()["site"].find_one({"key": "hero"}, {"_id": 0, "key": 0})
    return doc


# ---------------- Projects (builder launches) ----------------
ProjectStatus = Literal["new", "active", "completed"]
ProjectSector = Literal[
    "commercial", "residential", "plot", "agriculture",
    "apartment", "rental", "industrial", "construction_interior",
]


class ProjectIn(BaseModel):
    title: str
    description: str = ""
    sector: ProjectSector
    location: str = ""
    city: str = ""
    price_range: str = ""
    area: str = ""
    image_url: str = ""
    status: ProjectStatus = "active"
    builder: str = ""
    possession: str = ""
    rera_id: str = ""
    is_featured: bool = False


@router.get("/projects")
async def list_projects(
    type: Optional[ProjectStatus] = None,
    sector: Optional[ProjectSector] = None,
):
    q: dict = {}
    if type:
        q["status"] = type
    if sector:
        q["sector"] = sector
    items = (
        await db.get_db()["projects"]
        .find(q, {"_id": 0})
        .sort([("is_featured", -1), ("created_at", -1)])
        .to_list(length=100)
    )
    return items


@router.get("/projects/{pid}")
async def get_project(pid: str):
    p = await db.get_db()["projects"].find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


@router.post("/projects")
async def create_project(
    payload: ProjectIn, admin: dict = Depends(auth_utils.require_roles("admin"))
):
    doc = payload.model_dump()
    doc.update(
        {
            "id": new_id(),
            "created_at": now_iso(),
            "updated_at": now_iso(),
            "created_by": admin["id"],
        }
    )
    await db.get_db()["projects"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/projects/{pid}")
async def update_project(
    pid: str, payload: ProjectIn, _: dict = Depends(auth_utils.require_roles("admin"))
):
    updates = payload.model_dump()
    updates["updated_at"] = now_iso()
    res = await db.get_db()["projects"].update_one({"id": pid}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"ok": True}


@router.delete("/projects/{pid}")
async def delete_project(
    pid: str, _: dict = Depends(auth_utils.require_roles("admin"))
):
    res = await db.get_db()["projects"].delete_one({"id": pid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"ok": True}


# ---------------- Construction enquiry ----------------
ConstructionType = Literal[
    "new_construction", "renovation", "interior", "commercial_fit_out", "other"
]


class ConstructionEnquiry(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    location: str
    land_size: str = ""
    construction_type: ConstructionType = "new_construction"
    notes: str = ""


@router.post("/enquiry")
async def create_construction_enquiry(payload: ConstructionEnquiry):
    # Save as a service-request so it lands in admin's existing queue
    sr = {
        "id": new_id(),
        "request_type": "construction",
        "address": payload.location,
        "land_size": payload.land_size,
        "construction_type": payload.construction_type,
        "name": payload.name,
        "phone": payload.phone,
        "email": (payload.email or "").lower() if payload.email else "",
        "description": payload.notes,
        "requested_by": None,
        "status": "submitted",
        "notes": "",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.service_requests().insert_one(sr)
    # Fire admin notification (logs if no Resend key)
    import os
    admin_to = os.environ.get("ADMIN_NOTIFY_EMAIL", "")
    if admin_to:
        subject, html = tpl_new_enquiry(
            f"Construction enquiry · {payload.construction_type}",
            payload.name,
            payload.phone,
            payload.email or "—",
            payload.notes or f"{payload.land_size} at {payload.location}",
        )
        await send_email(admin_to, subject, html)
    sr.pop("_id", None)
    return sr


# ---------------- Free Property Valuation (lead-magnet) ----------------
class ValuationLead(BaseModel):
    name: str
    phone: str
    address: str
    property_type: Optional[str] = "residential"


@router.post("/valuation")
async def request_valuation(payload: ValuationLead):
    sr = {
        "id": new_id(),
        "request_type": "property_valuation",
        "name": payload.name,
        "phone": payload.phone,
        "email": "",
        "address": payload.address,
        "description": f"Free valuation request · {payload.property_type}",
        "requested_by": None,
        "status": "submitted",
        "notes": "Source: hero lead-magnet",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.service_requests().insert_one(sr)
    sr.pop("_id", None)
    return sr


# ---------------- Notifications ----------------
@router.get("/notifications")
async def list_notifications(user: dict = Depends(auth_utils.get_current_user)):
    items = (
        await db.notifications()
        .find({"user_id": user["id"]}, {"_id": 0})
        .sort([("created_at", -1)])
        .limit(50)
        .to_list(length=50)
    )
    return items


@router.put("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(auth_utils.get_current_user)):
    await db.notifications().update_one(
        {"id": nid, "user_id": user["id"]}, {"$set": {"is_read": True}}
    )
    return {"ok": True}


@router.put("/notifications/read-all")
async def mark_all_read(user: dict = Depends(auth_utils.get_current_user)):
    await db.notifications().update_many(
        {"user_id": user["id"], "is_read": {"$ne": True}}, {"$set": {"is_read": True}}
    )
    return {"ok": True}


async def push_notification(user_id: str, title: str, body: str, link: str = ""):
    await db.notifications().insert_one(
        {
            "id": new_id(),
            "user_id": user_id,
            "title": title,
            "body": body,
            "link": link,
            "is_read": False,
            "created_at": now_iso(),
        }
    )
