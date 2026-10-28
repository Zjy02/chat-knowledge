"""FastAPI application entrypoint.

Startup deliberately retries the database connection because Docker Compose can
start the API before MySQL is ready. In development we optionally create tables
directly; in production Alembic migrations are the source of truth.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import settings
from app.core.middleware import (
    configure_logging,
    register_exception_handlers,
    setup_middlewares,
)
from app.db.session import close_db, init_db
from app.services.document_service import recover_stuck_documents

logger = logging.getLogger("zhiwen")


async def _init_with_retry(attempts: int = 8) -> None:
    """Wait for MySQL in Compose, then create dev tables if enabled."""
    for attempt in range(1, attempts + 1):
        try:
            await init_db()
            return
        except Exception as exc:
            if attempt >= attempts:
                raise
            logger.warning("database init failed (attempt %s/%s): %s", attempt, attempts, exc)
            await asyncio.sleep(2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    await _init_with_retry()
    hidden = settings.secret_key.startswith("dev-only")
    if hidden:
        logger.warning("using development SECRET_KEY; set SECRET_KEY in production")
    try:
        await recover_stuck_documents()
    except Exception:
        logger.exception("failed to recover stuck documents")
    logger.info(
        "zhiwen api started env=%s llm=%s db=%s",
        settings.environment,
        settings.llm_provider,
        settings.database_url.split("@")[-1],
    )
    yield
    await close_db()


app = FastAPI(
    title="知问 API",
    description="AI 知识问答工作台：多轮对话、SSE 流式回答、个人知识库与可溯源引用。",
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)
setup_middlewares(app)
register_exception_handlers(app)
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/", include_in_schema=False)
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/api/docs",
        "health": "/api/health",
    }
