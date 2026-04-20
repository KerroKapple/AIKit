# AIKit Web — 设计规格

- **Date**: 2026-04-20
- **Status**: draft（待用户 review）
- **Process**: superpowers:brainstorming → 本 spec → writing-plans（下一步）
- **Author**: Claude Opus 4.7 + kerro

---

## 1. 目的

给朋友圈（≤ 5 人）用的极简 Web 端，封装阿里 DashScope 三大能力：
- **Qwen-Turbo** 流式对话
- **Wanx Image** 文生图
- **Wanx / Kling v3** 系列生视频（5 个 Provider 后端智能路由）

部署到用户腾讯云 `kapple` 服务器（<YOUR_SERVER_IP>），挂在已有雷池 SafeLine WAF 后面，以 Basic Auth 做门禁。

---

## 2. 目标 / 非目标

### 目标

- 用户朋友在浏览器通过 `https://<YOUR_DOMAIN>` 访问，一套账号密码登录即用
- 3 tab 布局：对话 / 生图 / 生视频，UI 极简
- 泰/中/英三语切换，默认英文
- 不占用服务器磁盘（除 SQLite 元数据 ~50KB）
- 独立于 InkFrame（新仓库、不交叉引用）

### 非目标

- 多用户账户系统、权限分级（就一个共享账号）
- 用户作品画廊、永久历史（3h 软过期）
- 多机分布式、水平扩容（≤ 5 人用不着）
- 在服务器做 ffmpeg / 后处理（文件流直给浏览器）
- 对接非阿里模型（Gemini / Claude 等未在范围）

---

## 3. 用户决策（brainstorming 输出）

| 维度 | 决策 | 备注 |
|---|---|---|
| 服务器 | `kapple`（<YOUR_SERVER_IP>，腾讯云北京 Debian 12）| 雷池已跑 6h，Docker 29.4.0，磁盘 43G 剩 |
| 域名 / DNS | `<YOUR_DOMAIN>` / 腾讯云 DNSPod | A 记录指向服务器 IP |
| 认证 | 雷池 Basic Auth，≤ 5 人共享一套账号密码 | 后端零登录代码 |
| 对话模型 | Qwen-Turbo | 最低成本，朋友级够用 |
| 生图 | Wanx Image（`wan2.7-image-pro`）| 单一选项 |
| 生视频 | 后端单一入口，按输入自动路由 | `refImages > 0 → r2v`；`firstFrame → i2v`；`else → t2v` |
| 存储 | 不下载到服务器，SQLite 只记元数据 | 3h 软过期 |
| UI | 顶部 3 tab + 右上角语言下拉 | 首次访问默认英文 |
| 技术栈 | Next.js 15 + TS + Tailwind + Radix + shadcn/ui + better-sqlite3 + Vitest | 与 CineFlow 对齐 |
| 部署 | Docker + 雷池反代（`127.0.0.1:3100`）| 与现有 vw/wkp 模式一致 |

---

## 4. 架构总览

```
┌─ 朋友浏览器 ─────────────────────────────┐
│ https://<YOUR_DOMAIN>                      │
│ ├─ Tab: Chat (SSE 流)                   │
│ ├─ Tab: Image                           │
│ └─ Tab: Video                           │
└──────────────────────────────────────────┘
             │ HTTPS
             ▼
┌─ 腾讯云北京 kapple ──────────────────────┐
│ 雷池 Tengine (80/443)                    │
│ ├─ SafeLine WAF                          │
│ ├─ Basic Auth  .htpasswd                 │
│ └─ 自动签 Let's Encrypt 证书              │
└──────────────────────────────────────────┘
             │ 反代 127.0.0.1:3100
             ▼
┌─ Docker container「aikit」───────────────┐
│ Next.js 15 App Router（单进程）          │
│ ├─ 前端路由   / /image /video            │
│ ├─ API Routes /api/chat /api/image/* … │
│ ├─ lib/dashscope（Qwen + Wanx + Kling） │
│ └─ SQLite  /data/tasks.db               │
└──────────────────────────────────────────┘
             │ HTTPS
             ▼
       DashScope API
 （api.dashscope.aliyuncs.com）
```

