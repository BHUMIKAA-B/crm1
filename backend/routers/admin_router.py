"""Admin routes — verification, CRUD, stats, reports, activity logs.

All endpoints require a valid JWT with role=admin.
"""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

import db
import auth as auth_utils
from models import VerifyDecision, RejectDecision, now_iso, new_id
from routers.cms_router import push_notification
from services.email import send_email, tpl_listing_status

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Auth guard ────────────────────────────────────────────────────────────────

def _admin(user: dict = Depends(auth_utils.require_roles("admin"))):
    return user


# ── Activity logger ───────────────────────────────────────────────────────────

async def _log(admin_id: str, action: str, detail: str = ""):
    try:
        await db.get_db()["activity_logs"].insert_one({
            "id": new_id(),
            "admin_id": admin_id,
            "action": action,
            "detail": detail,
            "created_at": now_iso(),
        })
    except Exception:
        pass


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/dashboard/stats")
async def stats(admin: dict = Depends(_admin)):
    pending          = await db.properties().count_documents({"status": "pending_verification"})
    changes_requested = await db.properties().count_documents({"status": "changes_requested"})
    published        = await db.properties().count_documents({"status": "published"})
    rejected         = await db.properties().count_documents({"status": "rejected"})
    total_props = pending + changes_requested + published + rejected

    users_total = await db.users().count_documents({})
    buyers      = await db.users().count_documents({"role": "buyer"})
    sellers     = await db.users().count_documents({"role": "seller"})

    enquiries_count = await db.enquiries().count_documents({})
    services_count  = await db.service_requests().count_documents({})
    projects_count  = await db.get_db()["projects"].count_documents({})

    # Unread admin notifications
    unread_notif = await db.notifications().count_documents({
        "user_id": admin["id"], "read": {"$ne": True}
    })

    # Today's enquiries
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()
    today_enquiries = await db.enquiries().count_documents(
        {"created_at": {"$gte": today_start}}
    )

    # Recent items (last 5 each)
    recent_users = await (
        db.users()
        .find({}, {"_id": 0, "password_hash": 0})
        .sort("created_at", -1).limit(5).to_list(5)
    )
    recent_props = await (
        db.properties()
        .find({}, {"_id": 0})
        .sort("created_at", -1).limit(5).to_list(5)
    )
    recent_enquiries = await (
        db.enquiries()
        .find({}, {"_id": 0})
        .sort("created_at", -1).limit(5).to_list(5)
    )

    return {
        "pending_listings":            pending,
        "changes_requested_listings":  changes_requested,
        "published_listings":          published,
        "rejected_listings":           rejected,
        "total_properties":            total_props,
        "users_total":           users_total,
        "buyers":                buyers,
        "sellers":               sellers,
        "enquiries":             enquiries_count,
        "today_enquiries":       today_enquiries,
        "service_requests":      services_count,
        "projects":              projects_count,
        "unread_notifications":  unread_notif,
        "recent_users":          recent_users,
        "recent_properties":     recent_props,
        "recent_enquiries":      recent_enquiries,
    }


@router.get("/dashboard/charts")
async def chart_data(_: dict = Depends(_admin)):
    """Monthly aggregates for the last 6 months."""
    now = datetime.now(timezone.utc)
    monthly = []
    for i in range(5, -1, -1):
        # Approximate month boundaries
        base = now - timedelta(days=i * 30)
        month_start = base.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month  = (month_start + timedelta(days=32)).replace(day=1)
        label       = month_start.strftime("%b")

        u = await db.users().count_documents({
            "created_at": {"$gte": month_start.isoformat(), "$lt": next_month.isoformat()}
        })
        p = await db.properties().count_documents({
            "created_at": {"$gte": month_start.isoformat(), "$lt": next_month.isoformat()}
        })
        e = await db.enquiries().count_documents({
            "created_at": {"$gte": month_start.isoformat(), "$lt": next_month.isoformat()}
        })
        monthly.append({"month": label, "users": u, "properties": p, "enquiries": e})

    return {"monthly": monthly}


# ══════════════════════════════════════════════════════════════════════════════
# USERS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/users")
async def list_users(_: dict = Depends(_admin), role: str | None = None):
    q = {}
    if role:
        q["role"] = role
    items = await (
        db.users()
        .find(q, {"_id": 0, "password_hash": 0})
        .sort("created_at", -1).to_list(length=1000)
    )
    return items


