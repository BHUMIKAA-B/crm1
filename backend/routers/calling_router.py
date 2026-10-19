"""
VisitSarva AI Calling Router
=============================
Endpoints:
  POST /api/calling/jobs                  — Internal: create a calling job (called after enquiry is saved)
  GET  /api/calling/jobs                  — CRM: list call jobs
  GET  /api/calling/jobs/{job_id}         — CRM: get call job detail
  POST /api/calling/jobs/{job_id}/retry   — CRM: retry a failed call
  POST /api/calling/jobs/{job_id}/cancel  — CRM: cancel a queued call
  POST /api/calling/opt-out               — Public: record opt-out
  GET  /api/calling/settings              — CRM: get calling settings
  PATCH /api/calling/settings             — CRM: update calling settings

  GET  /api/calling/twiml/{job_id}        — Twilio: get opening TwiML
  POST /api/calling/gather/{job_id}       — Twilio: process gathered speech turn
  POST /api/calling/webhook/status/{job_id} — Twilio: call status callback

  GET  /api/admin/ai-calls                — Admin: list all AI calls
  GET  /api/admin/ai-calls/stats          — Admin: get stats
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel

import db
from crm_models import now_iso, new_id
from services.rbac_service import get_current_employee, require_employee_roles
import auth as auth_utils
from services.telephony import (
    is_calling_enabled,
    is_twilio_configured,
    initiate_call,
    normalise_phone,
    check_calling_eligibility,
    build_opening_twiml,
    build_question_twiml,
    build_hangup_twiml,
    build_voicemail_twiml,
    verify_twilio_signature,
)
from services.ai_calling import (
    categorise_enquiry,
    get_unanswered_questions,
    build_opening_message,
    build_closing_message,
    generate_agent_response,
    generate_lead_summary,
    BUSY_ACKNOWLEDGEMENT,
    HUMAN_REQUEST_ACKNOWLEDGEMENT,
    OPT_OUT_ACKNOWLEDGEMENT,
)

log = logging.getLogger("visitsarva.calling_router")

router = APIRouter(tags=["ai_calling"])

# ─── Call Job Status constants ────────────────────────────────────────────────

STATUS_QUEUED = "queued"
STATUS_INITIATING = "initiating"
STATUS_RINGING = "ringing"
STATUS_ANSWERED = "answered"
STATUS_COMPLETED = "completed"
STATUS_NO_ANSWER = "no_answer"
STATUS_BUSY = "busy"
STATUS_FAILED = "failed"
STATUS_CANCELLED = "cancelled"
STATUS_RETRY_SCHEDULED = "retry_scheduled"

MAX_RETRIES = int(os.environ.get("CALLING_MAX_RETRIES", "3"))


# ─── DB collection helpers ────────────────────────────────────────────────────

def call_jobs():
    return db.get_db()["call_jobs"]


def call_sessions():
    """Stores per-call conversation state."""
    return db.get_db()["call_sessions"]


def opt_outs():
    return db.get_db()["calling_opt_outs"]


def calling_settings_col():
    return db.get_db()["calling_settings"]


# ─── Calling settings helper ──────────────────────────────────────────────────

async def get_calling_settings() -> dict:
    doc = await calling_settings_col().find_one({}, {"_id": 0})
    if not doc:
        return {
            "calling_enabled": is_calling_enabled(),
            "calling_hour_start": int(os.environ.get("CALLING_HOUR_START", "9")),
            "calling_hour_end": int(os.environ.get("CALLING_HOUR_END", "21")),
            "max_retries": MAX_RETRIES,
            "retry_interval_minutes": 60,
            "auto_call_on_enquiry": True,
        }
    return doc


# ─── Opt-out helper ────────────────────────────────────────────────────────────

async def get_opted_out_phones() -> list[str]:
    cursor = opt_outs().find({}, {"_id": 0, "phone": 1})
    docs = await cursor.to_list(length=10000)
    return [d["phone"] for d in docs if d.get("phone")]


# ─── Job creation helper (called internally after enquiry save) ───────────────

async def create_call_job(
    enquiry_id: str,
    enquiry_collection: str,
    name: str,
    phone: str,
    source: str = "enquiry",
    property_id: Optional[str] = None,
    property_title: Optional[str] = None,
) -> Optional[dict]:
    """
    Create a call job for an enquiry. Idempotent — uses enquiry_id as dedup key.
    Returns the job document or None if calling is disabled / number ineligible.
    """
    settings = await get_calling_settings()
    if not settings.get("auto_call_on_enquiry", True):
        return None

    # Dedup: don't create duplicate jobs for the same enquiry
    existing = await call_jobs().find_one(
        {"enquiry_id": enquiry_id, "status": {"$nin": [STATUS_FAILED, STATUS_CANCELLED]}},
        {"_id": 0, "id": 1},
    )
    if existing:
        log.info("Call job already exists for enquiry %s", enquiry_id)
        return existing

    normalised = normalise_phone(phone)
    if not normalised:
        log.warning("Cannot normalise phone for enquiry %s: %s", enquiry_id, phone)
        return None

    # Check opt-out
    opted_out = await get_opted_out_phones()
    if normalised in opted_out:
        log.info("Phone %s has opted out — not creating call job", normalised)
        return None

    job_doc = {
        "id": new_id(),
        "enquiry_id": enquiry_id,
        "enquiry_collection": enquiry_collection,  # "enquiries" or "loan_enquiries"
        "name": name,
        "phone": normalised,
        "phone_raw": phone,
        "source": source,
        "property_id": property_id,
        "property_title": property_title,
        "status": STATUS_QUEUED,
        "attempt_count": 0,
        "max_retries": settings.get("max_retries", MAX_RETRIES),
        "call_sid": None,
        "call_outcome": None,
        "conversation_summary": None,
        "collected_answers": {},
        "questions_asked": [],
        "human_callback_requested": False,
        "opt_out_recorded": False,
        "category": None,
        "next_action": None,
        "error": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "last_attempt_at": None,
        "completed_at": None,
    }
    await call_jobs().insert_one(job_doc)
    job_doc.pop("_id", None)
    log.info(
        "[CALL-JOB CREATED] job=%s enquiry=%s phone=%s source=%s",
        job_doc["id"], enquiry_id, normalised, source,
    )
    return job_doc


async def create_and_dispatch_call_job(
    enquiry_id: str,
    enquiry_collection: str,
    name: str,
    phone: str,
    source: str = "enquiry",
    property_id: Optional[str] = None,
    property_title: Optional[str] = None,
) -> Optional[dict]:
    """
    Create a call job and immediately dispatch it for processing.
    This is the correct entry-point to call from enquiry handlers.
    create_call_job only creates the DB record — this function also
    triggers the outbound-call initiation so Twilio actually rings.
    """
    job = await create_call_job(
        enquiry_id=enquiry_id,
        enquiry_collection=enquiry_collection,
        name=name,
        phone=phone,
        source=source,
        property_id=property_id,
        property_title=property_title,
    )
    if job is None:
        log.info(
            "[CALL-JOB SKIPPED] enquiry=%s — job creation returned None "
            "(calling disabled, ineligible phone, or duplicate)",
            enquiry_id,
        )
        return None

    job_id = job["id"]
    log.info("[CALL-JOB DISPATCHING] job=%s enquiry=%s", job_id, enquiry_id)
    try:
        # Use create_task so the coroutine is scheduled on the running loop
        # and survives until it completes even if the HTTP response has been sent.
        asyncio.ensure_future(process_call_job(job_id))
        log.info("[CALL-JOB QUEUED] job=%s scheduled for processing", job_id)
    except RuntimeError:
        # No running event loop (rare in test contexts) — run synchronously
        log.warning(
            "[CALL-JOB FALLBACK] No running event loop for job=%s — attempting direct call",
            job_id,
        )
        await process_call_job(job_id)
    return job


# ─── Background call processor ────────────────────────────────────────────────

async def process_call_job(job_id: str):
    """Background task: initiate the outbound call for a queued job."""
    job = await call_jobs().find_one({"id": job_id}, {"_id": 0})
    if not job:
        log.error("[CALL-PROCESS] job=%s NOT FOUND in database", job_id)
        return

    if job["status"] not in (STATUS_QUEUED, STATUS_RETRY_SCHEDULED):
        log.info(
            "[CALL-PROCESS] job=%s already in status=%s — skipping (no duplicate processing)",
            job_id, job["status"],
        )
        return

    # Check eligibility before initiating
    opted_out = await get_opted_out_phones()
    eligible, reason = await check_calling_eligibility(job["phone"], opted_out)
    if not eligible:
        log.warning(
            "[CALL-PROCESS] job=%s INELIGIBLE: %s (phone=%s)",
            job_id, reason, job["phone"],
        )
        await call_jobs().update_one(
            {"id": job_id},
            {"$set": {"status": STATUS_FAILED, "error": reason, "updated_at": now_iso()}},
        )
        return

    # Update status to initiating
    attempt = job["attempt_count"] + 1
    await call_jobs().update_one(
        {"id": job_id},
        {"$set": {
            "status": STATUS_INITIATING,
            "attempt_count": attempt,
            "last_attempt_at": now_iso(),
            "updated_at": now_iso(),
        }},
    )
    log.info(
        "[CALL-PROCESS] job=%s INITIATING attempt=%d phone=%s",
        job_id, attempt, job["phone"],
    )

    # Determine enquiry category
    enquiry_col = job.get("enquiry_collection", "enquiries")
    enquiry = await db.get_db()[enquiry_col].find_one({"id": job["enquiry_id"]}, {"_id": 0})
    if not enquiry:
        log.error(
            "[CALL-PROCESS] job=%s FAILED: linked enquiry %s not found in collection %s",
            job_id, job["enquiry_id"], enquiry_col,
        )
        await call_jobs().update_one(
            {"id": job_id},
            {"$set": {"status": STATUS_FAILED, "error": "Enquiry not found", "updated_at": now_iso()}},
        )
        return

    category = categorise_enquiry(enquiry)
    await call_jobs().update_one({"id": job_id}, {"$set": {"category": category}})

    # Initiate the call via Twilio
    result = await initiate_call(job_id, job["phone"], job["enquiry_id"])

    if result["success"]:
        log.info(
            "[CALL-PROCESS] job=%s PROVIDER ACCEPTED: call_sid=%s phone=%s",
            job_id, result["call_sid"], job["phone"],
        )
        await call_jobs().update_one(
            {"id": job_id},
            {"$set": {
                "status": STATUS_RINGING,
                "call_sid": result["call_sid"],
                "updated_at": now_iso(),
            }},
        )
    else:
        error = result.get("error", "Unknown error")
        next_status = STATUS_FAILED
        if attempt < job.get("max_retries", MAX_RETRIES):
            next_status = STATUS_RETRY_SCHEDULED
        log.error(
            "[CALL-PROCESS] job=%s PROVIDER REJECTED (attempt=%d next_status=%s): %s",
            job_id, attempt, next_status, error,
        )
        await call_jobs().update_one(
            {"id": job_id},
            {"$set": {
                "status": next_status,
                "error": error,
                "updated_at": now_iso(),
            }},
        )


# ─── Enquiry update helper ────────────────────────────────────────────────────

async def update_enquiry_with_call_result(job: dict):
    """Push call results back to the original enquiry record and CRM."""
    enquiry_id = job.get("enquiry_id")
    enquiry_col = job.get("enquiry_collection", "enquiries")
    if not enquiry_id:
        return

    call_update = {
        "ai_call_job_id": job["id"],
        "ai_call_status": job.get("status"),
        "ai_call_outcome": job.get("call_outcome"),
        "ai_collected_answers": job.get("collected_answers", {}),
        "ai_conversation_summary": job.get("conversation_summary"),
        "ai_next_action": job.get("next_action"),
        "ai_human_callback_requested": job.get("human_callback_requested", False),
        "ai_opt_out": job.get("opt_out_recorded", False),
        "ai_call_attempts": job.get("attempt_count", 0),
        "ai_call_completed_at": job.get("completed_at"),
        "updated_at": now_iso(),
    }

    # Update enquiry / loan_enquiry record
    await db.get_db()[enquiry_col].update_one(
        {"id": enquiry_id},
        {"$set": call_update},
    )

    # If there's a linked CRM lead, update it too
    cust = await db.customers().find_one({
        "$or": [
            {"phone": job.get("phone")},
            {"phone": job.get("phone_raw")},
        ]
    }, {"_id": 0, "id": 1})

    if cust:
        # Find active lead for this customer
        lead = await db.leads().find_one(
            {"customer_id": cust["id"], "status": {"$nin": ["closed_won", "closed_lost"]}},
            {"_id": 0, "id": 1},
        )
        if lead:
            await db.leads().update_one(
                {"id": lead["id"]},
                {"$set": {
                    "ai_call_summary": job.get("conversation_summary"),
                    "ai_call_answers": job.get("collected_answers", {}),
                    "ai_call_status": job.get("status"),
                    "updated_at": now_iso(),
                }},
            )

    log.info("Updated enquiry %s with call result from job %s", enquiry_id, job["id"])


# ─── TwiML endpoints (called by Twilio) ───────────────────────────────────────

@router.get("/api/calling/twiml/{job_id}")
async def get_opening_twiml(job_id: str, request: Request):
    """
    Twilio fetches this URL when the lead answers.
    Returns TwiML that plays the opening message and listens for speech.
    """
    job = await call_jobs().find_one({"id": job_id}, {"_id": 0})
    if not job:
        return Response(
            content=build_hangup_twiml("Sorry, we couldn't retrieve your enquiry details. Goodbye!"),
            media_type="application/xml",
        )

    # Check for answering machine
    answered_by = request.query_params.get("AnsweredBy", "")
    if answered_by in ("machine_start", "machine_end_beep", "machine_end_silence"):
        await call_jobs().update_one(
            {"id": job_id},
            {"$set": {"status": STATUS_COMPLETED, "call_outcome": "voicemail", "completed_at": now_iso(), "updated_at": now_iso()}},
        )
        return Response(content=build_voicemail_twiml(), media_type="application/xml")

    # Update status to answered
    await call_jobs().update_one(
        {"id": job_id},
        {"$set": {"status": STATUS_ANSWERED, "updated_at": now_iso()}},
    )

    # Fetch enquiry for context
    enquiry_col = job.get("enquiry_collection", "enquiries")
    enquiry = await db.get_db()[enquiry_col].find_one({"id": job["enquiry_id"]}, {"_id": 0}) or {}

    # Create/reset conversation session
    session_doc = {
        "id": new_id(),
        "job_id": job_id,
        "enquiry_id": job["enquiry_id"],
        "category": job.get("category") or categorise_enquiry(enquiry),
        "turn_index": 0,
        "history": [],
        "answers": {},
        "questions_queue": [],
        "phase": "opening",  # opening -> questions -> closing
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await call_sessions().replace_one({"job_id": job_id}, session_doc, upsert=True)

    opening_text = build_opening_message(enquiry)
    return Response(
        content=build_opening_twiml(job_id, opening_text),
        media_type="application/xml",
    )


@router.post("/api/calling/gather/{job_id}")
async def process_gather(job_id: str, request: Request):
    """
    Twilio sends gathered speech here after the user speaks.
    Processes the utterance and returns next TwiML.
    """
    # Parse form body from Twilio
    form_data = await request.form()
    speech_result = form_data.get("SpeechResult", "")
    confidence = form_data.get("Confidence", "0.0")

    # Verify Twilio signature (skip in dev mode)
    if os.environ.get("VERIFY_TWILIO_SIG", "true").lower() == "true":
        auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "")
        signature = request.headers.get("X-Twilio-Signature", "")
        url = str(request.url)
        post_dict = dict(form_data)
        if auth_token and not verify_twilio_signature(auth_token, signature, url, post_dict):
            log.warning("Invalid Twilio signature for job %s", job_id)
            return Response(
                content=build_hangup_twiml("Goodbye!"),
                media_type="application/xml",
                status_code=403,
            )

    job = await call_jobs().find_one({"id": job_id}, {"_id": 0})
    if not job:
        return Response(
            content=build_hangup_twiml("Thank you for calling VisitSarva. Goodbye!"),
            media_type="application/xml",
        )

    session = await call_sessions().find_one({"job_id": job_id}, {"_id": 0})
    if not session:
        return Response(
            content=build_hangup_twiml("Thank you for calling VisitSarva. Goodbye!"),
            media_type="application/xml",
        )

    enquiry_col = job.get("enquiry_collection", "enquiries")
    enquiry = await db.get_db()[enquiry_col].find_one({"id": job["enquiry_id"]}, {"_id": 0}) or {}

    phase = session.get("phase", "opening")
    history = session.get("history", [])
    answers = session.get("answers", {})
    category = session.get("category", "general")
    turn_index = session.get("turn_index", 0)

    # Add user utterance to history
    if speech_result:
        history.append({"role": "user", "content": speech_result})

    # If opening phase, check if user wants to talk
    if phase == "opening":
        # Generate AI response to opening
        ai_result = await generate_agent_response(
            history,
            None,  # opening phase
            speech_result or "(no response)",
            {"name": job.get("name"), "property": job.get("property_title"), "enquiry": enquiry.get("message")},
        )
        intent = ai_result.get("intent", "answer")

        if intent == "opt_out":
            # Record opt-out and hang up
            await _record_opt_out(job["phone"], job_id)
            await _finalise_job(job_id, "opt_out", answers, history, enquiry)
            return Response(content=build_hangup_twiml(OPT_OUT_ACKNOWLEDGEMENT), media_type="application/xml")

        if intent in ("busy", "end"):
            await _finalise_job(job_id, "callback_requested", answers, history, enquiry, human_callback=True)
            return Response(content=build_hangup_twiml(BUSY_ACKNOWLEDGEMENT), media_type="application/xml")

        if intent == "human_request":
            await _finalise_job(job_id, "human_callback_requested", answers, history, enquiry, human_callback=True)
            return Response(content=build_hangup_twiml(HUMAN_REQUEST_ACKNOWLEDGEMENT), media_type="application/xml")

        # User is willing to talk — move to questions phase
        # Build question queue from unanswered questions
        questions = get_unanswered_questions(category, answers)
        history.append({"role": "agent", "content": ai_result.get("reply", "")})
        await call_sessions().update_one(
            {"job_id": job_id},
            {"$set": {
                "phase": "questions",
                "history": history,
                "questions_queue": [q["key"] for q in questions],
                "questions_full": questions,
                "turn_index": 1,
                "updated_at": now_iso(),
            }},
        )

        if questions:
            first_q = questions[0]
            reply_text = (ai_result.get("reply") or "Great, let me ask you a few quick questions.") + " " + first_q["q"]
            return Response(
                content=build_question_twiml(job_id, reply_text, 1),
                media_type="application/xml",
            )
        else:
            # Nothing to ask
            closing = build_closing_message(enquiry)
            await _finalise_job(job_id, "completed", answers, history, enquiry)
            return Response(content=build_hangup_twiml(closing), media_type="application/xml")

    # Questions phase
    if phase == "questions":
        questions_full = session.get("questions_full", [])
        questions_queue = session.get("questions_queue", [])

        # Determine what was just asked (previous question)
        current_q_key = questions_queue[0] if questions_queue else None
        current_q_obj = next((q for q in questions_full if q["key"] == current_q_key), None)
        current_q_text = current_q_obj["q"] if current_q_obj else None

        # Get AI response to user utterance
        enquiry_context = {
            "name": job.get("name"),
            "property": job.get("property_title"),
            "enquiry_message": enquiry.get("message"),
            "category": category,
        }
        ai_result = await generate_agent_response(history, current_q_text, speech_result or "(no response)", enquiry_context)
        intent = ai_result.get("intent", "answer")

        if intent == "opt_out":
            await _record_opt_out(job["phone"], job_id)
            await _finalise_job(job_id, "opt_out", answers, history, enquiry)
            return Response(content=build_hangup_twiml(OPT_OUT_ACKNOWLEDGEMENT), media_type="application/xml")

        if intent in ("busy", "end"):
            await _finalise_job(job_id, "callback_requested", answers, history, enquiry, human_callback=True)
            return Response(content=build_hangup_twiml(BUSY_ACKNOWLEDGEMENT), media_type="application/xml")

        if intent == "human_request":
            await _finalise_job(job_id, "human_callback_requested", answers, history, enquiry, human_callback=True)
            return Response(content=build_hangup_twiml(HUMAN_REQUEST_ACKNOWLEDGEMENT), media_type="application/xml")

        # Record the answer
        if current_q_key and intent == "answer":
            extracted_val = ai_result.get("extracted", {}).get("value", speech_result)
            answers[current_q_key] = extracted_val

        agent_reply = ai_result.get("reply", "Thank you.")
        history.append({"role": "user", "content": speech_result})
        history.append({"role": "agent", "content": agent_reply})

        # Remove answered question from queue
        remaining_queue = questions_queue[1:] if questions_queue else []

        # Skip questions already answered
        remaining_questions = [q for q in questions_full if q["key"] in remaining_queue and q["key"] not in answers]

        new_turn = turn_index + 1

        await call_sessions().update_one(
            {"job_id": job_id},
            {"$set": {
                "history": history,
                "answers": answers,
                "questions_queue": [q["key"] for q in remaining_questions],
                "turn_index": new_turn,
                "updated_at": now_iso(),
            }},
        )

        if remaining_questions:
            next_q = remaining_questions[0]
            full_reply = agent_reply + " " + next_q["q"]
            return Response(
                content=build_question_twiml(job_id, full_reply, new_turn),
                media_type="application/xml",
            )
        else:
            # All questions answered — closing
            closing = build_closing_message(enquiry)
            full_reply = agent_reply + " " + closing
            await _finalise_job(job_id, "completed", answers, history, enquiry)
            return Response(content=build_hangup_twiml(full_reply), media_type="application/xml")

    # Fallback
    return Response(
        content=build_hangup_twiml("Thank you for your time. Goodbye!"),
        media_type="application/xml",
    )


async def _record_opt_out(phone: str, job_id: str):
    """Record an opt-out for a phone number."""
    await opt_outs().update_one(
        {"phone": phone},
        {"$set": {"phone": phone, "job_id": job_id, "recorded_at": now_iso()}},
        upsert=True,
    )
    log.info("Opt-out recorded for %s", phone)


async def _finalise_job(
    job_id: str,
    outcome: str,
    answers: dict,
    history: list,
    enquiry: dict,
    human_callback: bool = False,
):
    """Finalise a call job: generate summary, update job, update enquiry."""
    job = await call_jobs().find_one({"id": job_id}, {"_id": 0}) or {}
    category = job.get("category", "general")

    summary = await generate_lead_summary(enquiry, answers, category)

    # Determine next action
    if outcome == "opt_out":
        next_action = "Do not contact — opted out"
    elif human_callback or outcome in ("callback_requested", "human_callback_requested"):
        next_action = "Human callback required"
    elif outcome == "completed":
        next_action = "Review collected answers and arrange site visit or follow-up"
    else:
        next_action = "Follow up required"

    questions_asked = [h["content"] for h in history if h.get("role") == "agent"]

    update = {
        "status": STATUS_COMPLETED,
        "call_outcome": outcome,
        "collected_answers": answers,
        "questions_asked": questions_asked,
        "conversation_summary": summary,
        "next_action": next_action,
        "human_callback_requested": human_callback or outcome == "human_callback_requested",
        "opt_out_recorded": outcome == "opt_out",
        "completed_at": now_iso(),
        "updated_at": now_iso(),
    }
    await call_jobs().update_one({"id": job_id}, {"$set": update})

    # Push results to enquiry and CRM
    final_job = {**job, **update}
    await update_enquiry_with_call_result(final_job)


@router.post("/api/calling/webhook/status/{job_id}")
async def call_status_webhook(job_id: str, request: Request):
    """
    Twilio calls this endpoint with call status events.
    Handles: initiated, ringing, answered, completed, no-answer, busy, failed.
    """
    form_data = await request.form()
    call_status = (form_data.get("CallStatus") or "").lower()
    call_sid = form_data.get("CallSid", "")
    call_duration = form_data.get("CallDuration", "0")

    log.info("Call status webhook: job=%s status=%s sid=%s duration=%s",
             job_id, call_status, call_sid, call_duration)

    STATUS_MAP = {
        "initiated": STATUS_INITIATING,
        "ringing": STATUS_RINGING,
        "in-progress": STATUS_ANSWERED,
        "completed": STATUS_COMPLETED,
        "no-answer": STATUS_NO_ANSWER,
        "busy": STATUS_BUSY,
        "failed": STATUS_FAILED,
        "canceled": STATUS_CANCELLED,
    }

    new_status = STATUS_MAP.get(call_status)
    if new_status:
        job = await call_jobs().find_one({"id": job_id}, {"_id": 0})
        if job and job["status"] not in (STATUS_COMPLETED, STATUS_CANCELLED):
            update = {
                "status": new_status,
                "call_sid": call_sid or job.get("call_sid"),
                "call_duration_seconds": int(call_duration) if call_duration.isdigit() else 0,
                "updated_at": now_iso(),
            }
            if new_status == STATUS_COMPLETED:
                update["completed_at"] = now_iso()
            elif new_status in (STATUS_NO_ANSWER, STATUS_BUSY, STATUS_FAILED):
                # Check if retry is available
                attempt = job.get("attempt_count", 0)
                max_r = job.get("max_retries", MAX_RETRIES)
                if attempt < max_r:
                    update["status"] = STATUS_RETRY_SCHEDULED
                else:
                    update["status"] = STATUS_FAILED
                update["error"] = f"Call {call_status}"

            await call_jobs().update_one({"id": job_id}, {"$set": update})

    return Response(content="", status_code=200)


# ─── Opt-out public endpoint ──────────────────────────────────────────────────

class OptOutRequest(BaseModel):
    phone: str
    reason: Optional[str] = None


@router.post("/api/calling/opt-out")
async def record_opt_out(payload: OptOutRequest):
    """Public endpoint to record an opt-out."""
    normalised = normalise_phone(payload.phone)
    if not normalised:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    await opt_outs().update_one(
        {"phone": normalised},
        {"$set": {
            "phone": normalised,
            "phone_raw": payload.phone,
            "reason": payload.reason or "user_requested",
            "recorded_at": now_iso(),
        }},
        upsert=True,
    )
    return {"ok": True, "message": "Opt-out recorded. You will not receive further calls from VisitSarva."}


# ─── CRM: list / manage call jobs ────────────────────────────────────────────

@router.get("/api/crm/ai-calls")
async def list_call_jobs(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    emp: dict = Depends(get_current_employee),
):
    """List AI call jobs — CRM authenticated."""
    query: dict = {}
    if status and status != "all":
        query["status"] = status
    if search:
        s = search.strip()
        query["$or"] = [
            {"name": {"$regex": s, "$options": "i"}},
            {"phone": {"$regex": s, "$options": "i"}},
            {"enquiry_id": {"$regex": s, "$options": "i"}},
        ]
    cursor = call_jobs().find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    items = await cursor.to_list(length=limit)
    return items


@router.get("/api/crm/ai-calls/stats")
async def get_call_stats(emp: dict = Depends(get_current_employee)):
    """Aggregate stats for AI calling dashboard."""
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    cursor = call_jobs().aggregate(pipeline)
    counts: dict = {}
    async for doc in cursor:
        counts[doc["_id"]] = doc["count"]
    total = sum(counts.values())
    return {
        "total": total,
        "queued": counts.get(STATUS_QUEUED, 0),
        "answered": counts.get(STATUS_ANSWERED, 0),
        "completed": counts.get(STATUS_COMPLETED, 0),
        "failed": counts.get(STATUS_FAILED, 0),
        "no_answer": counts.get(STATUS_NO_ANSWER, 0),
        "retry_scheduled": counts.get(STATUS_RETRY_SCHEDULED, 0),
        "cancelled": counts.get(STATUS_CANCELLED, 0),
    }


@router.get("/api/crm/ai-calls/{job_id}")
async def get_call_job_detail(job_id: str, emp: dict = Depends(get_current_employee)):
    """Get full detail of a call job."""
    job = await call_jobs().find_one(
        {"$or": [{"id": job_id}, {"enquiry_id": job_id}]}, {"_id": 0}
    )
    if not job:
        raise HTTPException(status_code=404, detail="Call job not found")

    # Attach session history if available
    session = await call_sessions().find_one({"job_id": job["id"]}, {"_id": 0})
    if session:
        job["conversation_history"] = session.get("history", [])

    return job


@router.post("/api/crm/ai-calls/{job_id}/retry")
async def retry_call_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    emp: dict = Depends(require_employee_roles("team_lead", "bdo", "founder", "admin")),
):
    """Manually retry a failed call job."""
    job = await call_jobs().find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Call job not found")
    if job["status"] not in (STATUS_FAILED, STATUS_NO_ANSWER, STATUS_BUSY, STATUS_RETRY_SCHEDULED):
        raise HTTPException(status_code=400, detail=f"Cannot retry job in status '{job['status']}'")

    await call_jobs().update_one(
        {"id": job_id},
        {"$set": {"status": STATUS_QUEUED, "error": None, "updated_at": now_iso()}},
    )
    background_tasks.add_task(process_call_job, job_id)
    return {"ok": True, "message": "Call retry queued"}


@router.post("/api/crm/ai-calls/{job_id}/cancel")
async def cancel_call_job(
    job_id: str,
    emp: dict = Depends(require_employee_roles("team_lead", "bdo", "founder", "admin")),
):
    """Cancel a queued or retry-scheduled call job."""
    job = await call_jobs().find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Call job not found")
    if job["status"] not in (STATUS_QUEUED, STATUS_RETRY_SCHEDULED, STATUS_INITIATING):
        raise HTTPException(status_code=400, detail=f"Cannot cancel job in status '{job['status']}'")

    await call_jobs().update_one(
        {"id": job_id},
        {"$set": {"status": STATUS_CANCELLED, "updated_at": now_iso()}},
    )
    return {"ok": True, "message": "Call job cancelled"}


# ─── CRM Settings ─────────────────────────────────────────────────────────────

@router.get("/api/crm/calling-settings")
async def get_settings(emp: dict = Depends(get_current_employee)):
    return await get_calling_settings()


class CallingSettingsUpdate(BaseModel):
    auto_call_on_enquiry: Optional[bool] = None
    calling_hour_start: Optional[int] = None
    calling_hour_end: Optional[int] = None
    max_retries: Optional[int] = None
    retry_interval_minutes: Optional[int] = None


@router.patch("/api/crm/calling-settings")
async def update_settings(
    payload: CallingSettingsUpdate,
    emp: dict = Depends(require_employee_roles("bdo", "founder", "admin")),
):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    update["updated_at"] = now_iso()
    await calling_settings_col().update_one({}, {"$set": update}, upsert=True)
    return {"ok": True}


# ─── Admin: list all AI calls ─────────────────────────────────────────────────

@router.get("/api/admin/ai-calls")
async def admin_list_calls(
    status: Optional[str] = None,
    search: Optional[str] = None,
    admin: dict = Depends(auth_utils.require_roles("admin")),
):
    query: dict = {}
    if status and status != "all":
        query["status"] = status
    if search:
        s = search.strip()
        query["$or"] = [
            {"name": {"$regex": s, "$options": "i"}},
            {"phone": {"$regex": s, "$options": "i"}},
        ]
    cursor = call_jobs().find(query, {"_id": 0}).sort("created_at", -1).limit(500)
    return await cursor.to_list(length=500)


@router.get("/api/admin/ai-calls/stats")
async def admin_call_stats(admin: dict = Depends(auth_utils.require_roles("admin"))):
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    cursor = call_jobs().aggregate(pipeline)
    counts: dict = {}
    async for doc in cursor:
        counts[doc["_id"]] = doc["count"]
    total = sum(counts.values())
    return {
        "total": total,
        "queued": counts.get(STATUS_QUEUED, 0),
        "answered": counts.get(STATUS_ANSWERED, 0),
        "completed": counts.get(STATUS_COMPLETED, 0),
        "failed": counts.get(STATUS_FAILED, 0),
        "no_answer": counts.get(STATUS_NO_ANSWER, 0),
        "retry_scheduled": counts.get(STATUS_RETRY_SCHEDULED, 0),
        "cancelled": counts.get(STATUS_CANCELLED, 0),
    }


# ─── Admin: calling configuration diagnostics ────────────────────────────────

@router.get("/api/admin/calling-config")
async def calling_config_diagnostics(admin: dict = Depends(auth_utils.require_roles("admin"))):
    """
    Return the current calling configuration health.
    Secret values are NOT returned — only whether they are set.
    Use this endpoint to verify the production configuration without
    exposing credentials in logs or screenshots.
    """
    sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
    token = os.environ.get("TWILIO_AUTH_TOKEN", "")
    caller_id = os.environ.get("TWILIO_CALLER_ID", "")
    webhook_base = os.environ.get("TWILIO_WEBHOOK_BASE", "")
    calling_enabled = os.environ.get("CALLING_ENABLED", "false")
    gemini_key = os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GEMINI_API_KEY", "")

    return {
        "calling_enabled": calling_enabled.lower() == "true",
        "calling_enabled_env": calling_enabled,
        "twilio_configured": bool(sid and token and caller_id and webhook_base),
        "twilio_account_sid_set": bool(sid),
        "twilio_account_sid_prefix": sid[:7] + "..." if len(sid) > 7 else "(not set)",
        "twilio_auth_token_set": bool(token),
        "twilio_caller_id_set": bool(caller_id),
        "twilio_caller_id": caller_id if caller_id else "(not set)",
        "twilio_webhook_base_set": bool(webhook_base),
        "twilio_webhook_base": webhook_base if webhook_base else "(not set)",
        "gemini_api_key_set": bool(gemini_key),
        "calling_hour_start": int(os.environ.get("CALLING_HOUR_START", "9")),
        "calling_hour_end": int(os.environ.get("CALLING_HOUR_END", "21")),
        "calling_max_retries": int(os.environ.get("CALLING_MAX_RETRIES", "3")),
        "verify_twilio_sig": os.environ.get("VERIFY_TWILIO_SIG", "true"),
    }


# ─── Admin: manual test call ─────────────────────────────────────────────────

class TestCallRequest(BaseModel):
    phone: str
    name: Optional[str] = "Test User"
    note: Optional[str] = None


@router.post("/api/admin/test-call")
async def admin_test_call(
    payload: TestCallRequest,
    admin: dict = Depends(auth_utils.require_roles("admin")),
):
    """
    Trigger a real outbound test call to the specified phone number.
    The phone number must belong to someone who has consented to receive this call.
    Creates a synthetic enquiry record and dispatches a call job immediately.
    Returns the call job ID and Twilio call SID if the call was accepted.

    IMPORTANT: Only use this with phone numbers whose owners have explicitly
    consented to receive the call. Do not use for unsolicited testing.
    """
    if not is_twilio_configured():
        raise HTTPException(
            status_code=503,
            detail="Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, "
                   "TWILIO_CALLER_ID, and TWILIO_WEBHOOK_BASE in the environment.",
        )
    if not is_calling_enabled():
        raise HTTPException(
            status_code=503,
            detail="Calling is disabled. Set CALLING_ENABLED=true in the environment.",
        )

    normalised = normalise_phone(payload.phone)
    if not normalised:
        raise HTTPException(status_code=400, detail="Invalid phone number — could not normalise to E.164")

    # Create a synthetic test enquiry
    from crm_models import now_iso, new_id
    test_enquiry_id = new_id()
    test_doc = {
        "id": test_enquiry_id,
        "name": payload.name or "Test User",
        "phone": normalised,
        "phone_raw": payload.phone,
        "email": admin.get("email", "admin@visitsarva.in"),
        "message": payload.note or "Admin-initiated test call",
        "property_id": None,
        "property_title": "Test Call (Admin)",
        "source": "Admin Test Call",
        "type": "test",
        "status": "test",
        "created_at": now_iso(),
    }
    await db.enquiries().insert_one(test_doc)

    # Create and immediately dispatch the call job
    job = await create_call_job(
        enquiry_id=test_enquiry_id,
        enquiry_collection="enquiries",
        name=payload.name or "Test User",
        phone=payload.phone,
        source="Admin Test Call",
        property_id=None,
        property_title="Test Call",
    )
    if job is None:
        raise HTTPException(
            status_code=400,
            detail="Could not create call job. The phone number may be opted out, "
                   "calling may be outside hours, or the number is already queued.",
        )

    job_id = job["id"]
    log.info("[TEST-CALL] Admin %s triggered test call: job=%s phone=%s", admin.get("id"), job_id, normalised)

    # Process synchronously so we can return the actual Twilio result
    await process_call_job(job_id)

    # Fetch the updated job to return real status
    updated_job = await call_jobs().find_one({"id": job_id}, {"_id": 0}) or job

    return {
        "ok": updated_job.get("status") in (STATUS_RINGING, STATUS_ANSWERED, STATUS_COMPLETED),
        "job_id": job_id,
        "enquiry_id": test_enquiry_id,
        "call_sid": updated_job.get("call_sid"),
        "status": updated_job.get("status"),
        "error": updated_job.get("error"),
        "phone": normalised,
        "message": (
            "Call accepted by Twilio — phone should ring shortly."
            if updated_job.get("call_sid")
            else "Call was not placed. Check the 'error' field for details."
        ),
    }

