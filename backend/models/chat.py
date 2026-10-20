'''Pydantic schemas for the native chatbot conversation.'''
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Literal

from pydantic import BaseModel, Field, ConfigDict


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ChatConversation(BaseModel):
    """Metadata for a chatbot conversation linked to an enquiry."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    enquiry_id: str
    category: str = "property_purchase"
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)
    question_index: int = 0  # index into the question list
    answers: Dict[str, str] = {}  # collected answers keyed by question identifier

    model_config = ConfigDict(extra="ignore")


class ChatMessage(BaseModel):
    """A single message inside a conversation."""
    conversation_id: str
    role: Literal["user", "assistant"]
    content: str
    timestamp: str = Field(default_factory=now_iso)

    model_config = ConfigDict(extra="ignore")


class ChatStartRequest(BaseModel):
    enquiry_id: str
    category: Optional[str] = None


class ChatStartResponse(BaseModel):
    session_id: str


class ChatMessageRequest(BaseModel):
    session_id: str
    role: Literal["user", "assistant"]
    content: str


class ChatMessageResponse(BaseModel):
    reply: str
    completed: bool = False
    next_question_key: Optional[str] = None
