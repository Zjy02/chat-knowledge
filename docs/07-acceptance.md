# 知问 · 验收清单

> 对照 [需求分析](./01-requirements.md) 的 Definition of Done，记录当前实现与证据。  
> 结论：**技术自测通过，可进入产品验收/真实模型联调。**

## 1. 阶段产物

| 阶段 | 产物 | 状态 |
| --- | --- | --- |
| 需求分析 | [01-requirements.md](./01-requirements.md) | ✅ 完成 |
| 原型确定 | [高保真原型](./prototype/index.html)、截图 | ✅ 完成 |
| 技术方案 | [02-tech-design.md](./02-tech-design.md)、[API 契约](./03-api-contract.md) | ✅ 完成 |
| 前后端开发 | React 18 + TS、FastAPI + MySQL + SSE + RAG | ✅ 完成 |
| 测试回归 | [04-test-report.md](./04-test-report.md) | ✅ 通过 |
| 上线部署 | [05-deployment.md](./05-deployment.md)、Docker Compose、CI | ✅ 完成（本机无 Docker，配置静态验证） |

## 2. 功能验收

### 账号与鉴权

- [x] 邮箱 + 密码注册，密码强度校验
- [x] 登录返回 JWT，前端持久化
- [x] `/auth/me` 校验 Token，过期跳转登录
- [x] 退出登录清理本地凭证
- [x] 演示账号 seed
- [x] 用户 A 无法访问用户 B 的会话/文档（pytest 覆盖）

### 会话

- [x] 新建会话
- [x] 按更新时间倒序列出
- [x] 打开会话回放历史
- [x] 重命名（弹窗，E2E 覆盖）
- [x] 删除（二次确认，级联消息）
- [x] 首轮问题自动生成标题
- [x] 侧栏关键字过滤

### 流式问答

- [x] Enter 发送，Shift+Enter 换行
- [x] SSE 逐字返回
- [x] Markdown、表格、代码高亮
- [x] 引用来源（文档名 + 片段 + 相关度）
- [x] 停止生成，保留已生成内容（后端 interrupted）
- [x] 失败提示与重试
- [x] 复制回答、重新生成
- [x] 空会话建议问题
- [x] 自动滚动，用户上滚后暂停
- [x] 展示模型与耗时

### 知识库

- [x] 上传 txt/md/pdf/docx，≤10MB
- [x] 文件签名校验
- [x] 后台解析、自动切分（500 字 / 80 重叠）
- [x] 文档列表、状态、片段数、时间
- [x] 解析失败原因展示
- [x] 删除文档与 chunks
- [x] 启停文档，停用后不参与检索
- [x] 统计：文档数、片段数、提问数
- [x] 检索测试

### 引用与 RAG

- [x] 仅检索当前用户已启用文档
- [x] 中文分词 + BM25，Top 5，阈值过滤
- [x] 上下文注入 + 严格提示词
- [x] `[1]` 上标、引用卡片、原文弹窗
- [x] 关闭知识库增强后为通用对话
- [x] 无命中时明确说明

## 3. 非功能验收

- [x] 桌面 1440 宽度布局
- [x] 移动 390 宽度布局（抽屉侧栏）
- [x] 空态 / 加载骨架 / 错误态
- [x] 焦点可见、按钮 aria-label、Esc 关闭弹窗
- [x] API 统一错误结构与 request_id
- [x] 上传大小/格式校验
- [x] SSE 经 Nginx 不缓冲
- [x] Docker Compose + Alembic + MySQL 健康检查
- [x] Redux Toolkit 状态管理 + Ant Design 组件库迁移
- [x] GitHub Actions：后端、前端、E2E 三个 job

## 4. 证据

| 证据 | 位置 |
| --- | --- |
| 需求文档 | `docs/01-requirements.md` |
| 高保真原型 | `docs/prototype/index.html` |
| 原型截图 | `docs/prototype/screenshots/chat.png`、`knowledge.png` |
| 登录页 | `docs/prototype/screenshots/login.png` |
| 对话主界面 | `docs/prototype/screenshots/app-chat.png` |
| 知识库 | `docs/prototype/screenshots/app-knowledge.png` |
| 引用弹窗 | `docs/prototype/screenshots/app-citation.png` |
| 上传弹窗 | `docs/prototype/screenshots/app-upload.png` |
| 移动端 · 对话 | `docs/prototype/screenshots/app-mobile.png` |
| 移动端 · 知识库 | `docs/prototype/screenshots/app-knowledge-mobile.png` |
| 后端测试 | `backend/tests/`，26 passed / 87% |
| 前端测试 | `frontend/src/**/*.test.ts(x)`，16 passed |
| E2E | `frontend/e2e/core.spec.ts`，1 passed |

## 5. 尚未完成 / 需外部条件

| 项 | 原因 | 建议 |
| --- | --- | --- |
| 真实 LLM 回答质量评估 | 未提供服务端 API Key | 配置 `LLM_API_KEY` 后跑 20 条代表性 query，人工评估引用忠实度 |
| MySQL 容器实跑 | 本机未安装 Docker | 在目标服务器执行 `docker compose up --build` 并跑健康检查 |
| 扫描版 PDF | 产品边界外 | 后续接入 OCR |
| 多 worker 限流/任务队列 | MVP 单实例设计 | 上线扩容前替换为 Redis + Celery/RQ |
| 依赖安全扫描 | 未配置依赖审计 | CI 增加 `pip-audit` 与 `npm audit --omit=dev` |

## 6. 验收建议

1. 用演示账号走一遍：登录 → 打开 RAG 会话 → 查看引用原文；
2. 新建会话，关闭知识库，问一个通用问题；
3. 上传自己的资料，等待就绪，再问一个资料内问题；
4. 刷新页面确认历史与标题；
5. 在移动尺寸检查侧栏与输入框；
6. 配置真实 `LLM_API_KEY` 后重复第 2、3 步，评估回答质量。
