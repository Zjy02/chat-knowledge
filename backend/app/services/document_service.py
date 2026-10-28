"""Background document indexing task.

The FastAPI BackgroundTask owns a fresh DB session because the request session
is closed after the 202 response. Parsing CPU work runs in a thread so the
event loop can keep serving SSE conversations.
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy import delete

from app.core.config import settings
from app.db.session import get_session_factory
from app.models.chunk import Chunk
from app.models.document import Document
from app.models.enums import DocumentStatus
from app.services.document_parser import chunk_text, extract_text

logger = logging.getLogger("zhiwen.document")


async def process_document(document_id: int, raw: bytes) -> None:
    """Parse and index an uploaded document in the background.

    Raw bytes are intentionally not persisted: the source of truth after upload
    is the extracted text. A crashed processing job is marked failed on the next
    container start by `recover_stuck_documents`.
    """
    factory = get_session_factory()
    async with factory() as db:
        document = await db.get(Document, document_id)
        if document is None:
            return
        try:
            text = await asyncio.to_thread(extract_text, document.filename, raw)
            pieces = chunk_text(text, settings.chunk_size, settings.chunk_overlap)
            if not pieces:
                raise ValueError("没有可索引的文本片段")
            await db.execute(delete(Chunk).where(Chunk.document_id == document.id))
            db.add_all(
                [
                    Chunk(
                        document_id=document.id,
                        user_id=document.user_id,
                        chunk_index=index,
                        content=piece,
                        char_count=len(piece),
                    )
                    for index, piece in enumerate(pieces)
                ]
            )
            document.content = text
            document.chunk_count = len(pieces)
            document.status = DocumentStatus.READY
            document.error_message = None
            logger.info(
                "document indexed document_id=%s chunks=%s", document.id, len(pieces)
            )
        except Exception as exc:
            document.status = DocumentStatus.FAILED
            document.error_message = str(exc)[:500]
            document.chunk_count = 0
            logger.warning("document parse failed id=%s: %s", document.id, exc)
        await db.commit()


async def recover_stuck_documents() -> None:
    """Mark jobs left in processing after a restart as retryable failures."""
    from sqlalchemy import update

    factory = get_session_factory()
    async with factory() as db:
        await db.execute(
            update(Document)
            .where(Document.status == DocumentStatus.PROCESSING)
            .values(
                status=DocumentStatus.FAILED,
                error_message="服务重启导致解析中断，请删除后重新上传",
            )
        )
        await db.commit()
