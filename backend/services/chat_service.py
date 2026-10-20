"""Service layer for the native VisitSarva chatbot.

It drives a simple sequential question flow using the existing
`services.ai_calling.QUESTIONS` bank. Each conversation is persisted
in the Mongo `chat_conversations` collection, and every user/assistant
message is stored in `chat_messages`.

The service is deliberately lightweight – it does not invoke any LLM.
Instead it returns the next question from the predefined list. If the
conversation is exhausted the `completed` flag is set to ``True`` and the
assistant replies with a friendly closing message.
"""

from __future__ import annotations

import logging
from typing import Tuple, Optional

from backend.models.chat import (
    ChatConversation,
    ChatMessage,
    ChatStartRequest,
    ChatStartResponse,
    ChatMessageRequest,
    ChatMessageResponse,
)
from backend.db import chat_conversations, chat_messages, requirements
from backend.services.ai_calling import QUESTIONS, CAT_GENERAL

log = logging.getLogger("visitsarva.chat_service")


def start_conversation(req: ChatStartRequest) -> ChatStartResponse:
    """Create a new conversation linked to an existing enquiry.

    If ``req.category`` is omitted we fallback to the generic ``general``
    category. The function inserts a ``ChatConversation`` document and
    returns the generated ``session_id`` (the conversation ``id``).
    """
    category = req.category or CAT_GENERAL
    conv = ChatConversation(enquiry_id=req.enquiry_id, category=category)
    # Insert into DB – ``insert_one`` returns the generated ObjectId, but we
    # already have a UUID primary key, so we just insert the dict.
    chat_conversations().insert_one(conv.model_dump())
    log.info("Started chatbot session %s for enquiry %s", conv.id, req.enquiry_id)
    return ChatStartResponse(session_id=conv.id)


def _load_conversation(session_id: str) -> ChatConversation:
    data = chat_conversations().find_one({"id": session_id})
    if not data:
        raise ValueError(f"Conversation {session_id} not found")
    return ChatConversation(**data)


def _save_message(msg: ChatMessage) -> None:
    chat_messages().insert_one(msg.model_dump())


def _store_answer(conv: ChatConversation, key: str, value: str) -> None:
    # Update the in‑memory object and persist the change.
    conv.answers[key] = value
    conv.updated_at = conv.updated_at  # keep timestamp fresh (could use now_iso)
    chat_conversations().update_one({"id": conv.id}, {"$set": {"answers": conv.answers, "updated_at": conv.updated_at}})
    # Also mirror into the generic ``requirements`` collection for CRM visibility.
    requirements().update_one({"enquiry_id": conv.enquiry_id}, {"$set": {f"answers.{key}": value}}, upsert=True)


def _next_question(conv: ChatConversation) -> Optional[Tuple[str, str]]:
    """Return the next unanswered question (key, text) or ``None``.

    The function respects ``conv.question_index`` as the pointer into the
    ``QUESTIONS[category]`` list. When the index exceeds the list length we
    return ``None`` signalling completion.
    """
    questions = QUESTIONS.get(conv.category, QUESTIONS[CAT_GENERAL])
    while conv.question_index < len(questions):
        q = questions[conv.question_index]
        if q["key"] not in conv.answers:
            return q["key"], q["q"]
        conv.question_index += 1
    return None


def handle_user_message(req: ChatMessageRequest) -> ChatMessageResponse:
    """Persist the user's message, record the answer (if applicable) and
    return the next assistant reply.

    The function follows a very simple rule‑based flow:
    * If the conversation is newly started (no prior messages) we treat the
      first user input as an answer to the *first* question.
    * For subsequent messages we map the input to the current pending question
      key.
    * After storing the answer we advance the index and fetch the next question.
    * When no more questions remain we reply with a closing message and mark
      ``completed=True``.
    """
    conv = _load_conversation(req.session_id)
    # Persist the incoming user message.
    user_msg = ChatMessage(conversation_id=conv.id, role="user", content=req.content)
    _save_message(user_msg)

    # Determine which question we are answering.
    current_q = _next_question(conv)
    if current_q:
        key, _ = current_q
        _store_answer(conv, key, req.content)
        # Advance pointer for the next round.
        conv.question_index += 1
    else:
        # No pending question – this could be a stray message after completion.
        log.debug("Received message after conversation completed: %s", req.content)

    # Fetch the next question (if any).
    nxt = _next_question(conv)
    if nxt:
        _, question_text = nxt
        reply = question_text
        completed = False
        next_key = nxt[0]
    else:
        # All questions answered – send a friendly closing.
        reply = "Thank you! Our team will review your responses and get back to you shortly."
        completed = True
        next_key = None
        # Mark conversation as finished (optional flag could be added to model).

    # Persist the assistant reply.
    assistant_msg = ChatMessage(conversation_id=conv.id, role="assistant", content=reply)
    _save_message(assistant_msg)

    return ChatMessageResponse(reply=reply, completed=completed, next_question_key=next_key)


def get_history(session_id: str) -> list[ChatMessage]:
    """Return the full ordered message history for a conversation."""
    cursor = chat_messages().find({"conversation_id": session_id}).sort("timestamp", 1)
    return [ChatMessage(**doc) for doc in cursor]
