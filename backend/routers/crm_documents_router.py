"""CRM Documents router — full team-based authorization on all endpoints.

Security model:
  - executive / trainee  → only see documents belonging to their own team
  - team_lead            → only see documents for their own team
  - bdo                  → sees documents for teams within BDO scope
  - founder / admin      → sees all documents
  - dpo                  → sees all documents (for verification duties)

team_id on each document is derived from the uploader's team on the backend.
The frontend CANNOT override the team_id.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import db
from crm_models import CrmDocument, now_iso, new_id, AuditLog
from services.rbac_service import get_current_employee, get_team_member_ids

router = APIRouter(prefix="/api/crm/documents", tags=["crm_documents"])


# ─────────────────────────────────────────────────
# Helper — resolve the team_id for an employee
# ─────────────────────────────────────────────────
async def _resolve_team_id(emp: dict) -> Optional[str]:
    """Return the team UUID for this employee, or None if not found."""
    emp_id = emp["id"]
    role = emp.get("role")

    # Team leader: find the team they lead
    if role == "team_lead":
        team = await db.teams().find_one({"team_leader_id": emp_id})
        if team:
            return team.get("id")

    # For any role, use the team_id stored on the employee record
    team_id_val = emp.get("team_id")
    if team_id_val:
        team = await db.teams().find_one(
            {"$or": [{"id": team_id_val}, {"team_id": team_id_val}]}
        )
        if team:
            return team.get("id")

    return None


# ─────────────────────────────────────────────────
# Helper — build query filter for the current user
# ─────────────────────────────────────────────────
async def _build_doc_query(emp: dict) -> dict:
    """Return a MongoDB query dict scoping documents to what this user can see."""
    role = emp.get("role")

    if role in ["founder", "admin", "dpo"]:
        # Founder/Admin: all documents; DPO: all (for verification duties)
        return {}

    if role == "bdo":
        # BDO: documents for teams whose leaders report to this BDO
        tl_docs = await db.employees().find(
            {"reporting_manager": emp["id"], "role": "team_lead"},
            {"_id": 0, "id": 1}
        ).to_list(length=200)
        tl_ids = [t["id"] for t in tl_docs]
        if not tl_ids:
            return {"team_id": "__no_match__"}  # No teams → no documents
        # Get team IDs led by these team leaders
        teams = await db.teams().find(
            {"team_leader_id": {"$in": tl_ids}},
            {"_id": 0, "id": 1}
        ).to_list(length=200)
        team_ids = [t["id"] for t in teams]
        return {"team_id": {"$in": team_ids}} if team_ids else {"team_id": "__no_match__"}

    if role == "team_lead":
        team_id = await _resolve_team_id(emp)
        if not team_id:
            return {"uploaded_by": emp["id"]}  # Fallback: own uploads only
        return {"team_id": team_id}

    # executive / trainee — same team only
    team_id = await _resolve_team_id(emp)
    if team_id:
        return {"team_id": team_id}
    # Fallback: only own uploads if team not configured
    return {"uploaded_by": emp["id"]}


# ─────────────────────────────────────────────────
# POST / — Upload / create a document
# ─────────────────────────────────────────────────
@router.post("")
async def upload_document_metadata(data: dict, emp: dict = Depends(get_current_employee)):
    """Create a document record. team_id is derived from the uploader's team — never trusted from frontend."""
    role = emp.get("role")

    # Derive team_id from the authenticated employee's team
    resolved_team_id = await _resolve_team_id(emp)

    # If the frontend sent a team_id, validate the user actually belongs to that team
    requested_team_id = data.get("team_id")
    if requested_team_id and requested_team_id != resolved_team_id:
        if role not in ["founder", "admin"]:
            raise HTTPException(
                status_code=403,
                detail="You cannot assign a document to a team you do not belong to."
            )
        # Founder/Admin: trust the provided team_id
        resolved_team_id = requested_team_id

    doc = CrmDocument(
        title=data.get("title") or data.get("file_name", ""),
        entity_type=data.get("entity_type", "team"),
        entity_id=data.get("entity_id", emp.get("team_id", emp["id"])),
        doc_type=data["doc_type"],
        type_of_document_service=data.get("type_of_document_service"),
        file_name=data["file_name"],
        file_url=data["file_url"],
        uploaded_by=emp["id"],
        team_id=resolved_team_id,
        notes=data.get("notes", "")
    )
    doc_dict = doc.model_dump()
    await db.crm_documents().insert_one(doc_dict)

    await db.audit_logs().insert_one(
        AuditLog(
            who=emp["id"],
            action="upload_document",
            entity=doc.entity_type,
            entity_id=doc.entity_id
        ).model_dump()
    )
    return {"message": "Document uploaded successfully", "id": doc.id}


