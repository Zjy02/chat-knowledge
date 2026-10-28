# 知问 · 工程化说明

## 1. 目标

- 提交前自动发现类型、Hooks、格式问题；
- 前后端使用一致的本地与 CI 门禁；
- 代码注释解释设计原因，而不是重复代码字面；
- 新人可按 README 在 10 分钟内启动。

## 2. Git hooks（Husky）

安装依赖时根目录 `npm install` 会触发 `prepare: husky`，启用：

- `.husky/pre-commit` → `npx lint-staged`
- `.husky/pre-push` → `npm --prefix frontend run typecheck`

`lint-staged` 只处理暂存文件：

| 文件 | 动作 |
| --- | --- |
| `frontend/**/*.{ts,tsx}` | ESLint `--fix` + Prettier |
| `frontend/**/*.{css,json,md}` | Prettier |
| 根目录 `*.{json,md,yml,yaml}` | Prettier |

> 如果只想跳过某次检查，使用 `git commit --no-verify`，但 CI 仍会拦截。

## 3. 前端

### 3.1 ESLint

`frontend/eslint.config.js` 使用 flat config：

- `@eslint/js` + `typescript-eslint` 推荐规则；
- `eslint-plugin-react-hooks`：Hooks 依赖与调用规则；
- `eslint-plugin-react-refresh`：组件文件只导出组件（允许常量导出）；
- `@typescript-eslint/no-unused-vars`：忽略 `_` 前缀；
- `--max-warnings 0`：警告也视为失败。

### 3.2 Prettier

- 单引号、分号、尾随逗号、行宽 100；
- 忽略构建产物、依赖、后端与文档；
- CI 执行 `npm run format:check`。

### 3.3 TypeScript

- `strict: true`；
- `noUnusedLocals` / `noUnusedParameters`；
- 构建前先 `tsc -b`，避免类型错误进入产物。

### 3.4 测试

- Vitest + jsdom + Testing Library；
- SSE 用真实 `ReadableStream` 模拟跨 chunk 分帧；
- Markdown 测试覆盖引用按钮、代码块不误伤、原始 HTML 不执行。

## 4. 后端

### 4.1 Ruff

`backend/pyproject.toml`：

```toml
[tool.ruff]
line-length = 140
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP", "RUF", "SIM"]
ignore = ["B008", "RUF012", "RUF001", "RUF002", "RUF003", "SIM117"]
```

- `B008`：FastAPI `Depends()` 默认参数是框架惯例；
- `RUF001-003`：中文全角标点是产品文案的一部分；
- `SIM117`：httpx 的嵌套 `async with` 更利于阅读。

### 4.2 注释约定

Python 侧重点解释：

- **异步会话生命周期**：SSE 生成器为什么必须复用请求 session、何时 commit；
- **SSE 不变量**：先鉴权/落库再发响应头，断连时保存 partial；
- **检索归一化**：为什么先排序再除以最高分；
- **后台解析**：为什么用新 session、为什么原始二进制不持久化；
- **安全边界**：文件 magic 校验、租户过滤、登录错误不区分邮箱是否存在；
- **Mock 与真实 provider**：如何切换、为什么 mock 要确定性。

注释遵循「解释为什么」原则，不写 `i += 1 # increment i` 这类噪声。


## 4A. 状态管理（Redux Toolkit）

前端已从 Zustand 迁移到 **Redux Toolkit + React Redux**：

```text
src/store/
├── index.ts                  # configureStore / RootState / AppDispatch
├── hooks.ts                  # useAppDispatch / useAppSelector
├── notify.ts                 # 供 thunk 调用的 AntD message 桥
└── slices/
    ├── authSlice.ts          # 登录、注册、bootstrap、logout
    ├── conversationsSlice.ts # 列表、activeId、新建/重命名/删除
    ├── knowledgeSlice.ts     # 文档、统计、上传/启停/删除、轮询
    └── uiSlice.ts            # 移动端侧栏
```

约定：

- 服务端数据与跨页面共享状态放 slice；输入框、当前筛选等页面局部状态留在组件；
- 异步请求统一用 `createAsyncThunk`，错误通过 `rejectWithValue` 转成可展示文案；
- 组件只通过 typed hooks 读写 store，不直接 import store；
- Redux thunk 不能使用 React context，因此用 `AntdMessageBridge` 注册 AntD 的 `message` 实例；
- 单测覆盖 `conversationsSlice` 的新建/置顶和 `knowledgeSlice` 的加载结果。

## 4B. 组件库（Ant Design 5）

- 入口使用 `ConfigProvider` 注入中文 locale 与品牌主题（`src/theme.ts`）；
- `App` 组件包裹全局 message/notification 上下文；
- 已迁移：Form、Input、Input.Password、Button、Modal、Dropdown、Menu、Table、Tag、Switch、Upload.Dragger、Progress、Alert、Empty、Segmented、Tooltip、Avatar、Statistic、Card；
- 品牌层保留自有 CSS（纸感背景、宋体标题、朱砂强调色），AntD 负责交互、可访问性与状态反馈；
- 自定义覆盖集中在 `src/styles/antd.css`，禁止在业务组件里散落 `!important`。

## 5. CI（GitHub Actions）

`.github/workflows/ci.yml` 三个 job：

1. **backend**：Ruff + pytest（覆盖率输出）；
2. **frontend**：ESLint + Prettier check + tsc + Vitest + build；
3. **e2e**：安装 Chromium，Playwright 自动拉起 FastAPI + Vite，跑完整主链路。

失败时上传 `playwright-report` 与 trace，便于定位。

## 6. 常用命令

```bash
make install       # 安装依赖 + Husky
make lint          # Ruff + ESLint + Prettier check
make format        # 自动格式化前端与根配置
make test          # 后端 + 前端单测
make test-e2e      # Playwright
make check         # lint + typecheck + tests + build
make seed          # 重建演示数据
```

## 7. 代码组织原则

- 页面级组件只负责编排，网络请求放 `api/`，共享状态放 `store/`（Redux Toolkit slices）；
- 组件超过约 500 行时评估抽离（ChatPage 已拆分 Composer/Message/ContextRail）；
- 组件私有逻辑放同目录 `components/`，避免所有代码堆在入口文件；
- 前端类型集中在 `src/types`，SSE 事件与 REST DTO 使用同一套类型；
- 后端路由只做参数校验与编排，业务流程放 `services/`，便于单测与替换。

## 8. 提交前检查清单

- [ ] `make lint` 通过
- [ ] `make test` 通过
- [ ] 涉及 UI 的改动附桌面/移动截图
- [ ] 新接口补充 OpenAPI 描述与测试
- [ ] 新增环境变量同步 `.env.example` 与 README
- [ ] 不提交 `.env`、`data/`、构建产物与密钥