---

## 5. 仓库结构

**路径**：`/Users/kerro/Projects/AIKit`

```
AIKit/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                          # Chat 默认页
│   │   ├── image/page.tsx
│   │   ├── video/page.tsx
│   │   └── api/
│   │       ├── chat/route.ts                 # POST SSE
│   │       ├── image/submit/route.ts         # POST
│   │       ├── image/[taskId]/route.ts       # GET
│   │       ├── video/submit/route.ts         # POST
│   │       └── video/[taskId]/route.ts       # GET
│   ├── components/
│   │   ├── chat/                             # ChatPane / MessageList / Input
│   │   ├── image/                            # ImageForm / ImageGallery
│   │   ├── video/                            # VideoForm / VideoCard / Player
│   │   ├── shared/                           # TabNav / LangSwitcher / ExpiryBanner
│   │   └── ui/                               # shadcn 生成
│   ├── lib/
│   │   ├── dashscope/
│   │   │   ├── client.ts                     # axios 实例 + Auth
│   │   │   ├── chat.ts                       # Qwen-Turbo SSE
│   │   │   ├── image.ts                      # Wanx Image
│   │   │   ├── video.ts                      # 5 Provider 路由 + poll
│   │   │   └── types.ts
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   ├── client.ts                     # better-sqlite3 wrapper
│   │   │   ├── tasks.ts                      # CRUD + resume
│   │   │   └── cron.ts                       # 30 min 清理
│   │   ├── i18n/
│   │   │   ├── en.ts                         # default
│   │   │   ├── zh.ts
│   │   │   ├── th.ts
│   │   │   ├── types.ts                      # Dict 类型自约束
│   │   │   └── index.ts                      # getDict(locale)
│   │   ├── errors.ts                         # AIKitError 类族
│   │   └── env.ts                            # 启动期校验 DASHSCOPE_API_KEY
│   └── middleware.ts                         # locale cookie 解析
├── tests/
│   ├── dashscope/
│   │   ├── chat.test.ts
│   │   ├── image.test.ts
│   │   └── video.test.ts
│   ├── api/
│   │   ├── chat.test.ts
│   │   └── video-submit.test.ts
│   └── fixtures/
│       ├── chat/ image/ video/
├── docs/
│   └── superpowers/specs/                    # 本文件所在
├── data/                                     # Docker volume（SQLite）
│   └── .gitkeep
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vitest.config.ts
├── next.config.mjs
└── README.md
```

---

## 6. 前端设计

### 6.1 路由

| 路径 | 组件 | 说明 |
|---|---|---|
| `/` | `ChatPage` | 默认 Chat tab |
| `/image` | `ImagePage` | 文生图 |
| `/video` | `VideoPage` | 文生/图生/参考生视频 |

### 6.2 顶层布局（layout.tsx）

```
┌────────────────────────────────────────────┐
│  [AIKit 🎨]   Chat | Image | Video  🇬🇧 ▾│
├────────────────────────────────────────────┤
│  (可选)  ⏰ Task expires at 18:30, save now│   ← ExpiryBanner，有未过期任务时显示
├────────────────────────────────────────────┤
│                                            │
│         当前 Tab 的主内容区                │
│                                            │
└────────────────────────────────────────────┘
```

### 6.3 关键组件

- **TabNav**：3 个 tab，高亮当前路由，`<Link>` Next.js native
- **LangSwitcher**：Radix `DropdownMenu`，选中写 cookie `locale=en|zh|th`，revalidate 当前页
- **ChatPane**：
  - 左侧：当前会话消息列表（滚动容器，自动滚底）
  - 底部：`Textarea` + Send button，Enter 发送 / Shift+Enter 换行
  - 状态全部在 React state（内存），切 tab / 刷新都清
- **ImageForm**：
  - `prompt` textarea
  - `aspectRatio` select（1:1 / 16:9 / 9:16 / 4:3 / 3:4）
  - `batchSize` select（1 / 2 / 3 / 4）
  - Submit → 轮询 → 画廊展示结果（4 张 max）
