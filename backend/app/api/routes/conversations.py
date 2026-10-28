"""Conversation CRUD.

Every query is scoped by user_id. A missing resource and another user's
resource both return 404, which avoids leaking whether an ID exists.
"""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User
from app.schemas.conversation import (
    ConversationCreate,
    ConversationDetail,
    ConversationSummary,
    ConversationUpdate,
    MessageOut,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _summary(conversation: Conversation, last_message: str | None) -> ConversationSummary:
    preview = " ".join((last_message or "").split())[:80] or None
    return ConversationSummary(
        id=conversation.id,
        title=conversation.title,
        message_count=conversation.message_count,
        last_message_at=conversation.last_message_at,
        created_at=conversation.created_at,
        last_message=preview,
    )


async def _get_owned(db: AsyncSession, user_id: int, conversation_id: int) -> Conversation:
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


@router.get("", response_model=list[ConversationSummary])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conversations = (
        await db.scalars(
            select(Conversation)
            .where(Conversation.user_id == user.id)
            .order_by(Conversation.last_message_at.desc(), Conversation.id.desc())
            .limit(100)
        )
    ).all()
    if not conversations:
        return []
    ids = [item.id for item in conversations]
    rows = (
        await db.execute(
            select(Message.conversation_id, Message.content)
            .where(Message.conversation_id.in_(ids), Message.user_id == user.id)
            .order_by(Message.id.desc())
        )
    ).all()
    latest: dict[int, str] = {}
    for conversation_id, content in rows:
        latest.setdefault(conversation_id, content)
    return [_summary(item, latest.get(item.id)) for item in conversations]


@router.post("", response_model=ConversationSummary, status_code=201)
async def create_conversation(
    payload: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    title = (payload.title or "新对话").strip()[:120] or "新对话"
    conversation = Conversation(user_id=user.id, title=title, message_count=0)
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return _summary(conversation, None)


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conversation = await _get_owned(db, user.id, conversation_id)
    messages = (
        await db.scalars(
            select(Message)
            .where(
                Message.conversation_id == conversation.id,
                Message.user_id == user.id,
            )
            .order_by(Message.id)
        )
    ).all()
    return ConversationDetail(
        id=conversation.id,
        title=conversation.title,
        message_count=conversation.message_count,
        last_message_at=conversation.last_message_at,
        created_at=conversation.created_at,
        messages=[MessageOut.model_validate(item) for item in messages],
    )


@router.patch("/{conversation_id}", response_model=ConversationSummary)
async def update_conversation(
    conversation_id: int,
    payload: ConversationUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conversation = await _get_owned(db, user.id, conversation_id)
    title = payload.title.strip()
    if not title:
        raise HTTPException(
            status_code=422,
            detail={"code": "VALIDATION_ERROR", "message": "标题不能为空"},
        )
    conversation.title = title[:120]
    await db.commit()
    await db.refresh(conversation)
    last = await db.scalar(
        select(Message.content)
        .where(Message.conversation_id == conversation.id, Message.user_id == user.id)
        .order_by(Message.id.desc())
        .limit(1)
    )
    return _summary(conversation, last)


@router.delete("/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conversation = await _get_owned(db, user.id, conversation_id)
    await db.execute(
        delete(Message).where(
            Message.conversation_id == conversation.id, Message.user_id == user.id
        )
    )
    await db.delete(conversation)
    await db.commit()
    return Response(status_code=204)
