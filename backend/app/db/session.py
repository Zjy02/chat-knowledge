"""Async engine/session lifecycle.

The engine is created lazily so tests can override DATABASE_URL before the app
imports. Routes receive a request-scoped AsyncSession through `get_db`; the SSE
generator keeps that same session open until the stream finishes.
"""

from collections.abc import AsyncIterator
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.db.base import Base

_engine = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _engine_kwargs() -> dict:
    kwargs: dict = {"echo": settings.sql_echo, "pool_pre_ping": True}
    if settings.database_url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs.update({"pool_size": 10, "max_overflow": 20, "pool_recycle": 1800})
    return kwargs


def _ensure_sqlite_parent() -> None:
    """SQLite cannot create its own parent directory on first boot."""
    if not settings.database_url.startswith("sqlite"):
        return
    raw_path = settings.database_url.split("///")[-1]
    if raw_path and raw_path != ":memory:":
        Path(raw_path).expanduser().parent.mkdir(parents=True, exist_ok=True)


def get_engine():
    global _engine
    if _engine is None:
        _ensure_sqlite_parent()
        _engine = create_async_engine(settings.database_url, **_engine_kwargs())
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            get_engine(), expire_on_commit=False, class_=AsyncSession
        )
    return _session_factory


async def get_db() -> AsyncIterator[AsyncSession]:
    async with get_session_factory()() as session:
        yield session


async def init_db() -> None:
    if not settings.auto_create_tables:
        return
    async with get_engine().begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if settings.database_url.startswith("sqlite"):
            # SQLite needs an explicit pragma for FK cascade semantics in tests.
            await conn.execute(text("PRAGMA foreign_keys=ON"))


async def close_db() -> None:
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _session_factory = None


async def ping_db() -> bool:
    try:
        async with get_session_factory()() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception:  # pragma: no cover - only hit when DB is unavailable
        return False