- **VideoForm**：
  - `prompt` textarea
  - `duration` select（5s / 10s）
  - `resolution` select（720p / 1080p）
  - `aspectRatio` select（16:9 / 9:16 / 1:1）
  - `firstFrameUpload`（拖拽 or 点击上传，可选）
  - `refImagesUpload`（多图，最多 3 张，可选）
  - Submit → 显示 TaskCard（进度条 + 预计剩余时间）
  - 完成 → `<video src={aliUrl} controls />`
- **ExpiryBanner**：从 SQLite 查当前未过期的任务列表，取其中**最早到期**的一条显示过期倒计时；无未过期任务则隐藏

### 6.4 i18n

**选型**：手写字典 + `useDict(locale)` hook。不用 `next-intl`——朋友级 120 条翻译 overkill。

**字典 shape**：
```ts
// lib/i18n/types.ts
export type Dict = {
  nav: { chat: string; image: string; video: string };
  chat: { send: string; placeholder: string; thinking: string };
  image: { prompt: string; ratio: string; batch: string; generate: string };
  video: { prompt: string; duration: string; resolution: string; firstFrame: string; refImages: string; generate: string };
  common: { loading: string; error: string; retry: string; expiresAt: string; saveNow: string };
  errors: { invalidKey: string; contentPolicy: string; rateLimited: string; networkError: string; unknown: string };
};
```

**加载策略**：middleware 读 cookie → `layout.tsx` 传 `dict` props → 组件用 `t = dict; t.chat.send`。

**初次访问**：无 cookie → `en`（在 middleware 写默认 cookie）。

**切换**：`LangSwitcher` 选中 → 写 cookie + `router.refresh()`。

### 6.5 UI 设计 token

**深浅主题**：单一深色主题（朋友级不做切换）。
**调色**：shadcn/ui 默认 neutral + 一个主色（用 Radix Cyan 或 Violet，待实现时定）。
**字体**：Inter（中日韩泰语 fallback 到系统字体）。

---

## 7. 后端 API 契约

### 7.1 `POST /api/chat`（SSE 流）

**请求**：
```json
{ "messages": [{"role": "user", "content": "hi"}] }
```

**响应**：`Content-Type: text/event-stream`
```
data: {"delta":"Hello"}
data: {"delta":" there"}
data: {"done":true}
```

**错误**：非流式错误返 `{ error: { code, message } }` JSON + 对应 HTTP 状态。

### 7.2 `POST /api/image/submit`

**请求**：
```json
{ "prompt": "a cat", "aspectRatio": "16:9", "batchSize": 2 }
```

**响应**：
```json
{ "taskId": "018fa8..." }
```

### 7.3 `GET /api/image/:taskId`

**响应**：
```json
{
  "status": "success",
  "urls": ["https://dashscope-result-bj.../x.png"],
  "expiresAt": 1745136000
}
```

`status ∈ pending | success | failed`。

### 7.4 `POST /api/video/submit`（含智能路由）

**请求**：
```json
{
  "prompt": "...",
  "duration": 5,
  "resolution": "720p",
  "aspectRatio": "16:9",
  "firstFrame": "data:image/png;base64,...",
  "refImages": []
}
```

**路由规则**（后端）：
```ts
if (refImages.length > 0) provider = 'wanx-r2v';
else if (firstFrame)      provider = 'wanx-i2v';
else                      provider = 'wanx-t2v';
```

**响应**：
```json
{ "taskId": "018fa8...", "provider": "wanx-t2v" }
```

### 7.5 `GET /api/video/:taskId`

**响应**：
```json
{
  "status": "success",
  "videoUrl": "https://dashscope-result-bj.../x.mp4",
  "provider": "wanx-t2v",
  "expiresAt": 1745136000
}
```

### 7.6 错误响应通用格式

```json
{ "error": { "code": "CONTENT_POLICY", "message": "blocked by safety filter" } }
```

