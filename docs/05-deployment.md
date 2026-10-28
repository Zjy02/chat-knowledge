# 知问 · 部署手册

## 1. 部署拓扑

```
Internet
  │
  ▼
Nginx :8080  ──静态资源──► React dist
  │
  └── /api/ ──► FastAPI :8000 ──► MySQL 8.4
                       │
                       └──► OpenAI-compatible LLM API
```

三个容器：

| 服务 | 镜像/构建 | 端口 | 说明 |
| --- | --- | --- | --- |
| `mysql` | `mysql:8.4` | 内部 3306 | utf8mb4，volume 持久化 |
| `api` | `backend/Dockerfile` | 8000 | Alembic 迁移 + Uvicorn（单 worker） |
| `web` | `frontend/Dockerfile` | 8080→80 | Nginx 静态资源 + `/api` 反代 |

## 2. 前置条件

- Docker Engine 24+
- Docker Compose v2
- 服务器放通 8080（或由外层负载均衡转发）
- 如需真实回答：OpenAI-compatible API Key

## 3. 首次部署

```bash
git clone https://github.com/Zjy02/chat-knowledge.git
cd chat-knowledge

cp .env.example .env
# 必改：MYSQL_PASSWORD、MYSQL_ROOT_PASSWORD、SECRET_KEY
# 生产把 SEED_DEMO 改为 false
# 真实模型：LLM_PROVIDER=deepseek，LLM_API_KEY=sk-...

docker compose up -d --build
docker compose ps
curl http://127.0.0.1:8000/api/health
```

访问：

- Web：`http://<server>:8080`
- OpenAPI：`http://<server>:8000/api/docs`
- 健康检查：`http://<server>:8000/api/health`

首次启动时 `api` 容器会等待 MySQL，执行 `alembic upgrade head`，然后启动 Uvicorn。若 `SEED_DEMO=true`，会写入演示账号 `demo@zhiwen.app / Demo1234`。

## 4. 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `SECRET_KEY` | 是 | JWT 签名密钥，建议 `openssl rand -hex 32` |
| `MYSQL_DATABASE` | 是 | 默认 `chat_knowledge` |
| `MYSQL_USER` / `MYSQL_PASSWORD` | 是 | 业务数据库账号 |
| `MYSQL_ROOT_PASSWORD` | 是 | MySQL root 密码 |
| `LLM_PROVIDER` | 否 | `mock` / `deepseek` / `openai` |
| `LLM_API_KEY` | 真实模型必填 | 服务端保存，不下发前端 |
| `LLM_BASE_URL` | 否 | 默认 `https://api.deepseek.com/v1` |
| `LLM_MODEL` | 否 | 默认 `deepseek-chat` |
| `SEED_DEMO` | 否 | 是否写入演示数据，生产建议 `false` |
| `CORS_ORIGINS` | 否 | 默认 `http://localhost:8080` |

> 数据库密码包含 `@`、`:`、`/` 等字符时，需要 URL 编码后再拼进 `DATABASE_URL`。

## 5. HTTPS 与域名

推荐在前面再加一层 Caddy/Traefik/云负载均衡做 TLS，将域名转发到 `127.0.0.1:8080`。Nginx 内部已设置：

- `proxy_buffering off`：SSE 必须关闭，否则回答会整段延迟；
- `proxy_read_timeout 300s`：覆盖模型长回答；
- `client_max_body_size 12m`：与后端 10MB 上传限制匹配；
- SPA fallback：`try_files $uri $uri/ /index.html`。

若直接暴露 8000 端口，建议在防火墙层限制来源，或移除 `docker-compose.yml` 中的 `8000:8000`。

## 6. 数据备份

```bash
# 备份
docker compose exec mysql sh -c \
  'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers chat_knowledge' \
  > backup-$(date +%F).sql

# 恢复
docker compose exec -T mysql sh -c \
  'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" chat_knowledge' < backup-2026-10-28.sql
```

建议每日定时备份并保留 7–30 天；MySQL 数据卷 `mysql_data` 也应做快照。

## 7. 升级与回滚

```bash
git pull
docker compose build
docker compose up -d
```

- 迁移在容器启动时自动执行；发布前先在预发环境验证 `alembic upgrade head`。
- 回滚应用镜像时，确认新迁移向后兼容；破坏性迁移必须提供 `downgrade` 或双写方案。
- 回滚命令：`docker compose up -d --force-recreate api web`（配合上一版本镜像 tag）。

## 8. 监控与排障

| 现象 | 排查 |
| --- | --- |
| 页面 502 | `docker compose logs api`；确认 `/api/health` 与 MySQL healthy |
| 登录 401 | 检查 `SECRET_KEY` 是否在重启后变化；检查系统时间 |
| 回答不流式 | 检查 Nginx 是否 `proxy_buffering off`；检查是否有 CDN 缓冲 |
| 上传一直 processing | 查看 API 日志中的文档解析异常；重启会标记为 failed |
| MySQL 连接失败 | 检查密码 URL 编码、`DATABASE_URL`、MySQL healthcheck |

日志为 JSON 行，包含 `request_id`，可从前端错误响应中的 `request_id` 关联。

## 9. 扩容说明

当前设计面向单实例：

- 速率限制是进程内滑动窗口；
- 文档解析使用 FastAPI BackgroundTask；
- SSE 连接由单个 Uvicorn worker 持有。

扩容前需要：

1. 用 Redis 实现全局限流；
2. 用 Celery/RQ 或云任务队列处理文档解析；
3. 用共享会话/连接池与多 worker 部署；
4. 若引入向量检索，将索引放到 Qdrant/pgvector 等共享存储。

在这些改造完成前，建议保持 `--workers 1`，通过提升单机规格与前面加负载均衡做垂直扩展。
