"""Knowledge base request/response schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import DocumentStatus


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    file_type: str
    file_size: int
    status: DocumentStatus
    error_message: str | None = None
    chunk_count: int
    enabled: bool
    created_at: datetime
    updated_at: datetime


class DocumentUpdate(BaseModel):
    enabled: bool


class KnowledgeStats(BaseModel):
    document_count: int
    ready_count: int
    chunk_count: int
    question_count: int


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    top_k: int = Field(default=5, ge=1, le=20)


class SearchHit(BaseModel):
    index: int
    chunk_id: int
    document_id: int
    document_name: str
    chunk_index: int
    snippet: str
    score: float


class SearchResponse(BaseModel):
    query: str
    hits: list[SearchHit]
    elapsed_ms: int
