"""Enquiries (buyer → property owner / VisitSarva team)."""
from fastapi import APIRouter, Depends, HTTPException
import db
import auth as auth_utils
from models.chat import ChatConversation
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
        "source": "Property Enquiry",
        "type": "property",
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
                    f"\U0001f3e0 *New Enquiry — VisitSarva*\n\n"
                    f"Property: {prop.get('title', '')}\n"
                    f"From: {payload.name}\n"
                    f"Phone: {payload.phone}\n"
                    f"Email: {email_str or '(not provided)'}\n"
                    f"Message: {payload.message or '(none)'}\n\n"
                    f"Reply to the buyer on VisitSarva → /seller/enquiries"
                )
                sent = await send_whatsapp(seller_phone, wa_msg)
                if not sent:
                    # Enqueue for retry via background worker
                    from services.whatsapp_queue import enqueue_whatsapp_job
                    await enqueue_whatsapp_job(
                        enquiry_id=doc["id"],
                        to_phone=seller_phone,
                        message=wa_msg,
                    )
        # Send WhatsApp to buyer (the person who filled the enquiry)
        buyer_phone = payload.phone.strip()
        if buyer_phone:
            buyer_msg = (
                f"🟢 *Your enquiry has been received — VisitSarva*\n\n"
                f"Property: {prop.get('title', '')}\n"
                f"From: {payload.name}\n"
                f"Phone: {payload.phone}\n"
                f"Email: {email_str or '(not provided)'}\n"
                f"Message: {payload.message or '(none)'}\n\n"
                f"We will get back to you shortly."
            )
            sent_buyer = await send_whatsapp(buyer_phone, buyer_msg)
            if not sent_buyer:
                from services.whatsapp_queue import enqueue_whatsapp_job
                await enqueue_whatsapp_job(
                    enquiry_id=doc["id"],
                    to_phone=buyer_phone,
                    message=buyer_msg,
                )
        doc.pop("_id", None)

    # ── AI Calling: queue a call job for this enquiry (fire-and-forget) ──────
    try:
        from routers.calling_router import create_and_dispatch_call_job
        import asyncio
        asyncio.ensure_future(
            create_and_dispatch_call_job(
                enquiry_id=doc["id"],
                enquiry_collection="enquiries",
                name=doc["name"],
                phone=doc["phone"],
                source="Property Enquiry",
                property_id=payload.property_id,
                property_title=prop.get("title"),
            )
        )
    except Exception as _ce:
        import logging
        logging.getLogger("visitsarva").warning(
            "[CALL-JOB ERROR] Could not queue AI call for enquiry %s: %s",
            doc["id"], _ce,
        )
    # ─────────────────────────────────────────────────────────────────────────

    # Start a native chatbot session linked to this enquiry
    convo = ChatConversation(enquiry_id=doc["id"])
    await db.chat_conversations().insert_one(convo.model_dump())
    doc["chat_session_id"] = convo.id
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
        "source": "Project Enquiry",
        "created_at": now_iso(),
    }
    await db.enquiries().insert_one(doc)
    # Create chat session linked to this project enquiry
    proj_convo = ChatConversation(enquiry_id=doc["id"])
    await db.chat_conversations().insert_one(proj_convo.model_dump())
    doc["chat_session_id"] = proj_convo.id
    doc.pop("_id", None)

    # ── AI Calling: queue a call job for this project enquiry ─────────────────
    try:
        from routers.calling_router import create_and_dispatch_call_job
        import asyncio
        asyncio.ensure_future(
            create_and_dispatch_call_job(
                enquiry_id=doc["id"],
                enquiry_collection="enquiries",
                name=name,
                phone=phone,
                source="Project Enquiry",
                property_id=project_id,
                property_title=body.get("project_title", ""),
            )
        )
    except Exception as _ce:
        import logging
        logging.getLogger("visitsarva").warning(
            "[CALL-JOB ERROR] Could not queue AI call for project enquiry %s: %s",
            doc["id"], _ce,
        )
    # ─────────────────────────────────────────────────────────────────────────

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
