"""SSE chat endpoint.

`streamer.prepare()` runs before StreamingResponse is constructed on purpose:
ownership errors and validation failures must be normal JSON responses, not
events inside an already-started stream.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.rate_limit import rate_limiter
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.chat import ChatStreamRequest
from app.services.chat_service import ChatStreamer

router = APIRouter(prefix="/chat", tags=["chat"])

SSE_HEADERS = {
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


@router.post("/stream")
async def chat_stream(
    payload: ChatStreamRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if settings.rate_limit_enabled and not await rate_limiter.allow(
        f"chat:{user.id}", 30, 60
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"code": "RATE_LIMITED", "message": "提问过于频繁，请稍后再试"},
        )
    streamer = ChatStreamer(db, user, payload)
    # Validate ownership and persist the turn before sending SSE headers so
    # business errors can still return a normal JSON HTTP response.
    await streamer.prepare()
    return StreamingResponse(
        streamer.stream(),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )
