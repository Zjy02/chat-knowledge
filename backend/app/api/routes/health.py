"""Liveness/readiness endpoint for Compose and load balancers."""

from fastapi import APIRouter

from app.core.config import settings
from app.db.session import ping_db

router = APIRouter(tags=["system"])


@router.get("/health")
async def health():
    database_ok = await ping_db()
    return {
        "status": "ok" if database_ok else "degraded",
        "version": settings.app_version,
        "environment": settings.environment,
        "database": "ok" if database_ok else "unavailable",
        "llm": {
            "provider": settings.llm_provider,
            "model": settings.llm_model,
            "configured": settings.llm_is_configured,
        },
    }