**错误码**：
| code | HTTP | 说明 |
|---|---|---|
| INVALID_KEY | 500 | 服务端配置错（sk-xxx 失效） |
| CONTENT_POLICY | 400 | 内容合规检查不通过 |
| RATE_LIMITED | 429 | DashScope 限流 |
| NETWORK_ERROR | 502 | 网络/超时 |
| UNKNOWN | 500 | 兜底 |

前端接到 code 后查 `dict.errors[code]` 展示本地化文案。

---

## 8. 数据层

### 8.1 SQLite schema

```sql
CREATE TABLE tasks (
  task_id       TEXT PRIMARY KEY,
  type          TEXT NOT NULL CHECK(type IN ('image','video')),
  provider      TEXT NOT NULL,
  dashscope_id  TEXT,
  status        TEXT NOT NULL CHECK(status IN ('pending','success','failed')),
  prompt        TEXT NOT NULL,
  params        TEXT,
  result_urls   TEXT,
  error_code    TEXT,
  error_message TEXT,
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL
);

CREATE INDEX idx_tasks_expires ON tasks(expires_at);
CREATE INDEX idx_tasks_status  ON tasks(status);
```

Chat 不入库（SSE 流不持久化，切 tab 即清）。

### 8.2 任务生命周期

```
submit → INSERT (status=pending, expires_at=now+3h)
           → DashScope POST → 记 dashscope_id
poll   → SELECT → 若 pending 则调 DashScope poll
           SUCCEEDED → UPDATE (status=success, result_urls=[...])
           FAILED    → UPDATE (status=failed, error_code=...)
cron   → DELETE WHERE expires_at < now()  每 30 min 触发
boot   → SELECT WHERE status=pending AND expires_at>now →
           逐个启动后台 poll 循环直至 SUCCEEDED/FAILED 或 expires_at 到
```

### 8.3 3h 软过期

- 服务端软判断：GET `/api/*/:taskId` 时若 `expires_at < now()` 返 404
- cron 物理删除：每 30 min `DELETE` 过期行
- 前端软隐藏：列表只渲染 `expires_at > now()` 的任务
- 用户心智：UI 顶部 ExpiryBanner + 成功 Toast 提示"3h 后失效，立即另存"

---

## 9. 部署

### 9.1 Dockerfile（Node 20 alpine multi-stage）

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
RUN mkdir -p /data
EXPOSE 3000
CMD ["node", "server.js"]
```

### 9.2 docker-compose.yml

```yaml
services:
  aikit:
    build: .
    container_name: aikit
    restart: unless-stopped
    ports:
      - "127.0.0.1:3100:3000"
    volumes:
      - ./data:/data
    environment:
      - DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY}
      - DATABASE_PATH=/data/tasks.db
      - NODE_ENV=production
```

### 9.3 雷池配置（9443 管理页操作）

1. **新增防护站点**：
   - 域名：`<YOUR_DOMAIN>`
   - 上游：`http://127.0.0.1:3100`
2. **开启 HTTPS**：选中站点 → "HTTPS 配置" → "自动申请证书"（Let's Encrypt，DNS-01 或 HTTP-01）
3. **加 Basic Auth**：站点详情 → "自定义防护规则" → 追加 Nginx 片段：
   ```nginx
   auth_basic "AI Kit";
   auth_basic_user_file /etc/nginx/conf.d/aikit.htpasswd;
   ```
   `htpasswd` 在宿主机生成（`htpasswd -c /data/safeline/resources/nginx/aikit.htpasswd kerro`）后通过雷池卷挂载到 Tengine 容器。

### 9.4 DNS（腾讯云 DNSPod）

```
记录类型: A
主机记录: ai
记录值:   <YOUR_SERVER_IP>
TTL:     600
```

### 9.5 首次部署步骤（高层）

1. 本地 `git push` 新仓库到 GitHub
2. 服务器 `git clone` 到 `/data/aikit`
3. `cp .env.example .env`，填入 `DASHSCOPE_API_KEY`
4. `docker compose up -d --build`
5. 腾讯云加 A 记录
6. 雷池新建站点 + HTTPS + Basic Auth
7. 访问 `https://<YOUR_DOMAIN>` 验证

---

## 10. 错误处理

### 10.1 错误类

