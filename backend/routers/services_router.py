"""All-in-One Document service requests."""
from fastapi import APIRouter, Depends
import db
import auth as auth_utils
from models import ServiceRequestCreate, new_id, now_iso

router = APIRouter(prefix="/api/services", tags=["services"])


@router.post("")
async def create_request(
    payload: ServiceRequestCreate,
    user: dict | None = Depends(auth_utils.get_current_user_optional),
):
    doc = {
        "id": new_id(),
        "request_type": payload.request_type,
        "address": payload.address,
        "description": payload.description,
        "name": payload.name,
        "email": payload.email.lower(),
        "phone": payload.phone,
        "requested_by": user["id"] if user else None,
        "status": "submitted",
        "notes": "",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.service_requests().insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/my")
async def my_requests(user: dict = Depends(auth_utils.get_current_user)):
    items = (
        await db.service_requests()
        .find({"requested_by": user["id"]}, {"_id": 0})
        .sort([("created_at", -1)])
        .to_list(length=200)
    )
    return items
