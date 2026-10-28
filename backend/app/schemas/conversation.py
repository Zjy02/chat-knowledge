"""Conversation and message response schemas.

`MessageOut` validates the JSON citation snapshot back into typed Citation
objects, so the frontend never receives an untyped dictionary.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import MessageRole, MessageStatus


class Citation(BaseModel):
    index: int
    chunk_id: int
    document_id: int
    document_name: str
    chunk_index: int
    snippet: str
    content: str = ""
    score: float


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: MessageRole
    content: str
    status: MessageStatus
    citations: list[Citation] | None = None
    latency_ms: int | None = None
    created_at: datetime


class ConversationSummary(BaseModel):
    id: int
    title: str
    message_count: int
    last_message_at: datetime
    created_at: datetime
    last_message: str | None = None


class ConversationCreate(BaseModel):
    title: str | None = Field(default=None, max_length=120)


class ConversationUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=120)


class ConversationDetail(BaseModel):
    id: int
    title: str
    message_count: int
    last_message_at: datetime
    created_at: datetime
    messages: list[MessageOut]
