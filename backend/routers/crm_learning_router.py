"""CRM Learning & Training router — Founder/BDO targeted content upload/edit/publish, strict recipient authorization, GridFS file streaming, security logging."""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import json
import db
from crm_models import now_iso, new_id, AuditLog
from services.rbac_service import get_current_employee

router = APIRouter(prefix="/api/crm/learning", tags=["crm_learning"])

ADMIN_ROLES = ["founder", "bdo"]
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB max limit

DANGEROUS_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".ps1", ".scr", ".vbs", ".js", ".msi", ".jar",
    ".com", ".pif", ".application", ".gadget", ".msp", ".hta", ".cpl", ".msc", ".jar"
}

ALLOWED_MIME_TYPES = {
    # Video
    "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/mpeg",
    # Image
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
    # PDF
    "application/pdf",
    # Documents
    "text/plain", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream"  # Generic binary fallback for doc formats
}

def detect_content_type(mime_type: str, filename: str) -> str:
    ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
    if mime_type.startswith("video/") or ext in [".mp4", ".webm", ".mov", ".avi", ".mkv"]:
        return "video"
    if mime_type.startswith("image/") or ext in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        return "image"
    if mime_type == "application/pdf" or ext == ".pdf":
        return "pdf"
    if ext in [".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt", ".csv"]:
        return "document"
    return "document"

class TextContentCreate(BaseModel):
    title: str
    description: str = ""
    text_content: str
    recipients: List[str]
    is_published: bool = True

class SecurityEvent(BaseModel):
    learning_content_id: Optional[str] = None
    event_type: str  # SCREENSHOT_ATTEMPT, SCREEN_CAPTURE_SHORTCUT, TAB_SWITCH, WINDOW_BLUR, VIDEO_ACCESS, VIDEO_PLAY, VIDEO_PAUSE

@router.get("")
async def list_learning_content(emp: dict = Depends(get_current_employee)):
    """List learning materials. Founder & BDO see all managed items with recipient stats; normal users see only published items assigned to them."""
    role = emp["role"]
    user_id = emp["id"]

    if role in ADMIN_ROLES:
        cursor = db.learning_content().find({}).sort("created_at", -1)
        items = await cursor.to_list(length=200)

        # Enrich items with recipient count and view statistics for Founder/BDO
        for item in items:
            item.pop("_id", None)
            recipients_list = item.get("recipients", [])
            item["recipient_count"] = len(recipients_list)
            
            # Fetch recipient details (name, role, email) for display
            if recipients_list:
                users_cursor = db.employees().find({"id": {"$in": recipients_list}}, {"_id": 0, "id": 1, "name": 1, "role": 1, "email": 1})
                item["recipient_details"] = await users_cursor.to_list(length=500)
            else:
                item["recipient_details"] = []

            # Fetch view counts
            view_count = await db.learning_recipients().count_documents({
                "learning_content_id": item["id"],
                "first_viewed_at": {"$ne": None}
            })
            item["viewed_count"] = view_count
        return items

    else:
        # Normal employees: ONLY see published content assigned to them
        cursor = db.learning_content().find({
            "is_published": True,
            "recipients": user_id
        }).sort("created_at", -1)
        items = await cursor.to_list(length=200)

        for item in items:
            item.pop("_id", None)
            # Remove full recipient array to preserve privacy
            item.pop("recipients", None)
            
            # Check user's view status
            rec_doc = await db.learning_recipients().find_one({
                "learning_content_id": item["id"],
                "user_id": user_id
            })
            item["has_viewed"] = bool(rec_doc and rec_doc.get("first_viewed_at"))
            item["viewed_at"] = rec_doc.get("last_viewed_at") if rec_doc else None

        return items


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_learning_content(
    title: str = Form(...),
    content_type: str = Form(...),  # 'video', 'image', 'pdf', 'document', 'text'
    description: str = Form(""),
    text_content: Optional[str] = Form(None),
    recipients: str = Form(...),  # JSON string array of user IDs
    is_published: bool = Form(True),
    file: Optional[UploadFile] = File(None),
    emp: dict = Depends(get_current_employee)
):
    """Founder & BDO upload/create learning content with targeted recipients."""
    if emp["role"] not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Only Founder and BDO can upload/create learning content")

    if not title.strip():
        raise HTTPException(status_code=400, detail="Title is required.")

    # Parse recipients list
    try:
        recipient_ids = json.loads(recipients) if isinstance(recipients, str) else recipients
        if not isinstance(recipient_ids, list) or len(recipient_ids) == 0:
            raise HTTPException(status_code=400, detail="Please select at least one recipient.")
    except Exception:
        raise HTTPException(status_code=400, detail="Please select at least one valid recipient.")

    file_id = None
    file_name = None
    file_size = None
    mime_type = None
    final_content_type = content_type

    if content_type == "text":
        if not text_content or not text_content.strip():
            raise HTTPException(status_code=400, detail="Text content cannot be empty.")
    else:
        if not file:
            raise HTTPException(status_code=400, detail="File is required for non-text content.")
        
        file_name = file.filename
        ext = "." + file_name.split(".")[-1].lower() if "." in file_name else ""
        if ext in DANGEROUS_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Unsupported or restricted file type: '{ext}'. Executables and scripts are prohibited.")

        mime_type = file.content_type or "application/octet-stream"
        
        # Read file contents
        content_bytes = await file.read()
        file_size = len(content_bytes)

        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File size exceeds the allowed limit (100MB max).")

        final_content_type = detect_content_type(mime_type, file_name)

        # Upload file stream to GridFS
        bucket = db.get_gridfs_bucket()
        file_id = await bucket.upload_from_stream(
            filename=file_name,
            source=content_bytes,
            metadata={"contentType": mime_type, "uploadedBy": emp["id"]}
        )
        file_id = str(file_id)

    item_id = new_id()
    now = now_iso()
    doc = {
        "id": item_id,
        "title": title.strip(),
        "content_type": final_content_type,
        "description": description.strip(),
        "file_id": file_id,
        "file_name": file_name,
        "file_size": file_size,
        "mime_type": mime_type,
        "text_content": text_content if final_content_type == "text" else None,
        "recipients": recipient_ids,
        "created_by": emp["id"],
        "created_by_name": emp.get("name"),
        "created_by_role": emp["role"],
        "is_published": is_published,
        "created_at": now,
        "updated_at": now
    }

    await db.learning_content().insert_one(doc)

    # Create recipient tracking records
    recipient_docs = [
        {
            "id": new_id(),
            "learning_content_id": item_id,
            "user_id": uid,
            "assigned_at": now,
            "first_viewed_at": None,
            "last_viewed_at": None,
            "view_count": 0
        }
        for uid in recipient_ids
    ]
    if recipient_docs:
        await db.learning_recipients().insert_many(recipient_docs)

    doc.pop("_id", None)
    return doc