@router.put("/users/{uid}/status")
async def toggle_user_status(uid: str, body: dict, admin: dict = Depends(_admin)):
    is_active = bool(body.get("is_active", True))
    res = await db.users().update_one(
        {"id": uid}, {"$set": {"is_active": is_active, "updated_at": now_iso()}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await _log(admin["id"], f"{'Activated' if is_active else 'Deactivated'} user {uid}")
    return {"ok": True}


@router.delete("/users/{uid}")
async def delete_user(uid: str, admin: dict = Depends(_admin)):
    user = await db.users().find_one({"id": uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Cannot delete an admin account")
    await db.users().delete_one({"id": uid})
    await _log(admin["id"], f"Deleted user", user.get("email", uid))
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════════
# PROPERTIES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/properties/pending")
async def pending_queue(_: dict = Depends(_admin)):
    return await (
        db.properties()
        .find({"status": "pending_verification"}, {"_id": 0})
        .sort("created_at", 1).to_list(500)
    )


@router.get("/properties")
async def all_properties(
    _: dict = Depends(_admin),
    status: str | None = None,
    category: str | None = None,
    search: str | None = None,
):
    q: dict = {}
    if status:
        q["status"] = status
    if category:
        q["category"] = category
    if search:
        q["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"location.city": {"$regex": search, "$options": "i"}},
            {"listed_by_name": {"$regex": search, "$options": "i"}},
        ]
    return await (
        db.properties()
        .find(q, {"_id": 0})
        .sort("created_at", -1).to_list(1000)
    )


@router.put("/properties/{pid}/verify")
async def verify_property(pid: str, payload: VerifyDecision, admin: dict = Depends(_admin)):
    res = await db.properties().update_one(
        {"id": pid},
        {"$set": {
            "status": "published",
            "verified_by": admin["id"],
            "verification_notes": payload.notes or "",
            "rejection_reason": "",
            "updated_at": now_iso(),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    prop = await db.properties().find_one({"id": pid}, {"_id": 0})
    if prop:
        seller = await db.users().find_one({"id": prop.get("listed_by")}, {"_id": 0})
        if seller:
            await push_notification(
                seller["id"], "Listing published",
                f'{prop["title"]} is now live.', f"/properties/{pid}"
            )
            subject, html = tpl_listing_status(prop["title"], "published")
            await send_email(seller["email"], subject, html)
    await _log(admin["id"], "Approved property", prop.get("title", pid) if prop else pid)
    return {"ok": True, "status": "published"}


@router.put("/properties/{pid}/reject")
async def reject_property(pid: str, payload: RejectDecision, admin: dict = Depends(_admin)):
    res = await db.properties().update_one(
        {"id": pid},
        {"$set": {
            "status": "rejected",
            "verified_by": admin["id"],
            "rejection_reason": payload.reason,
            "updated_at": now_iso(),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    prop = await db.properties().find_one({"id": pid}, {"_id": 0})
    if prop:
        seller = await db.users().find_one({"id": prop.get("listed_by")}, {"_id": 0})
        if seller:
            await push_notification(
                seller["id"], "Listing needs revision",
                f'{prop["title"]} was not approved. Reason: {payload.reason}',
                "/seller/dashboard",
            )
            subject, html = tpl_listing_status(prop["title"], "rejected", payload.reason)
            await send_email(seller["email"], subject, html)
    await _log(admin["id"], "Rejected property", prop.get("title", pid) if prop else pid)
    return {"ok": True, "status": "rejected"}


@router.put("/properties/{pid}/request-changes")
async def request_changes(pid: str, body: dict, admin: dict = Depends(_admin)):
    message = body.get("message", "Please review and resubmit your listing.")
    if not message.strip():
        raise HTTPException(status_code=400, detail="A change-request message is required")
    res = await db.properties().update_one(
        {"id": pid},
        {"$set": {
            "status": "changes_requested",
            "rejection_reason": message,
            "changes_requested_at": now_iso(),
            "updated_at": now_iso(),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    prop = await db.properties().find_one({"id": pid}, {"_id": 0})
    if prop:
        seller = await db.users().find_one({"id": prop.get("listed_by")}, {"_id": 0})
        if seller:
            await push_notification(
                seller["id"], "Changes requested for your listing",
                f'Please update "{prop["title"]}": {message}',
                "/seller/dashboard",
            )
            subject, html = tpl_listing_status(prop["title"], "changes_requested", message)
            await send_email(seller["email"], subject, html)
    await _log(admin["id"], "Requested changes", prop.get("title", pid) if prop else pid)
    return {"ok": True, "status": "changes_requested"}


@router.delete("/properties/{pid}")
async def delete_property(pid: str, admin: dict = Depends(_admin)):
    prop = await db.properties().find_one({"id": pid})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    await db.properties().delete_one({"id": pid})
    await _log(admin["id"], "Deleted property", prop.get("title", pid))
    return {"ok": True}


@router.post("/properties/bulk")
async def bulk_properties(body: dict, admin: dict = Depends(_admin)):
    """Bulk approve, reject, or delete properties.
    body: { ids: [str], action: "approve" | "reject" | "delete", reason?: str }
    """
    ids    = body.get("ids", [])
    action = body.get("action")
    reason = body.get("reason", "")
    if not ids or action not in ("approve", "reject", "delete"):
        raise HTTPException(status_code=400, detail="Invalid bulk request")

    if action == "approve":
        await db.properties().update_many(
            {"id": {"$in": ids}},
            {"$set": {"status": "published", "verified_by": admin["id"], "updated_at": now_iso()}}
        )
    elif action == "reject":
        await db.properties().update_many(
            {"id": {"$in": ids}},
            {"$set": {"status": "rejected", "rejection_reason": reason, "updated_at": now_iso()}}
        )
    elif action == "delete":
        await db.properties().delete_many({"id": {"$in": ids}})

    await _log(admin["id"], f"Bulk {action} {len(ids)} properties")
    return {"ok": True, "count": len(ids)}


# ══════════════════════════════════════════════════════════════════════════════
# PROJECTS
# ══════════════════════════════════════════════════════════════════════════════

def _projects():
    return db.get_db()["projects"]


@router.get("/projects")
async def list_projects(_: dict = Depends(_admin)):
    return await _projects().find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


_PROJECT_FIELDS = {
    "title", "description", "about_builder", "project_type", "project_status",
    "construction_status", "developer_name", "developer_description",
    "project_logo", "project_banner", "gallery_images", "project_video",
    "rera_number", "approval_authority", "sector", "property_type",
    "property_category", "address", "city", "state", "country",
    "google_map_url", "latitude", "longitude",
    "starting_price", "max_price", "price_per_sqft", "price_range",
    "configuration", "available_units", "area", "possession_date",
    "launch_date", "amenities", "features", "highlights", "faqs",
    "nearby_schools", "nearby_hospitals", "nearby_metro", "nearby_airport",
    "nearby_it_parks", "nearby_shopping_mall",
    "master_plan", "floor_plans", "payment_plans", "bank_approvals",
    "legal_documents", "seo_title", "seo_description", "slug",
    "meta_keywords", "visibility_status",
    "is_featured", "is_top_rated", "is_recommended", "is_active", "status",
    # legacy
    "location", "builder", "possession", "rera_id", "image_url",
    # brochure
    "brochure_url", "brochure_data", "brochure_filename",
}


@router.post("/projects")
async def create_project(body: dict, admin: dict = Depends(_admin)):
    doc = {k: v for k, v in body.items() if k in _PROJECT_FIELDS}
    doc.update({"id": new_id(), "created_by": admin["id"], "created_at": now_iso(), "updated_at": now_iso()})
    await _projects().insert_one(doc)
    await _log(admin["id"], "Created project", doc.get("title", ""))
    return {k: v for k, v in doc.items() if k != "_id"}


@router.put("/projects/{pid}")
async def update_project(pid: str, body: dict, admin: dict = Depends(_admin)):
    allowed = _PROJECT_FIELDS
    upd = {k: v for k, v in body.items() if k in allowed}
    if not upd:
        raise HTTPException(status_code=400, detail="No valid fields")
    upd["updated_at"] = now_iso()
    res = await _projects().update_one({"id": pid}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    await _log(admin["id"], "Updated project", upd.get("title", pid))
    return {"ok": True}


@router.delete("/projects/{pid}")
async def delete_project(pid: str, admin: dict = Depends(_admin)):
    proj = await _projects().find_one({"id": pid})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    await _projects().delete_one({"id": pid})
    await _log(admin["id"], "Deleted project", proj.get("title", pid))
    return {"ok": True}


@router.post("/projects/{pid}/brochure")
async def upload_project_brochure(pid: str, body: dict, admin: dict = Depends(_admin)):
    """Store a base64-encoded PDF as the project brochure."""
    proj = await _projects().find_one({"id": pid})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    brochure_data = body.get("data", "")
    brochure_filename = body.get("filename", "brochure.pdf")
    if not brochure_data:
        raise HTTPException(status_code=400, detail="No brochure data provided")
    await _projects().update_one(
        {"id": pid},
        {"$set": {
            "brochure_data": brochure_data,
            "brochure_filename": brochure_filename,
            "brochure_url": "",
            "updated_at": now_iso(),
        }},
    )
    await _log(admin["id"], "Uploaded brochure", proj.get("title", pid))
    return {"ok": True, "filename": brochure_filename}


@router.delete("/projects/{pid}/brochure")
async def delete_project_brochure(pid: str, admin: dict = Depends(_admin)):
    """Remove the brochure from a project."""
    proj = await _projects().find_one({"id": pid})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    await _projects().update_one(
        {"id": pid},
        {"$set": {"brochure_data": "", "brochure_filename": "", "brochure_url": "", "updated_at": now_iso()}},
    )
    await _log(admin["id"], "Removed brochure", proj.get("title", pid))
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════════
# ENQUIRIES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/enquiries")
async def all_enquiries(_: dict = Depends(_admin), search: str | None = None):
    q: dict = {}
    if search:
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"property_title": {"$regex": search, "$options": "i"}},
        ]
    return await (
        db.enquiries().find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    )


@router.put("/enquiries/{eid}")
async def update_enquiry(eid: str, body: dict, admin: dict = Depends(_admin)):
    allowed = {"status", "assigned_to", "notes"}
    upd = {k: v for k, v in body.items() if k in allowed}
    if not upd:
        raise HTTPException(status_code=400, detail="No valid fields")
    upd["updated_at"] = now_iso()
    res = await db.enquiries().update_one({"id": eid}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    await _log(admin["id"], f"Updated enquiry {eid}", str(upd))
    return {"ok": True}


@router.delete("/enquiries/{eid}")
async def delete_enquiry(eid: str, admin: dict = Depends(_admin)):
    res = await db.enquiries().delete_one({"id": eid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    await _log(admin["id"], f"Deleted enquiry {eid}")
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════════
# REJECTED PROPERTIES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/properties/rejected")
async def rejected_properties(_: dict = Depends(_admin)):
    return await (
        db.properties()
        .find({"status": "rejected"}, {"_id": 0})
        .sort("updated_at", -1).to_list(1000)
    )


@router.put("/properties/{pid}/restore")
async def restore_property(pid: str, admin: dict = Depends(_admin)):
    res = await db.properties().update_one(
        {"id": pid},
        {"$set": {
            "status": "pending_verification",
            "rejection_reason": "",
            "updated_at": now_iso(),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    prop = await db.properties().find_one({"id": pid}, {"_id": 0})
    if prop:
        seller = await db.users().find_one({"id": prop.get("listed_by")}, {"_id": 0})
        if seller:
            await push_notification(
                seller["id"], "Listing resubmitted for review",
                f'{prop["title"]} has been restored to the pending queue.',
                "/seller/dashboard",
            )
    await _log(admin["id"], "Restored property to pending", prop.get("title", pid) if prop else pid)
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════════
# BROCHURE DOWNLOADS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/brochure-downloads")
async def brochure_downloads_list(_: dict = Depends(_admin)):
    return await (
        db.brochure_downloads()
        .find({}, {"_id": 0})
        .sort("downloaded_at", -1).to_list(5000)
    )


@router.get("/brochure-downloads/export")
async def brochure_downloads_export(_: dict = Depends(_admin)):
    rows = await db.brochure_downloads().find({}, {"_id": 0}).to_list(10000)
    fields = ["id", "user_name", "phone", "email", "property_name", "property_id", "downloaded_at", "ip_address"]
    return _csv_response(rows, fields, "brochure_downloads.csv")


# ══════════════════════════════════════════════════════════════════════════════
# SERVICE REQUESTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/service-requests")
async def all_services(_: dict = Depends(_admin)):
    return await (
        db.service_requests().find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    )


@router.put("/service-requests/{sid}")
async def update_service(sid: str, body: dict, _: dict = Depends(_admin)):
    allowed = {"status", "notes"}
    upd = {k: v for k, v in body.items() if k in allowed}
    if not upd:
        raise HTTPException(status_code=400, detail="No allowed fields")
    upd["updated_at"] = now_iso()
    res = await db.service_requests().update_one({"id": sid}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service request not found")
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/notifications")
async def admin_notifications(admin: dict = Depends(_admin)):
    return await (
        db.notifications()
        .find({"user_id": admin["id"]}, {"_id": 0})
        .sort("created_at", -1).to_list(200)
    )


@router.put("/notifications/{nid}/read")
async def mark_notification_read(nid: str, admin: dict = Depends(_admin)):
    await db.notifications().update_one(
        {"id": nid, "user_id": admin["id"]}, {"$set": {"read": True}}
    )
    return {"ok": True}


@router.put("/notifications/read-all")
async def mark_all_read(admin: dict = Depends(_admin)):
    await db.notifications().update_many(
        {"user_id": admin["id"]}, {"$set": {"read": True}}
    )
    return {"ok": True}


@router.delete("/notifications/{nid}")
async def delete_notification(nid: str, admin: dict = Depends(_admin)):
    await db.notifications().delete_one({"id": nid, "user_id": admin["id"]})
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════════
# REPORTS (CSV download)
# ══════════════════════════════════════════════════════════════════════════════

def _csv_response(rows: list[dict], fields: list[str], filename: str) -> StreamingResponse:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/reports/users")
async def report_users(_: dict = Depends(_admin)):
    rows = await db.users().find({}, {"_id": 0, "password_hash": 0}).to_list(10000)
    fields = ["id", "name", "email", "phone", "role", "is_active", "created_at"]
    return _csv_response(rows, fields, "users_report.csv")


@router.get("/reports/properties")
async def report_properties(_: dict = Depends(_admin)):
    rows = await db.properties().find({}, {"_id": 0}).to_list(10000)
    for r in rows:
        r["city"] = r.get("location", {}).get("city", "")
        r["area_size"] = r.get("area", {}).get("size", "")
    fields = ["id", "title", "category", "city", "price", "status", "listed_by_name", "created_at"]
    return _csv_response(rows, fields, "properties_report.csv")


@router.get("/reports/enquiries")
async def report_enquiries(_: dict = Depends(_admin)):
    rows = await db.enquiries().find({}, {"_id": 0}).to_list(10000)
    fields = ["id", "name", "email", "phone", "property_title", "message", "status", "created_at"]
    return _csv_response(rows, fields, "enquiries_report.csv")


@router.get("/reports/projects")
async def report_projects(_: dict = Depends(_admin)):
    rows = await db.get_db()["projects"].find({}, {"_id": 0}).to_list(10000)
    fields = ["id", "title", "sector", "city", "status", "builder", "possession", "is_featured", "created_at"]
    return _csv_response(rows, fields, "projects_report.csv")


# ══════════════════════════════════════════════════════════════════════════════
# ACTIVITY LOGS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/activity-logs")
async def activity_logs(limit: int = 100, _: dict = Depends(_admin)):
    logs = await (
        db.get_db()["activity_logs"]
        .find({}, {"_id": 0})
        .sort("created_at", -1).limit(limit).to_list(limit)
    )
    return logs


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN PROFILE & SETTINGS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/profile")
async def get_profile(admin: dict = Depends(_admin)):
    return {k: v for k, v in admin.items() if k not in ("password_hash",)}


@router.put("/profile")
async def update_profile(body: dict, admin: dict = Depends(_admin)):
    allowed = {"name", "phone"}
    upd = {k: v for k, v in body.items() if k in allowed and v is not None}
    if not upd:
        raise HTTPException(status_code=400, detail="No valid fields provided")
    upd["updated_at"] = now_iso()
    await db.users().update_one({"id": admin["id"]}, {"$set": upd})
    await _log(admin["id"], "Updated own profile")
    return {"ok": True}


@router.post("/change-password")
async def change_password(body: dict, admin: dict = Depends(_admin)):
    current = body.get("current_password", "")
    new_pwd = body.get("new_password", "")
    if not current or not new_pwd:
        raise HTTPException(status_code=400, detail="current_password and new_password required")
    user = await db.users().find_one({"id": admin["id"]})
    if not auth_utils.verify_password(current, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(new_pwd) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    await db.users().update_one(
        {"id": admin["id"]},
        {"$set": {"password_hash": auth_utils.hash_password(new_pwd), "updated_at": now_iso()}}
    )
    await _log(admin["id"], "Changed password")
    return {"ok": True}
