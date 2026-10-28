"""Knowledge base upload, listing, toggle, delete and retrieval-test APIs."""

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.rate_limit import rate_limiter
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.chunk import Chunk
from app.models.document import Document
from app.models.enums import DocumentStatus, MessageRole
from app.models.message import Message
from app.models.user import User
from app.schemas.document import (
    DocumentOut,
    DocumentUpdate,
    KnowledgeStats,
    SearchHit,
    SearchRequest,
    SearchResponse,
)
from app.services.document_parser import (
    DocumentParseError,
    file_extension,
    normalize_filename,
    validate_upload,
)
from app.services.document_service import process_document
from app.services.retrieval import search_chunks

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


async def _get_owned_document(db: AsyncSession, user_id: int, document_id: int) -> Document:
    document = await db.scalar(
        select(Document).where(Document.id == document_id, Document.user_id == user_id)
    )
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DOCUMENT_NOT_FOUND", "message": "资料不存在"},
        )
    return document


@router.get("/stats", response_model=KnowledgeStats)
async def stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document_count = await db.scalar(
        select(func.count(Document.id)).where(Document.user_id == user.id)
    )
    ready_count = await db.scalar(
        select(func.count(Document.id)).where(
            Document.user_id == user.id, Document.status == DocumentStatus.READY
        )
    )
    chunk_count = await db.scalar(
        select(func.coalesce(func.sum(Document.chunk_count), 0)).where(
            Document.user_id == user.id
        )
    )
    question_count = await db.scalar(
        select(func.count(Message.id)).where(
            Message.user_id == user.id, Message.role == MessageRole.USER
        )
    )
    return KnowledgeStats(
        document_count=int(document_count or 0),
        ready_count=int(ready_count or 0),
        chunk_count=int(chunk_count or 0),
        question_count=int(question_count or 0),
    )


@router.get("/documents", response_model=list[DocumentOut])
async def list_documents(
    status_filter: DocumentStatus | None = Query(default=None, alias="status"),
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Document).where(Document.user_id == user.id)
    if status_filter is not None:
        stmt = stmt.where(Document.status == status_filter)
    if q:
        stmt = stmt.where(Document.filename.contains(q.strip()[:80]))
    documents = (
        await db.scalars(stmt.order_by(Document.created_at.desc()).limit(100))
    ).all()
    return [DocumentOut.model_validate(item) for item in documents]


@router.post("/documents", response_model=DocumentOut, status_code=202)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if settings.rate_limit_enabled and not await rate_limiter.allow(
        f"upload:{user.id}", 20, 3600
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"code": "RATE_LIMITED", "message": "上传过于频繁，请稍后再试"},
        )

    filename = normalize_filename(file.filename or "未命名文件")
    max_bytes = settings.max_upload_mb * 1024 * 1024
    data = await file.read(max_bytes + 1)
    await file.close()
    try:
        validate_upload(filename, data, max_bytes)
    except DocumentParseError as exc:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_FILE", "message": str(exc)},
        ) from exc

    document = Document(
        user_id=user.id,
        filename=filename,
        file_type=file_extension(filename).lstrip("."),
        file_size=len(data),
        content="",
        status=DocumentStatus.PROCESSING,
        chunk_count=0,
        enabled=True,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    # Return 202 immediately; parsing a 10MB PDF is too slow for the request
    # path and the frontend polls the document status until it becomes ready.
    background_tasks.add_task(process_document, document.id, data)
    return DocumentOut.model_validate(document)


@router.patch("/documents/{document_id}", response_model=DocumentOut)
async def update_document(
    document_id: int,
    payload: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document = await _get_owned_document(db, user.id, document_id)
    document.enabled = payload.enabled
    await db.commit()
    await db.refresh(document)
    return DocumentOut.model_validate(document)


@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document = await _get_owned_document(db, user.id, document_id)
    # Explicit chunk deletion also works on SQLite, where FK cascades are off by
    # default, and keeps production behavior independent of DB settings.
    await db.execute(delete(Chunk).where(Chunk.document_id == document.id))
    await db.delete(document)
    await db.commit()
    return Response(status_code=204)


@router.post("/search", response_model=SearchResponse)
async def search(
    payload: SearchRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    chunks, elapsed = await search_chunks(
        db, user.id, payload.query, top_k=payload.top_k
    )
    return SearchResponse(
        query=payload.query,
        elapsed_ms=elapsed,
        hits=[
            SearchHit(
                index=index,
                chunk_id=item.chunk_id,
                document_id=item.document_id,
                document_name=item.document_name,
                chunk_index=item.chunk_index,
                snippet=(
                    item.content[:220].strip() + ("…" if len(item.content) > 220 else "")
                ),
                score=item.score,
            )
            for index, item in enumerate(chunks, start=1)
        ],
    )
