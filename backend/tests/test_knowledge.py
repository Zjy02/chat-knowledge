from __future__ import annotations

DOC = (
    "RAG 工程实践笔记\n\n"
    "混合检索把 BM25 的精确词命中与向量检索的语义召回融合。"
    "RRF 只依赖排名，按 1/(k+rank) 累加，k 取 60。"
    + "离线实验显示混合检索将 Recall@5 提升 12% 到 18%。\n\n" * 8
    + "重排使用 Cross-Encoder，把 Top 20 重排到 Top 5，会增加 80 到 150 毫秒延迟。\n\n" * 8
)


async def _upload(client, headers, name="rag.md", content=DOC):
    return await client.post(
        "/api/knowledge/documents",
        headers=headers,
        files={"file": (name, content.encode("utf-8"), "text/markdown")},
    )


async def test_upload_list_stats_and_search(client, auth_user):
    headers = auth_user["headers"]
    uploaded = await _upload(client, headers)
    assert uploaded.status_code == 202, uploaded.text
    assert uploaded.json()["status"] == "processing"

    listed = await client.get("/api/knowledge/documents", headers=headers)
    assert listed.status_code == 200
    document = listed.json()[0]
    assert document["status"] == "ready"
    assert document["chunk_count"] > 0

    stats = await client.get("/api/knowledge/stats", headers=headers)
    assert stats.status_code == 200
    assert stats.json()["document_count"] == 1
    assert stats.json()["chunk_count"] == document["chunk_count"]

    search = await client.post(
        "/api/knowledge/search",
        headers=headers,
        json={"query": "BM25 和向量怎么融合", "top_k": 3},
    )
    assert search.status_code == 200
    body = search.json()
    assert body["hits"]
    assert body["hits"][0]["document_name"] == "rag.md"
    assert 0 <= body["hits"][0]["score"] <= 1
    assert all(0 <= hit["score"] <= 1 for hit in body["hits"])


async def test_document_toggle_delete_and_isolation(client, user_factory):
    alice = await user_factory("Alice")
    bob = await user_factory("Bob")
    uploaded = await _upload(client, alice["headers"])
    document_id = uploaded.json()["id"]

    toggled = await client.patch(
        f"/api/knowledge/documents/{document_id}",
        headers=alice["headers"],
        json={"enabled": False},
    )
    assert toggled.status_code == 200
    assert toggled.json()["enabled"] is False

    search = await client.post(
        "/api/knowledge/search",
        headers=alice["headers"],
        json={"query": "BM25"},
    )
    assert search.json()["hits"] == []

    assert (
        await client.patch(
            f"/api/knowledge/documents/{document_id}",
            headers=bob["headers"],
            json={"enabled": True},
        )
    ).status_code == 404

    assert (
        await client.delete(
            f"/api/knowledge/documents/{document_id}", headers=bob["headers"]
        )
    ).status_code == 404

    deleted = await client.delete(
        f"/api/knowledge/documents/{document_id}", headers=alice["headers"]
    )
    assert deleted.status_code == 204
    assert (await client.get("/api/knowledge/documents", headers=alice["headers"])).json() == []


async def test_invalid_upload(client, auth_user):
    response = await client.post(
        "/api/knowledge/documents",
        headers=auth_user["headers"],
        files={"file": ("bad.exe", b"MZ", "application/octet-stream")},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_FILE"


async def test_corrupt_pdf_becomes_failed(client, auth_user):
    response = await client.post(
        "/api/knowledge/documents",
        headers=auth_user["headers"],
        files={"file": ("broken.pdf", b"%PDF-1.4 broken", "application/pdf")},
    )
    assert response.status_code == 202
    listed = await client.get("/api/knowledge/documents", headers=auth_user["headers"])
    document = next(item for item in listed.json() if item["filename"] == "broken.pdf")
    assert document["status"] == "failed"
    assert document["error_message"]
