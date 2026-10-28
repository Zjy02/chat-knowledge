from __future__ import annotations

import os
import uuid
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./data/test.db")
os.environ.setdefault("AUTO_CREATE_TABLES", "true")
os.environ.setdefault("LLM_PROVIDER", "mock")
os.environ.setdefault("MOCK_STREAM_DELAY", "0")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-zhiwen")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
os.environ.setdefault("ENVIRONMENT", "test")

import httpx
import pytest
from asgi_lifespan import LifespanManager

from app.main import app


@pytest.fixture(scope="session", autouse=True)
def clean_test_db():
    path = Path("data/test.db")
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()


@pytest.fixture
async def client():
    async with LifespanManager(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            yield c


@pytest.fixture
def user_factory(client):
    async def create(name: str = "测试用户"):
        email = f"user-{uuid.uuid4().hex[:10]}@example.com"
        password = "Demo1234"
        response = await client.post(
            "/api/auth/register",
            json={"email": email, "password": password, "name": name},
        )
        assert response.status_code == 201, response.text
        data = response.json()
        return {
            "email": email,
            "password": password,
            "token": data["access_token"],
            "user": data["user"],
            "headers": {"Authorization": f"Bearer {data['access_token']}"},
        }

    return create


@pytest.fixture
async def auth_user(user_factory):
    return await user_factory()


def parse_sse(body: str) -> list[dict]:
    events: list[dict] = []
    for block in body.split("\n\n"):
        block = block.strip()
        if not block or block.startswith(":"):
            continue
        event = "message"
        data_lines: list[str] = []
        for line in block.splitlines():
            if line.startswith("event:"):
                event = line[6:].strip()
            elif line.startswith("data:"):
                data_lines.append(line[5:].strip())
        if data_lines:
            events.append({"event": event, "data": "\n".join(data_lines)})
    return events


def sse_json(events: list[dict], name: str):
    import json

    for item in events:
        if item["event"] == name:
            return json.loads(item["data"])
    return None
