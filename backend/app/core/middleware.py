"""Request tracing, CORS and the unified API error envelope.

Every response carries X-Request-ID and every error uses
`{code, message, request_id}`. This makes frontend handling predictable and
lets us correlate a user-visible error with a server log line.
"""

import json
import logging
import sys
import time
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.context import request_id_ctx

logger = logging.getLogger("zhiwen")


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(message)s"))
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:16]
        token = request_id_ctx.set(request_id)
        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            elapsed = int((time.perf_counter() - started) * 1000)
            logger.exception(
                json.dumps(
                    {
                        "event": "request_error",
                        "request_id": request_id,
                        "method": request.method,
                        "path": request.url.path,
                        "elapsed_ms": elapsed,
                    },
                    ensure_ascii=False,
                )
            )
            raise
        finally:
            request_id_ctx.reset(token)
        elapsed = int((time.perf_counter() - started) * 1000)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            json.dumps(
                {
                    "event": "request",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "elapsed_ms": elapsed,
                },
                ensure_ascii=False,
            )
        )
        return response


def _error_payload(code: str, message: str, request_id: str) -> dict:
    return {"code": code, "message": message, "request_id": request_id}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        request_id = request_id_ctx.get()
        detail = exc.detail
        if isinstance(detail, dict):
            code = str(detail.get("code", "HTTP_ERROR"))
            message = str(detail.get("message", "请求失败"))
        else:
            code = {
                400: "BAD_REQUEST",
                401: "UNAUTHORIZED",
                403: "FORBIDDEN",
                404: "NOT_FOUND",
                409: "CONFLICT",
                413: "FILE_TOO_LARGE",
                429: "RATE_LIMITED",
            }.get(exc.status_code, "HTTP_ERROR")
            message = str(detail)
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(code, message, request_id),
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        request_id = request_id_ctx.get()
        first = exc.errors()[0] if exc.errors() else {}
        loc = [str(item) for item in first.get("loc", []) if item != "body"]
        field = ".".join(loc)
        message = first.get("msg", "参数校验失败")
        if message.startswith("Value error, "):
            message = message.removeprefix("Value error, ")
        if field:
            message = f"{field}: {message}"
        return JSONResponse(
            status_code=422,
            content=_error_payload("VALIDATION_ERROR", message, request_id),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        request_id = request_id_ctx.get()
        logger.exception(
            json.dumps(
                {"event": "unhandled_exception", "request_id": request_id},
                ensure_ascii=False,
            )
        )
        return JSONResponse(
            status_code=500,
            content=_error_payload("INTERNAL_ERROR", "服务暂时不可用，请稍后重试", request_id),
        )


def setup_middlewares(app: FastAPI) -> None:
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )
