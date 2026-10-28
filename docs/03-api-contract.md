# 知问 · API 契约

> Base URL：`/api`  
> 交互式文档：`http://<host>:8000/api/docs`（OpenAPI 3.1）  
> 除注册/登录/健康检查外，所有接口需要 `Authorization: Bearer <JWT>`。

## 1. 通用约定

### 1.1 错误响应

```json
{
  "code": "VALIDATION_ERROR",
  "message": "message: 问题不能为空",
  "request_id": "f3a91b2c7d4e5f60"
}
```

| HTTP | code | 场景 |
| --- | --- | --- |
| 400 | `INVALID_FILE` / `NOTHING_TO_REGENERATE` | 文件非法、无可重生成内容 |
| 401 | `UNAUTHORIZED` / `TOKEN_EXPIRED` / `INVALID_CREDENTIALS` | 未登录、Token 过期、密码错误 |
| 404 | `CONVERSATION_NOT_FOUND` / `DOCUMENT_NOT_FOUND` | 资源不存在或不属于当前用户 |
| 409 | `EMAIL_EXISTS` | 邮箱已注册 |
| 413 | `FILE_TOO_LARGE` | 文件超过 10MB |
| 422 | `VALIDATION_ERROR` | Pydantic 参数校验失败 |
| 429 | `RATE_LIMITED` | 登录/问答/上传超过频率限制 |
| 500 | `INTERNAL_ERROR` | 未处理异常，详情不返回客户端 |

### 1.2 时间与 ID

- 时间：`YYYY-MM-DDTHH:mm:ss`，服务端为 naive UTC；前端展示时按 UTC 解析并转本地时区。
- ID：BIGINT；JSON 中为 number。
- 消息 `role`：`user` / `assistant` / `system`。
- 消息 `status`：`completed` / `streaming` / `interrupted` / `failed`。
- 文档 `status`：`processing` / `ready` / `failed`。

## 2. 鉴权

### POST `/auth/register`

```json
{ "email": "you@example.com", "password": "Demo1234", "name": "周谨宇" }
```

返回 `201`：

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": 1, "email": "you@example.com", "name": "周谨宇", "created_at": "..." }
}
```

密码规则：8–72 位，同时包含字母和数字。

### POST `/auth/login`

```json
{ "email": "demo@zhiwen.app", "password": "Demo1234" }
```

### GET `/auth/me`

返回当前用户。Token 失效时返回 401。

## 3. 会话

### GET `/conversations`

按 `last_message_at` 倒序，最多 100 条：

```json
[
  {
    "id": 1,
    "title": "RAG 召回优化",
    "message_count": 4,
    "last_message_at": "2026-10-28T03:34:50",
    "created_at": "2026-10-28T03:14:50",
    "last_message": "稳妥的顺序是：先 RRF…（截断 80 字）"
  }
]
```

### POST `/conversations`

```json
{ "title": "新对话" }
```

### GET `/conversations/{id}`

返回会话 + 全部消息（含 citations）。

### PATCH `/conversations/{id}`

```json
{ "title": "新标题" }
```

### DELETE `/conversations/{id}`

`204`，级联删除消息。

## 4. 流式问答

### POST `/chat/stream`

请求头：`Content-Type: application/json`、`Authorization: Bearer ...`。

```json
{
  "conversation_id": 1,
  "message": "混合检索里 BM25 和向量分数怎么融合？",
  "use_knowledge": true,
  "regenerate": false
}
```

- `conversation_id` 为空：自动新建会话，标题取问题前 30 字。
- `regenerate=true`：必须提供 `conversation_id`，复用最后一条用户消息，删除其后的旧回答。

响应：`text/event-stream`（SSE）。

```
event: meta
data: {"conversation_id":1,"user_message_id":9,"assistant_message_id":10,"title":"混合检索分数融合","model":"deepseek-chat","use_knowledge":true,"regenerated":false}

event: citations
data: {"citations":[{"index":1,"chunk_id":42,"document_id":3,"document_name":"RAG 工程实践笔记.md","chunk_index":0,"snippet":"RRF 只依赖排名…","content":"RRF 只依赖排名…","score":0.86}]}

event: delta
data: {"content":"稳妥的顺序是："}

event: done
data: {"assistant_message_id":10,"latency_ms":3620,"content_length":486,"status":"completed"}
```

终态：

- `done`：成功；
- `error`：`{"code":"LLM_ERROR","message":"..."}`，已生成的部分仍保存在 assistant 消息中；
- 客户端断开：后端将消息标记为 `interrupted`，保存已生成内容；
- 心跳：空闲时每 15s 发送注释帧 `: ping`。

前端解析要求：按空行分帧，允许一帧跨多个网络 chunk；忽略 `:` 开头的注释帧。

### curl 示例

```bash
TOKEN=... # 从 /auth/login 获取
curl -N -X POST http://127.0.0.1:8000/api/chat/stream \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"什么是 RRF？","use_knowledge":true}'
```

## 5. 知识库

### GET `/knowledge/stats`

```json
{ "document_count": 6, "ready_count": 6, "chunk_count": 7, "question_count": 4 }
```

### GET `/knowledge/documents?status=ready&q=RAG`

返回当前用户文档列表（最多 100 条）。`status` 可选 `processing|ready|failed`。

### POST `/knowledge/documents`

`multipart/form-data`，字段名 `file`。

- 支持 `.pdf` / `.docx` / `.md` / `.txt`；
- 单文件 ≤ 10MB；
- 返回 `202` + 文档对象，`status=processing`；
- 后台解析完成后变为 `ready` 或 `failed`。

```bash
curl -X POST http://127.0.0.1:8000/api/knowledge/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@notes.md"
```

### PATCH `/knowledge/documents/{id}`

```json
{ "enabled": false }
```

停用后不参与检索，但数据保留。

### DELETE `/knowledge/documents/{id}`

`204`，删除文档、chunks 与相关引用能力。

### POST `/knowledge/search`

检索测试，不调用 LLM：

```json
{ "query": "BM25 和向量怎么融合", "top_k": 5 }
```

```json
{
  "query": "BM25 和向量怎么融合",
  "hits": [
    {
      "index": 1,
      "chunk_id": 42,
      "document_id": 3,
      "document_name": "RAG 工程实践笔记.md",
      "chunk_index": 0,
      "snippet": "RRF 只依赖排名…",
      "score": 0.86
    }
  ],
  "elapsed_ms": 12
}
```

## 6. 健康检查

### GET `/health`

```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "production",
  "database": "ok",
  "llm": { "provider": "mock", "model": "deepseek-chat", "configured": false }
}
```

数据库不可用时 `status=degraded`、`database=unavailable`。

## 7. 限流

| 范围 | 限制 |
| --- | --- |
| 注册 / 登录 | 10 次 / 分钟 / IP |
| 问答 | 30 次 / 分钟 / 用户 |
| 上传 | 20 次 / 小时 / 用户 |

MVP 为单进程内存限流；多实例部署需替换为 Redis。测试环境可通过 `RATE_LIMIT_ENABLED=false` 关闭。
