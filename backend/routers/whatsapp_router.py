from fastapi import APIRouter, Request, Response
import logging
import os

log = logging.getLogger("visitsarva.whatsapp_webhook")

router = APIRouter(prefix="/api", tags=["whatsapp"])

@router.post("/whatsapp-webhook")
async def inbound_whatsapp(request: Request) -> Response:
    """Handle incoming WhatsApp messages from Twilio.

    Twilio posts form‑encoded data containing at least the following fields:
    - ``From``: the sender phone number (e.g. ``whatsapp:+123456789``)
    - ``Body``: the message text

    For now we simply log the inbound message and respond with a polite
    acknowledgment. In a production system you could store the message in the
    database, trigger workflows, or forward it to a chat agent.
    """
    form = await request.form()
    from_number = form.get("From", "")
    body = form.get("Body", "")

    log.info("Received inbound WhatsApp from %s: %s", from_number, body)

    # Simple auto‑reply – you can customize this as needed.
    reply_text = (
        "Thank you for contacting VisitSarva. "
        "We'll get back to you shortly."
    )
    twiml = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<Response><Message>" + reply_text + "</Message></Response>"
    )
    return Response(content=twiml, media_type="application/xml")
