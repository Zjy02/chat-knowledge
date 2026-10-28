"""String enums shared by ORM models and API schemas.

StrEnum values serialize as human-readable strings while SQLAlchemy stores the
enum member name in a VARCHAR column (native_enum=False), which keeps SQLite and
MySQL migrations simple.
"""

from enum import StrEnum


class MessageRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class MessageStatus(StrEnum):
    COMPLETED = "completed"
    STREAMING = "streaming"
    INTERRUPTED = "interrupted"
    FAILED = "failed"


class DocumentStatus(StrEnum):
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"
