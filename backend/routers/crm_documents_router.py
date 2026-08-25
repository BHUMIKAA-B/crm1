from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import db
from crm_models import CrmDocument, now_iso, new_id, AuditLog
from services.rbac_service import get_current_employee

router = APIRouter(prefix="/api/crm/documents", tags=["crm_documents"])

@router.post("")
async def upload_document_metadata(data: dict, emp: dict = Depends(get_current_employee)):
    doc = CrmDocument(
        entity_type=data["entity_type"],
        entity_id=data["entity_id"],
        doc_type=data["doc_type"],
        type_of_document_service=data.get("type_of_document_service"),
        file_name=data["file_name"],
        file_url=data["file_url"],
        uploaded_by=emp["id"],
        notes=data.get("notes", "")
    )
    doc_dict = doc.model_dump()
    await db.crm_documents().insert_one(doc_dict)
    
    await db.audit_logs().insert_one(AuditLog(who=emp["id"], action="upload_document", entity=data["entity_type"], entity_id=data["entity_id"]).model_dump())
    return {"message": "Document uploaded successfully", "id": doc.id}

@router.get("")
async def list_documents(entity_type: Optional[str] = None, entity_id: Optional[str] = None, emp: dict = Depends(get_current_employee)):
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    cursor = db.crm_documents().find(query).sort("uploaded_at", -1).limit(100)
    docs = await cursor.to_list(length=100)
    for d in docs:
        d.pop("_id", None)
    return docs

@router.patch("/{doc_id}/verify")
async def verify_document(doc_id: str, status: str, notes: str = "", emp: dict = Depends(get_current_employee)):
    if emp["role"] not in ["founder", "admin", "dpo", "bdo", "team_lead"]:
        raise HTTPException(status_code=403, detail="Not authorized to verify documents")
        
    await db.crm_documents().update_one(
        {"id": doc_id},
        {"$set": {
            "verification_status": status,
            "verified_by": emp["id"],
            "verified_at": now_iso(),
            "notes": notes
        }}
    )
    return {"message": f"Document status updated to {status}"}
