import logging
import os
from datetime import datetime
from typing import Optional

import asyncio

import db
from models import WhatsAppJob, now_iso, new_id
from services.whatsapp import send_whatsapp

log = logging.getLogger("visitsarva.whatsapp_queue")

# Configuration
MAX_RETRIES = int(os.getenv("WHATSAPP_MAX_RETRIES", "3"))

async def enqueue_whatsapp_job(enquiry_id: str, to_phone: str, message: str, direction: str = "outbound") -> str:
    """Create a WhatsAppJob document with status 'queued' and store it in DB.
    Returns the job ID.
    """
    job_id = new_id()
    now = now_iso()
    job_doc = WhatsAppJob(
        id=job_id,
        enquiry_id=enquiry_id,
        to_phone=to_phone,
        direction=direction,
        message=message,
        twilio_sid=None,
        status="queued",
        created_at=now,
        updated_at=now,
        retry_count=0,
    ).dict()
    await db.whatsapp_jobs().insert_one(job_doc)
    log.info("[WHATSAPP] Enqueued job %s for enquiry %s", job_id, enquiry_id)
    return job_id

async def process_pending_jobs():
    """Background loop that processes queued WhatsApp jobs.
    It runs forever until the process is stopped.
    """
    while True:
        job = await db.whatsapp_jobs().find_one_and_update(
            {"status": "queued"},
            {"$set": {"status": "initiating", "updated_at": now_iso()}}
        )
        if not job:
            # No pending jobs – sleep a bit
            await asyncio.sleep(5)
            continue
        try:
            success = await send_whatsapp(job["to_phone"], job["message"])
            if success:
                # Twilio returns True if request succeeded → we don't have SID here,
                # but send_whatsapp can be extended to return the SID if needed.
                await db.whatsapp_jobs().update_one(
                    {"id": job["id"]},
                    {"$set": {"status": "sent", "updated_at": now_iso()}}
                )
                log.info("[WHATSAPP] Sent job %s", job["id"])
            else:
                # Mark as failed and allow retry
                await db.whatsapp_jobs().update_one(
                    {"id": job["id"]},
                    {"$set": {"status": "failed", "updated_at": now_iso()}, "$inc": {"retry_count": 1}}
                )
                log.warning("[WHATSAPP] Failed to send job %s", job["id"])
        except Exception as exc:
            await db.whatsapp_jobs().update_one(
                {"id": job["id"]},
                {"$set": {"status": "failed", "updated_at": now_iso()}, "$inc": {"retry_count": 1}}
            )
            log.exception("[WHATSAPP] Exception while sending job %s: %s", job["id"], exc)
        # Small pause to avoid tight loop
        await asyncio.sleep(1)
