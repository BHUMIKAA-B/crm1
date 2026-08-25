"""Enquiries (buyer → property owner / VisitSarva team)."""
from fastapi import APIRouter, Depends, HTTPException
import db
import auth as auth_utils
from models import EnquiryCreate, new_id, now_iso
from routers.cms_router import push_notification
from services.email import send_email, tpl_new_enquiry, tpl_welcome
from services.whatsapp import send_whatsapp

router = APIRouter(prefix="/api", tags=["enquiries"])


@router.post("/enquiries")
async def create_enquiry(
    payload: EnquiryCreate,
    user: dict | None = Depends(auth_utils.get_current_user_optional),
):
    prop = await db.properties().find_one(
        {"id": payload.property_id, "status": "published"}, {"_id": 0}
    )
    if not prop:
        raise HTTPException(status_code=404, detail="Property not available")
    email_str = payload.email.lower() if payload.email else ""
    doc = {
        "id": new_id(),
        "property_id": payload.property_id,
        "property_title": prop.get("title"),
        "buyer_id": user["id"] if user else None,
        "name": payload.name.strip(),
        "email": email_str,
        "phone": payload.phone.strip(),
        "message": payload.message,
        "contact_preference": payload.contact_preference,
        "status": "new",
        "created_at": now_iso(),
    }
    await db.enquiries().insert_one(doc)
    await db.properties().update_one(
        {"id": payload.property_id}, {"$inc": {"enquiries": 1}}
    )
    # Notify seller
    seller_id = prop.get("listed_by")
    if seller_id:
        await push_notification(
            seller_id,
            "New enquiry",
            f'{payload.name} enquired about {prop.get("title")}',
            "/seller/enquiries",
        )
        seller = await db.users().find_one({"id": seller_id}, {"_id": 0})
        if seller:
            subject, html = tpl_new_enquiry(
                prop.get("title", ""), payload.name, payload.phone, email_str, payload.message
            )
            # Email notification
            await send_email(seller["email"], subject, html)
            # WhatsApp notification (fires if Twilio is configured)
            seller_phone = seller.get("phone", "")
            if seller_phone:
                wa_msg = (
                    f"🏠 *New Enquiry — VisitSarva*\n\n"
                    f"Property: {prop.get('title', '')}\n"
                    f"From: {payload.name}\n"
                    f"Phone: {payload.phone}\n"
                    f"Email: {email_str or '(not provided)'}\n"
                    f"Message: {payload.message or '(none)'}\n\n"
                    f"Reply to the buyer on VisitSarva → /seller/enquiries"
                )
                await send_whatsapp(seller_phone, wa_msg)
    doc.pop("_id", None)
    return doc


@router.post("/project-enquiries")
async def create_project_enquiry(
    body: dict,
    user: dict | None = Depends(auth_utils.get_current_user_optional),
):
    """Enquiry linked to a project (not an individual published property)."""
    project_id = body.get("project_id", "")
    name  = (body.get("name") or "").strip()
    phone = (body.get("phone") or "").strip()
    email = (body.get("email") or "").strip().lower()
    message = body.get("message", "")
    if not name or not phone:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="name and phone are required")

    doc = {
        "id": new_id(),
        "type": "project",
        "project_id": project_id,
        "project_title": body.get("project_title", ""),
        "project_location": body.get("project_location", ""),
        "property_id": None,
        "property_title": None,
        "buyer_id": user["id"] if user else None,
        "name": name,
        "email": email,
        "phone": phone,
        "message": message,
        "contact_preference": body.get("contact_preference", "call"),
        "status": "new",
        "created_at": now_iso(),
    }
    await db.enquiries().insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/enquiries/me")
async def my_enquiries(user: dict = Depends(auth_utils.get_current_user)):
    items = (
        await db.enquiries()
        .find({"buyer_id": user["id"]}, {"_id": 0})
        .sort([("created_at", -1)])
        .to_list(length=200)
    )
    return items
