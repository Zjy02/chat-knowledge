"""SSE chat request and event payload schemas."""

from typing import Literal

from pydantic import BaseModel, Field, model_validator


class ChatStreamRequest(BaseModel):
    conversation_id: int | None = None
    message: str = Field(default="", max_length=2000)
    use_knowledge: bool = True
    regenerate: bool = False

    @model_validator(mode="after")
    def validate_message(self):
        if self.regenerate:
            if not self.conversation_id:
                raise ValueError("重新生成时必须提供 conversation_id")
        elif not self.message.strip():
            raise ValueError("问题不能为空")
        return self


class ChatMeta(BaseModel):
    conversation_id: int
    user_message_id: int
    assistant_message_id: int
    title: str
    model: str
    use_knowledge: bool
    regenerated: bool = False


class ChatDone(BaseModel):
    assistant_message_id: int
    latency_ms: int
    content_length: int
    status: Literal["completed", "interrupted", "failed"]
