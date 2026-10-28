# 知问 · 测试报告

> 版本：v1.0  
> 测试日期：2026-10-28  
> 测试环境：macOS / Python 3.14.5 / Node.js 20.20.2 / Chrome（Playwright system Chrome）  
> 生产目标环境：Python 3.12 / MySQL 8.4 / Nginx 1.27

## 1. 测试范围

| 层级 | 工具 | 覆盖内容 |
| --- | --- | --- |
| 后端单元 | pytest | 密码哈希、JWT、文档切分、文件校验、文本提取 |
| 后端接口 | pytest + httpx ASGI | 注册/登录、鉴权、会话 CRUD、越权、上传、检索、SSE 事件、重新生成 |
| 前端单元 | Vitest + Testing Library | UTC 时间格式化、Markdown 引用、XSS、SSE 分帧、Composer 键盘交互、空状态 |
| E2E | Playwright | 注册 → 通用提问 → 上传 → 检索测试 → 知识库提问 → 引用弹窗 → 重命名 → 刷新回放 |
| 静态质量 | Ruff / ESLint / Prettier / tsc | 未使用导入、Hooks 规则、格式、类型 |
| 构建 | Vite | 生产产物构建 |

## 2. 执行命令

```bash
# 后端
cd backend
.venv/bin/ruff check app tests
.venv/bin/pytest

# 前端
cd frontend
npm run lint
npm run format:check
npm run typecheck
npm run test:run
npm run build

# E2E（需先启动 API 与 Vite，或让 Playwright 自动启动）
npm run e2e
```

## 3. 结果汇总

| 检查项 | 结果 | 备注 |
| --- | --- | --- |
| Ruff | ✅ 通过 | 0 errors |
| pytest | ✅ 26 passed | 覆盖率 **87%** |
| ESLint | ✅ 通过 | 0 warnings（`--max-warnings 0`） |
| Prettier | ✅ 通过 | `format:check` |
| TypeScript | ✅ 通过 | `tsc -b` |
| Vitest | ✅ 13 passed | 5 个测试文件 |
| Vite build | ✅ 通过 | gzip 约 181 KB JS / 10 KB CSS |
| Playwright | ✅ 1 passed | 主链路约 6 秒（Mock Provider） |

### 3.1 后端覆盖率

```
app/services/chat_service.py       86%
app/services/retrieval.py          94%
app/services/document_service.py   95%
app/services/document_parser.py    74%
app/services/llm.py                52%   # mock 分支覆盖，真实 HTTP 适配器需在线测试
app/api/routes/*                   41%–100%
TOTAL                              87%
```

> `llm.py` 的真实 provider 分支未在本地调用外部 API；Mock provider 与 ChatService 的事件链路已覆盖。接入真实 Key 后建议补一次线上 smoke test。

## 4. E2E 用例明细

`e2e/core.spec.ts`：

1. 注册唯一邮箱账号，进入空会话；
2. 发送「什么是 RRF？」，等待 SSE 完成并出现 Mock 演示标识；
3. 上传 `rag-note.md`，轮询状态直到「已就绪」；
4. 在检索测试中输入「BM25 向量 融合」，断言命中 `rag-note.md`；
5. 新建会话并提问，断言引用 chip 出现且包含文件名；
6. 点击引用，打开原文弹窗；
7. 通过会话菜单重命名；
8. 刷新页面，断言历史消息和标题仍然存在。

## 5. 回归中发现并修复的问题

| # | 问题 | 根因 | 修复 |
| --- | --- | --- | --- |
| 1 | SQLite 下注册报 `NOT NULL constraint failed: users.id` | BIGINT 主键在 SQLite 不会自动增长 | 增加 `BIGINT with_variant(INTEGER, "sqlite")` |
| 2 | 引用相关度出现 1624% | 归一化使用「第一个召回」而不是最高分，导致分母不是最大值 | 先排序再取 `top_raw`，并新增分数范围断言 |
| 3 | 时间显示「8 小时前」 | 后端返回无时区的 naive UTC，浏览器按本地时区解析 | 前端统一补 `Z` 后解析 |
| 4 | 会话行存在嵌套 button，E2E 定位到两个「重命名」 | `role=button` 容器内包含菜单按钮 | 拆成 `.conv-open` 按钮 + 独立菜单 |
| 5 | Markdown 中 `**RRF：**` 不生效 | CommonMark 强调闭合规则与全角标点相邻 | 改为 `**RRF**：` |
| 6 | SSE 首字前 HTTP 错误被吞进流 | 流式响应开始后才校验会话归属 | 先 `streamer.prepare()`，再返回 `StreamingResponse` |

## 6. 手工验收

- 桌面 1440×1000：登录、空会话、历史会话、知识库、引用弹窗均正常；
- 移动 390×844：侧栏抽屉、输入区、知识库卡片无横向溢出；
- 无 API Key 时 Mock Provider 可完整演示；
- 刷新 `/chat/:id` 能回放历史；
- 登录页演示账号可一键进入；
- 知识库上传后状态自动从「解析中」变为「已就绪」。

截图见 `docs/prototype/screenshots/`。

## 7. 遗留风险

1. **真实 LLM 未在线验证**：需要 `LLM_API_KEY`；错误码与超时分支已实现。
2. **MySQL 容器未在本机执行**：本机无 Docker，Compose 配置已静态审查，`alembic upgrade head --sql` 已生成并检查 MySQL DDL（BIGINT / MEDIUMTEXT / utf8mb4 / FK）；CI 使用 SQLite 做 E2E。
3. **进程内限流与后台任务**：仅适合单 worker；水平扩容需 Redis + 任务队列。
4. **PDF 扫描件**：仅支持文本层，已在上传提示与失败信息中说明。
5. **依赖审计**：建议在 CI 增加 `pip-audit` 与 `npm audit --omit=dev` 作为发布门禁。
