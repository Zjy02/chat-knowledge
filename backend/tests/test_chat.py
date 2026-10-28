from __future__ import annotations

from tests.conftest import parse_sse, sse_json

DOC = (
    "RAG 工程实践笔记\n\n"
    "混合检索把 BM25 与向量检索融合。RRF 只依赖排名，按 1/(k+rank) 累加，k 取 60。"
    "如果没有标注集，建议先用 RRF 上线。\n\n" * 10
)


async def test_chat_stream_with_citations(client, auth_user):
    headers = auth_user["headers"]
    await client.post(
        "/api/knowledge/documents",
        headers=headers,
        files={"file": ("rag.md", DOC.encode(), "text/markdown")},
    )
    response = await client.post(
        "/api/chat/stream",
        headers=headers,
        json={"message": "BM25 和向量怎么融合？", "use_knowledge": True},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    events = parse_sse(response.text)
    meta = sse_json(events, "meta")
    citations = sse_json(events, "citations")
    done = sse_json(events, "done")

    assert meta["conversation_id"]
    assert meta["title"].startswith("BM25")
    assert citations["citations"]
    assert citations["citations"][0]["document_name"] == "rag.md"
    assert done["status"] == "completed"
    assert done["content_length"] > 0
    assert any(item["event"] == "delta" for item in events)

    detail = await client.get(
        f"/api/conversations/{meta['conversation_id']}", headers=headers
    )
    messages = detail.json()["messages"]
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"
    assert messages[1]["status"] == "completed"
    assert messages[1]["citations"][0]["index"] == 1
    assert "演示模式" in messages[1]["content"]


async def test_chat_without_knowledge(client, auth_user):
    response = await client.post(
        "/api/chat/stream",
        headers=auth_user["headers"],
        json={"message": "介绍一下你自己", "use_knowledge": False},
    )
    events = parse_sse(response.text)
    citations = sse_json(events, "citations")
    assert citations["citations"] == []
    assert sse_json(events, "done")["status"] == "completed"


async def test_regenerate_replaces_assistant(client, auth_user):
    headers = auth_user["headers"]
    first = await client.post(
        "/api/chat/stream",
        headers=headers,
        json={"message": "什么是 RRF？", "use_knowledge": False},
    )
    meta = sse_json(parse_sse(first.text), "meta")
    conversation_id = meta["conversation_id"]

    regenerated = await client.post(
        "/api/chat/stream",
        headers=headers,
        json={
            "conversation_id": conversation_id,
            "use_knowledge": False,
            "regenerate": True,
        },
    )
    assert regenerated.status_code == 200
    regen_meta = sse_json(parse_sse(regenerated.text), "meta")
    assert regen_meta["regenerated"] is True
    assert regen_meta["conversation_id"] == conversation_id

    detail = await client.get(f"/api/conversations/{conversation_id}", headers=headers)
    messages = detail.json()["messages"]
    assert len(messages) == 2
    assert messages[1]["role"] == "assistant"


async def test_chat_validation_and_isolation(client, user_factory):
    alice = await user_factory("Alice")
    bob = await user_factory("Bob")
    conversation = await client.post(
        "/api/conversations", json={"title": "Alice"}, headers=alice["headers"]
    )
    conversation_id = conversation.json()["id"]

    forbidden = await client.post(
        "/api/chat/stream",
        headers=bob["headers"],
        json={"conversation_id": conversation_id, "message": "越权", "use_knowledge": False},
    )
    assert forbidden.status_code == 404

    empty = await client.post(
        "/api/chat/stream",
        headers=alice["headers"],
        json={"message": "   ", "use_knowledge": False},
    )
    assert empty.status_code == 422

    unauthenticated = await client.post(
        "/api/chat/stream", json={"message": "hello", "use_knowledge": False}
    )
    assert unauthenticated.status_code == 401


async def test_regenerate_requires_conversation(client, auth_user):
    response = await client.post(
        "/api/chat/stream",
        headers=auth_user["headers"],
        json={"regenerate": True},
    )
    assert response.status_code == 422
