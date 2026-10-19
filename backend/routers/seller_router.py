"""Seller routes: create / manage own listings."""
from fastapi import APIRouter, Depends, HTTPException
from typing import List

import db
import auth as auth_utils
from models import PropertyCreate, PropertyUpdate, new_id, now_iso

router = APIRouter(prefix="/api/seller", tags=["seller"])


def _seller(user: dict = Depends(auth_utils.require_roles("seller", "admin"))):
    return user


@router.post("/properties")
async def create_listing(payload: PropertyCreate, user: dict = Depends(_seller)):
    doc = payload.model_dump()
    doc.update(
        {
            "id": new_id(),
            "status": "pending_verification",
            "listed_by": user["id"],
            "listed_by_name": user["name"],
            "verified_by": None,
            "verification_notes": "",
            "rejection_reason": "",
            "views": 0,
            "enquiries": 0,
            "is_new": True,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
    )
    await db.properties().insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/properties")
async def my_listings(user: dict = Depends(_seller)):
    items = (
        await db.properties()
        .find({"listed_by": user["id"]}, {"_id": 0})
        .sort([("created_at", -1)])
        .to_list(length=500)
    )
    return items


@router.get("/properties/{pid}")
async def my_listing_detail(pid: str, user: dict = Depends(_seller)):
    p = await db.properties().find_one(
        {"id": pid, "listed_by": user["id"]}, {"_id": 0}
    )
    if not p:
        raise HTTPException(status_code=404, detail="Listing not found")
    return p


@router.put("/properties/{pid}")
async def update_listing(
    pid: str, payload: PropertyUpdate, user: dict = Depends(_seller)
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = now_iso()
    # Edits send listing back to pending_verification
    updates["status"] = "pending_verification"
    res = await db.properties().update_one(
        {"id": pid, "listed_by": user["id"]}, {"$set": updates}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"ok": True}


@router.delete("/properties/{pid}")
async def delete_listing(pid: str, user: dict = Depends(_seller)):
    res = await db.properties().delete_one({"id": pid, "listed_by": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"ok": True}


@router.get("/enquiries")
async def seller_enquiries(user: dict = Depends(_seller)):
    # Find all properties owned by seller, then enquiries on them
    pids = [
        p["id"]
        async for p in db.properties().find(
            {"listed_by": user["id"]}, {"id": 1, "_id": 0}
        )
    ]
    if not pids:
        return []
    items = (
        await db.enquiries()
        .find({"property_id": {"$in": pids}}, {"_id": 0})
        .sort([("created_at", -1)])
        .to_list(length=500)
    )
    return items
