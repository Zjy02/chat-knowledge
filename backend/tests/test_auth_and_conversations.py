from __future__ import annotations


async def test_health(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["database"] == "ok"
    assert body["llm"]["provider"] == "mock"


async def test_register_login_and_me(client):
    payload = {
        "email": "alice@example.com",
        "password": "Demo1234",
        "name": "Alice",
    }
    created = await client.post("/api/auth/register", json=payload)
    assert created.status_code == 201, created.text
    token = created.json()["access_token"]
    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == payload["email"]

    duplicate = await client.post("/api/auth/register", json=payload)
    assert duplicate.status_code == 409
    assert duplicate.json()["code"] == "EMAIL_EXISTS"

    login = await client.post(
        "/api/auth/login", json={"email": payload["email"], "password": payload["password"]}
    )
    assert login.status_code == 200
    wrong = await client.post(
        "/api/auth/login", json={"email": payload["email"], "password": "Wrong1234"}
    )
    assert wrong.status_code == 401
    assert wrong.json()["code"] == "INVALID_CREDENTIALS"


async def test_weak_password_rejected(client):
    response = await client.post(
        "/api/auth/register",
        json={"email": "weak@example.com", "password": "12345678", "name": "Weak"},
    )
    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


async def test_me_requires_token(client):
    response = await client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"


async def test_conversation_crud(client, auth_user):
    headers = auth_user["headers"]
    created = await client.post("/api/conversations", json={"title": "我的会话"}, headers=headers)
    assert created.status_code == 201
    conversation = created.json()
    conversation_id = conversation["id"]
    assert conversation["title"] == "我的会话"

    listed = await client.get("/api/conversations", headers=headers)
    assert listed.status_code == 200
    assert any(item["id"] == conversation_id for item in listed.json())

    detail = await client.get(f"/api/conversations/{conversation_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["messages"] == []

    renamed = await client.patch(
        f"/api/conversations/{conversation_id}",
        json={"title": "新的标题"},
        headers=headers,
    )
    assert renamed.status_code == 200
    assert renamed.json()["title"] == "新的标题"

    deleted = await client.delete(f"/api/conversations/{conversation_id}", headers=headers)
    assert deleted.status_code == 204
    missing = await client.get(f"/api/conversations/{conversation_id}", headers=headers)
    assert missing.status_code == 404


async def test_conversation_isolation(client, user_factory):
    alice = await user_factory("Alice")
    bob = await user_factory("Bob")
    created = await client.post(
        "/api/conversations", json={"title": "Alice only"}, headers=alice["headers"]
    )
    conversation_id = created.json()["id"]

    assert (
        await client.get(f"/api/conversations/{conversation_id}", headers=bob["headers"])
    ).status_code == 404
    assert (
        await client.delete(f"/api/conversations/{conversation_id}", headers=bob["headers"])
    ).status_code == 404
    assert (
        await client.patch(
            f"/api/conversations/{conversation_id}",
            json={"title": "hack"},
            headers=bob["headers"],
        )
    ).status_code == 404


async def test_create_conversation_without_title(client, auth_user):
    created = await client.post("/api/conversations", json={}, headers=auth_user["headers"])
    assert created.status_code == 201
    assert created.json()["title"] == "新对话"