```ts
// lib/errors.ts
export class AIKitError extends Error {
  constructor(
    public code: 'INVALID_KEY' | 'CONTENT_POLICY' | 'RATE_LIMITED'
               | 'NETWORK_ERROR' | 'UNKNOWN',
    message: string,
    public cause?: unknown,
  ) { super(message); }
}
```

### 10.2 DashScope 错误码映射

| 阿里码 | AIKit code |
|---|---|
| `InvalidApiKey` | INVALID_KEY |
| `IPInfringementSuspect` / `DataInspectionFailed` | CONTENT_POLICY |
| `Throttling*` | RATE_LIMITED |
| DioException timeout/offline | NETWORK_ERROR |
| 其他 | UNKNOWN |

### 10.3 前端

- API 层捕获 → 映射成 `AIKitError` → JSON 响应
- UI 层 Toast `t.errors[code]`，严重错误（INVALID_KEY）额外展示"请联系管理员"

---

## 11. 测试策略

### 11.1 Vitest 单元

- `lib/dashscope/chat.ts`：SSE 流组装 + 错误码映射（fixture 回放）
- `lib/dashscope/image.ts`：submit + poll 协议 mapping
- `lib/dashscope/video.ts`：智能路由逻辑（r2v/i2v/t2v 分支）+ 5 Provider body 映射
- `lib/db/tasks.ts`：CRUD + resume 启动流

### 11.2 API Integration

- `tests/api/*.test.ts`：Next.js Route Handlers + `msw` mock DashScope
- 覆盖成功 / INVALID_KEY / CONTENT_POLICY / NETWORK_ERROR 四条路径

### 11.3 Fixture

复用 InkFrame 已采集的 Wanx / Kling fixture（`submit_success.json` / `poll_success.json`），放 `tests/fixtures/`。

### 11.4 E2E

朋友级不做。

### 11.5 验收矩阵

| 场景 | 路径 |
|---|---|
| 英文用户首次访问 | 打开 `<YOUR_DOMAIN>` → Basic Auth → 默认英文 |
| 切中文 | LangSwitcher → 🇨🇳 → 文案全转中文 |
| Chat 流式 | 连续发 2 轮，消息顺序正确 |
| 生图 | 16:9 + 2 张 → 两张图 URL 返回 → 画廊显示 |
| 生视频 T2V | 不传首帧 → 后端路由 wanx-t2v → 5 分钟后出视频 |
| 生视频 I2V | 上传首帧 → 路由 wanx-i2v |
| 生视频 R2V | 上传 2 张参考 → 路由 wanx-r2v |
| 3h 过期 | 修系统时间验证软过期隐藏 |
| 容器重启 resume | 生视频中途 `docker restart aikit`，回来继续 poll |
| 错误 content policy | 用敏感词提交 → Toast 显示"blocked by safety filter" |

---

## 12. 风险 / 未决事项

### 12.1 风险

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| DashScope `kling/` model ID 含 `/` 导致 URL 编码歧义 | 中 | 视频提交失败 | 在 body 里传，不进 URL；InkFrame PR #23 已验证通过 |
| Basic Auth 明文被 SSL 剥离 | 低 | 密码泄露 | 雷池强制 HTTPS（`error_page 497 → 302 https`）|
| DashScope 突然改 URL 过期时间 | 低 | 软过期策略失效 | 软过期 < 硬过期（3h < 24h）有余量 |
| SQLite 单文件损坏 | 低 | 任务状态丢 | Docker volume + cron 备份到 `/data/backup` |
| 首次部署雷池证书签不下来（Let's Encrypt rate limit）| 低 | 无 HTTPS | 用雷池自签证书兜底 |

### 12.2 未决事项（不影响实施，待执行期再定）

- **主色调**：Cyan vs Violet vs 自选（待用户在 UI 首屏看到 mockup 时定）
- **htpasswd 账号名**：`kerro` 还是自定义？（plan 执行时问用户）
- **Logo / favicon**：纯文字 `AIKit` 还是设计 emoji？

---

## 13. 变更记录

- 2026-04-20: 初稿（brainstorming 结束）
