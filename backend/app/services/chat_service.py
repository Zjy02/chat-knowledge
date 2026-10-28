"""The streaming chat turn implementation.

Invariants:
1. Conversation ownership is validated BEFORE any SSE header is sent, so normal
   HTTP errors still reach the client as JSON.
2. A placeholder assistant row is committed before generation starts. If the
   client disconnects, the partial answer can still be saved as `interrupted`.
3. The request-scoped AsyncSession is kept alive by StreamingResponse; all
   writes happen inside the generator's try/finally.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import time
from collections.abc import AsyncIterator

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.base import utcnow
from app.models.conversation import Conversation
from app.models.enums import MessageRole, MessageStatus
from app.models.message import Message
from app.models.user import User
from app.schemas.chat import ChatStreamRequest
from app.services.llm import (
    LLMError,
    build_messages,
    stream_mock_answer,
    stream_openai_compatible,
)
from app.services.retrieval import citations_from_chunks, search_chunks

logger = logging.getLogger("zhiwen.chat")
HEARTBEAT_SECONDS = 15.0


def sse_event(event: str, data: dict) -> str:
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    return f"event: {event}\ndata: {payload}\n\n"


def title_from_question(question: str) -> str:
    title = " ".join(question.replace("#", " ").split()).strip()
    if not title:
        return "新对话"
    return title[:30] + ("…" if len(title) > 30 else "")


async def get_owned_conversation(
    db: AsyncSession, user_id: int, conversation_id: int
) -> Conversation:
    conversation = await db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id, Conversation.user_id == user_id
        )
    )
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CONVERSATION_NOT_FOUND", "message": "会话不存在"},
        )
    return conversation


async def _history(db: AsyncSession, conversation_id: int, before_id: int) -> list[dict]:
    rows = (
        await db.scalars(
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.id < before_id,
                Message.role.in_([MessageRole.USER, MessageRole.ASSISTANT]),
                Message.status == MessageStatus.COMPLETED,
            )
            .order_by(Message.id.desc())
            .limit(10)
        )
    ).all()
    return [{"role": item.role.value, "content": item.content} for item in reversed(rows)]


async def _refresh_count(db: AsyncSession, conversation: Conversation) -> None:
    await db.flush()
    count = await db.scalar(
        select(func.count(Message.id)).where(Message.conversation_id == conversation.id)
    )
    conversation.message_count = int(count or 0)


async def _stream_with_heartbeat(source: AsyncIterator[str]) -> AsyncIterator[str]:
    iterator = source.__aiter__()
    while True:
        try:
            item = await asyncio.wait_for(iterator.__anext__(), timeout=HEARTBEAT_SECONDS)
        except StopAsyncIteration:
            break
        except TimeoutError:
            yield ": ping\n\n"
            continue
        yield item


class ChatStreamer:
    def __init__(self, db: AsyncSession, user: User, payload: ChatStreamRequest):
        self.db = db
        self.user = user
        self.payload = payload
        self.started = time.perf_counter()
        self.conversation: Conversation | None = None
        self.user_message: Message | None = None
        self.assistant_message: Message | None = None
        self.question = ""
        self.parts: list[str] = []
        self.citations: list[dict] = []
        self.persisted = False
        self.prepared = False

    async def prepare(self) -> None:
        """Validate and persist the turn before SSE headers are sent."""
        if self.prepared:
            return
        try:
            await self._prepare()
            self.prepared = True
        except Exception:
            with contextlib.suppress(Exception):
                await self.db.rollback()
            raise

    async def _prepare(self) -> None:
        payload = self.payload
        now = utcnow()
        if payload.regenerate:
            # Regeneration reuses the last user message. Any assistant rows
            # after it (including a previous interrupted placeholder) are
            # removed so message_count stays consistent.
            if not payload.conversation_id:
                raise HTTPException(status_code=400, detail="缺少 conversation_id")
            conversation = await get_owned_conversation(
                self.db, self.user.id, payload.conversation_id
            )
            last_user = await self.db.scalar(
                select(Message)
                .where(
                    Message.conversation_id == conversation.id,
                    Message.role == MessageRole.USER,
                )
                .order_by(Message.id.desc())
                .limit(1)
            )
            if last_user is None:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "NOTHING_TO_REGENERATE", "message": "没有可重新生成的问题"},
                )
            await self.db.execute(
                delete(Message).where(
                    Message.conversation_id == conversation.id,
                    Message.id > last_user.id,
                )
            )
            self.user_message = last_user
            self.question = last_user.content
            self.conversation = conversation
        else:
            if payload.conversation_id:
                conversation = await get_owned_conversation(
                    self.db, self.user.id, payload.conversation_id
                )
            else:
                conversation = Conversation(
                    user_id=self.user.id,
                    title=title_from_question(payload.message),
                    message_count=0,
                    last_message_at=now,
                )
                self.db.add(conversation)
                await self.db.flush()
            self.conversation = conversation
            self.question = payload.message.strip()
            self.user_message = Message(
                conversation_id=conversation.id,
                user_id=self.user.id,
                role=MessageRole.USER,
                content=self.question,
                status=MessageStatus.COMPLETED,
            )
            self.db.add(self.user_message)
            await self.db.flush()
            if conversation.message_count == 0 and conversation.title == "新对话":
                conversation.title = title_from_question(self.question)

        # Persist the assistant placeholder BEFORE generation. A disconnected
        # client then leaves a recoverable partial answer instead of a gap.
        self.assistant_message = Message(
            conversation_id=self.conversation.id,
            user_id=self.user.id,
            role=MessageRole.ASSISTANT,
            content="",
            status=MessageStatus.STREAMING,
            citations=None,
        )
        self.db.add(self.assistant_message)
        await self.db.flush()
        await _refresh_count(self.db, self.conversation)
        self.conversation.last_message_at = now
        await self.db.commit()

    def _meta(self) -> str:
        assert self.conversation and self.user_message and self.assistant_message
        return sse_event(
            "meta",
            {
                "conversation_id": self.conversation.id,
                "user_message_id": self.user_message.id,
                "assistant_message_id": self.assistant_message.id,
                "title": self.conversation.title,
                "model": settings.llm_model,
                "use_knowledge": self.payload.use_knowledge,
                "regenerated": self.payload.regenerate,
            },
        )

    async def _retrieve(self) -> None:
        if not self.payload.use_knowledge:
            self.citations = []
            return
        try:
            # Retrieval failure must not break the conversation: degrade to an
            # ungrounded answer and let the prompt state that no source was found.
            chunks, _ = await search_chunks(self.db, self.user.id, self.question)
            self.citations = citations_from_chunks(chunks, self.question)
        except Exception:
            logger.exception("retrieval_failed user_id=%s", self.user.id)
            self.citations = []

    async def _persist(self, message_status: MessageStatus) -> None:
        # Called from normal completion, error handling and cancellation. The
        # `persisted` flag makes the finally-block call idempotent.
        if self.persisted or self.assistant_message is None:
            return
        try:
            self.assistant_message.content = "".join(self.parts)
            self.assistant_message.status = message_status
            self.assistant_message.citations = self.citations or None
            self.assistant_message.latency_ms = int((time.perf_counter() - self.started) * 1000)
            if self.conversation:
                self.conversation.last_message_at = utcnow()
            await self.db.commit()
            self.persisted = True
        except Exception:
            logger.exception("persist_assistant_failed message_id=%s", self.assistant_message.id)
            with contextlib.suppress(Exception):
                await self.db.rollback()

    async def _source(self) -> AsyncIterator[str]:
        await self.prepare()
        assert self.assistant_message and self.user_message and self.conversation
        # Event order is part of the frontend contract: identify the turn first,
        # then sources, then content deltas, then a terminal done/error event.
        yield self._meta()

        await self._retrieve()
        yield sse_event("citations", {"citations": self.citations})

        history = await _history(self.db, self.conversation.id, self.user_message.id)
        messages = build_messages(
            self.question, history, self.citations, self.payload.use_knowledge
        )
        try:
            if settings.llm_provider == "mock" or not settings.llm_is_configured:
                source = stream_mock_answer(
                    self.question, self.citations, self.payload.use_knowledge
                )
            else:
                source = stream_openai_compatible(messages)
            async for delta in source:
                if not delta:
                    continue
                self.parts.append(delta)
                yield sse_event("delta", {"content": delta})
            if not self.parts:
                raise LLMError("模型没有返回内容")
            await self._persist(MessageStatus.COMPLETED)
            latency_ms = int((time.perf_counter() - self.started) * 1000)
            yield sse_event(
                "done",
                {
                    "assistant_message_id": self.assistant_message.id,
                    "latency_ms": latency_ms,
                    "content_length": len("".join(self.parts)),
                    "status": "completed",
                },
            )
        except asyncio.CancelledError:
            await self._persist(MessageStatus.INTERRUPTED)
            raise
        except Exception as exc:
            logger.exception("chat_stream_failed conversation_id=%s", self.conversation.id)
            await self._persist(MessageStatus.FAILED)
            message = str(exc) if isinstance(exc, LLMError) else "生成回答时出现问题，请稍后重试"
            yield sse_event("error", {"code": "LLM_ERROR", "message": message})

    async def stream(self) -> AsyncIterator[str]:
        source = self._source()
        try:
            async for event in _stream_with_heartbeat(source):
                yield event
        finally:
            # Even if the client disappears mid-stream, keep whatever text was
            # produced. The user can reopen the conversation and retry.
            with contextlib.suppress(Exception):
                await self._persist(MessageStatus.INTERRUPTED)
