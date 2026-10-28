"""Message model for persisted user/assistant turns.

Citations are stored as JSON because they are a small, immutable snapshot. A
separate join table would add joins without giving us query requirements in v1.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import ID_TYPE, Base, utcnow
from app.models.enums import MessageRole, MessageStatus

if TYPE_CHECKING:
    from app.models.conversation import Conversation


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(ID_TYPE, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(
        ID_TYPE,
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ID_TYPE,
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    role: Mapped[MessageRole] = mapped_column(
        SAEnum(MessageRole, native_enum=False, length=16), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[MessageStatus] = mapped_column(
        SAEnum(MessageStatus, native_enum=False, length=16),
        nullable=False,
        default=MessageStatus.COMPLETED,
    )
    citations: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    conversation: Mapped[Conversation] = relationship(back_populates="messages")