# ─────────────────────────────────────────────────
# GET / — List documents (scoped)
# ─────────────────────────────────────────────────
@router.get("")
async def list_documents(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    emp: dict = Depends(get_current_employee)
):
    """List documents visible to the authenticated user's role and team scope."""
    query = await _build_doc_query(emp)

    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id

    cursor = db.crm_documents().find(query, {"_id": 0}).sort("uploaded_at", -1).limit(200)
    docs = await cursor.to_list(length=200)

    # Enrich with uploader name
    uploader_ids = list({d.get("uploaded_by") for d in docs if d.get("uploaded_by")})
    uploader_map = {}
    if uploader_ids:
        uploaders = await db.employees().find(
            {"id": {"$in": uploader_ids}}, {"_id": 0, "id": 1, "name": 1}
        ).to_list(length=500)
        uploader_map = {u["id"]: u.get("name", "Unknown") for u in uploaders}

    for d in docs:
        d["uploaded_by_name"] = uploader_map.get(d.get("uploaded_by"), "")

    return docs


# ─────────────────────────────────────────────────
# GET /{doc_id} — Get single document
# ─────────────────────────────────────────────────
@router.get("/{doc_id}")
async def get_document(doc_id: str, emp: dict = Depends(get_current_employee)):
    """Fetch a single document — enforces team scope."""
    doc = await db.crm_documents().find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Build scope query and verify this document is within it
    scope_query = await _build_doc_query(emp)
    if scope_query:
        # Manually check if doc passes the scope
        doc_team_id = doc.get("team_id")
        role = emp.get("role")
        if role in ["founder", "admin", "dpo"]:
            pass  # All docs visible
        elif role == "bdo":
            allowed_team_ids = scope_query.get("team_id", {}).get("$in", [])
            if doc_team_id not in allowed_team_ids:
                raise HTTPException(status_code=403, detail="Not authorized to view this document")
        elif role == "team_lead":
            allowed_team_id = scope_query.get("team_id")
            if doc_team_id != allowed_team_id:
                raise HTTPException(status_code=403, detail="Not authorized to view this document")
        else:
            allowed_team_id = scope_query.get("team_id") or None
            if doc_team_id != allowed_team_id and doc.get("uploaded_by") != emp["id"]:
                raise HTTPException(status_code=403, detail="Not authorized to view this document")

    return doc


# ─────────────────────────────────────────────────
# PATCH /{doc_id}/verify — Verify / reject a document
# ─────────────────────────────────────────────────
@router.patch("/{doc_id}/verify")
async def verify_document(doc_id: str, status: str, notes: str = "", emp: dict = Depends(get_current_employee)):
    if emp["role"] not in ["founder", "admin", "dpo", "bdo", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized to verify documents")

    # For team_lead, verify the document belongs to their team
    if emp["role"] == "team_lead":
        doc = await db.crm_documents().find_one({"id": doc_id}, {"_id": 0, "team_id": 1})
        if doc:
            own_team_id = await _resolve_team_id(emp)
            if doc.get("team_id") != own_team_id:
                raise HTTPException(status_code=403, detail="Not authorized to verify documents from another team")

    await db.crm_documents().update_one(
        {"id": doc_id},
        {"$set": {
            "verification_status": status,
            "verified_by": emp["id"],
            "verified_at": now_iso(),
            "notes": notes
        }}
    )
    await db.audit_logs().insert_one(
        AuditLog(who=emp["id"], action=f"verify_document_{status}", entity="crm_document", entity_id=doc_id).model_dump()
    )
    return {"message": f"Document status updated to {status}"}


# ─────────────────────────────────────────────────
# DELETE /{doc_id} — Delete a document (team_lead+ only, within scope)
# ─────────────────────────────────────────────────
@router.delete("/{doc_id}")
async def delete_document(doc_id: str, emp: dict = Depends(get_current_employee)):
    if emp["role"] not in ["founder", "admin", "bdo", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete documents")

    doc = await db.crm_documents().find_one({"id": doc_id}, {"_id": 0, "team_id": 1, "uploaded_by": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Enforce team scope for team_lead
    if emp["role"] == "team_lead":
        own_team_id = await _resolve_team_id(emp)
        if doc.get("team_id") != own_team_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete documents from another team")

    # BDO scope check
    if emp["role"] == "bdo":
        scope_query = await _build_doc_query(emp)
        allowed_team_ids = scope_query.get("team_id", {}).get("$in", [])
        if doc.get("team_id") not in allowed_team_ids:
            raise HTTPException(status_code=403, detail="Not authorized to delete this document")

    await db.crm_documents().delete_one({"id": doc_id})
    await db.audit_logs().insert_one(
        AuditLog(who=emp["id"], action="delete_document", entity="crm_document", entity_id=doc_id).model_dump()
    )
    return {"message": "Document deleted successfully"}