@router.get("/files/{file_id}")
async def stream_learning_file(file_id: str, emp: dict = Depends(get_current_employee)):
    """Stream stored file securely. Enforces recipient-based authorization."""
    content_item = await db.learning_content().find_one({"file_id": file_id})
    if not content_item:
        raise HTTPException(status_code=404, detail="File not found")

    # Strict authorization check: Only Founder, BDO, Creator, or explicit recipient can access
    role = emp["role"]
    user_id = emp["id"]
    if role not in ADMIN_ROLES and content_item.get("created_by") != user_id and user_id not in content_item.get("recipients", []):
        raise HTTPException(status_code=403, detail="You are not authorized to view or download this content.")

    try:
        bucket = db.get_gridfs_bucket()
        stream = await bucket.open_download_stream(file_id)
        file_bytes = await stream.read()
        mime_type = content_item.get("mime_type") or "application/octet-stream"
        
        headers = {
            "Content-Disposition": f'inline; filename="{content_item.get("file_name", "file")}"',
            "Accept-Ranges": "bytes"
        }
        return Response(content=file_bytes, media_type=mime_type, headers=headers)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File stream error: {str(e)}")


@router.get("/{content_id}")
async def get_learning_content(content_id: str, emp: dict = Depends(get_current_employee)):
    """Get single content details with recipient authorization check."""
    item = await db.learning_content().find_one({"id": content_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Learning content not found")

    role = emp["role"]
    user_id = emp["id"]
    if role not in ADMIN_ROLES and item.get("created_by") != user_id and user_id not in item.get("recipients", []):
        raise HTTPException(status_code=403, detail="You do not have permission to access this learning content.")

    return item


@router.put("/{content_id}")
async def update_learning_content(
    content_id: str,
    title: str = Form(...),
    description: str = Form(""),
    text_content: Optional[str] = Form(None),
    recipients: str = Form(...),
    is_published: bool = Form(True),
    file: Optional[UploadFile] = File(None),
    emp: dict = Depends(get_current_employee)
):
    """Founder & BDO edit content and manage recipients."""
    if emp["role"] not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Only Founder and BDO can edit learning content")

    existing = await db.learning_content().find_one({"id": content_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Learning content not found")

    recipient_ids = json.loads(recipients) if isinstance(recipients, str) else recipients
    if not isinstance(recipient_ids, list) or len(recipient_ids) == 0:
        raise HTTPException(status_code=400, detail="Please select at least one recipient.")

    update_fields = {
        "title": title.strip(),
        "description": description.strip(),
        "recipients": recipient_ids,
        "is_published": is_published,
        "updated_at": now_iso()
    }

    if existing.get("content_type") == "text":
        if text_content and text_content.strip():
            update_fields["text_content"] = text_content.strip()

    if file:
        file_name = file.filename
        ext = "." + file_name.split(".")[-1].lower() if "." in file_name else ""
        if ext in DANGEROUS_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Unsupported or restricted file type: '{ext}'.")

        mime_type = file.content_type or "application/octet-stream"
        content_bytes = await file.read()
        file_size = len(content_bytes)

        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File size exceeds allowed limit (100MB max).")

        # Upload new file
        bucket = db.get_gridfs_bucket()
        # Delete old file if present
        if existing.get("file_id"):
            try:
                await bucket.delete(existing["file_id"])
            except Exception:
                pass

        new_file_id = await bucket.upload_from_stream(
            filename=file_name,
            source=content_bytes,
            metadata={"contentType": mime_type, "uploadedBy": emp["id"]}
        )
        update_fields["file_id"] = str(new_file_id)
        update_fields["file_name"] = file_name
        update_fields["file_size"] = file_size
        update_fields["mime_type"] = mime_type
        update_fields["content_type"] = detect_content_type(mime_type, file_name)

    await db.learning_content().update_one({"id": content_id}, {"$set": update_fields})

    # Sync recipient tracking records
    existing_recipients = await db.learning_recipients().find({"learning_content_id": content_id}).to_list(length=1000)
    existing_uids = {r["user_id"] for r in existing_recipients}
    new_uids = set(recipient_ids)

    # Remove recipients that were unassigned
    to_remove = existing_uids - new_uids
    if to_remove:
        await db.learning_recipients().delete_many({"learning_content_id": content_id, "user_id": {"$in": list(to_remove)}})

    # Add new recipients
    to_add = new_uids - existing_uids
    if to_add:
        now = now_iso()
        add_docs = [
            {
                "id": new_id(),
                "learning_content_id": content_id,
                "user_id": uid,
                "assigned_at": now,
                "first_viewed_at": None,
                "last_viewed_at": None,
                "view_count": 0
            }
            for uid in to_add
        ]
        await db.learning_recipients().insert_many(add_docs)

    updated = await db.learning_content().find_one({"id": content_id}, {"_id": 0})
    return updated


@router.delete("/{content_id}")
async def delete_learning_content(content_id: str, emp: dict = Depends(get_current_employee)):
    """Founder & BDO delete learning content, recipient assignments, and stored file."""
    if emp["role"] not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Only Founder and BDO can delete learning content")

    existing = await db.learning_content().find_one({"id": content_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Learning content not found")

    # Delete stored file from GridFS if present
    if existing.get("file_id"):
        try:
            bucket = db.get_gridfs_bucket()
            await bucket.delete(existing["file_id"])
        except Exception:
            pass

    # Delete recipient records and main doc
    await db.learning_recipients().delete_many({"learning_content_id": content_id})
    await db.learning_content().delete_one({"id": content_id})

    return {"message": "Content and assignments deleted successfully"}


@router.patch("/{content_id}/publish")
async def toggle_publish(content_id: str, emp: dict = Depends(get_current_employee)):
    """Founder & BDO toggle draft/published state."""
    if emp["role"] not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Only Founder and BDO can change publish status")

    existing = await db.learning_content().find_one({"id": content_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Learning content not found")

    new_status = not existing.get("is_published", True)
    await db.learning_content().update_one({"id": content_id}, {"$set": {"is_published": new_status, "updated_at": now_iso()}})
    return {"message": "Publish status updated", "is_published": new_status}


@router.post("/{content_id}/view")
async def record_content_view(content_id: str, emp: dict = Depends(get_current_employee)):
    """Record view event for recipient employee."""
    user_id = emp["id"]
    content = await db.learning_content().find_one({"id": content_id})
    if not content:
        raise HTTPException(status_code=404, detail="Learning content not found")

    if emp["role"] not in ADMIN_ROLES and user_id not in content.get("recipients", []):
        raise HTTPException(status_code=403, detail="Not authorized to view this content.")

    now = now_iso()
    rec_doc = await db.learning_recipients().find_one({"learning_content_id": content_id, "user_id": user_id})
    
    if rec_doc:
        first_view = rec_doc.get("first_viewed_at") or now
        await db.learning_recipients().update_one(
            {"id": rec_doc["id"]},
            {
                "$set": {"first_viewed_at": first_view, "last_viewed_at": now},
                "$inc": {"view_count": 1}
            }
        )
    else:
        await db.learning_recipients().insert_one({
            "id": new_id(),
            "learning_content_id": content_id,
            "user_id": user_id,
            "assigned_at": now,
            "first_viewed_at": now,
            "last_viewed_at": now,
            "view_count": 1
        })

    return {"status": "recorded", "viewed_at": now}


@router.post("/security-event")
async def log_security_event(event: SecurityEvent, emp: dict = Depends(get_current_employee)):
    """Log security events (screenshot attempt, tab switch, window blur, play/pause)."""
    doc = {
        "id": new_id(),
        "user_id": emp["id"],
        "user_name": emp.get("name"),
        "user_email": emp.get("email"),
        "role": emp["role"],
        "learning_content_id": event.learning_content_id or "",
        "event_type": event.event_type,
        "created_at": now_iso()
    }
    await db.learning_security_events().insert_one(doc)
    return {"status": "logged"}
