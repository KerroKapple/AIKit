# AIKit Post-Launch 优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 editorial Studio Dispatch 风 UI 上线后发现的 8 个体感/工程缺口，按用户价值顺位迭代。

**Architecture:** 纯客户端 / 基建小改，不动业务逻辑。分两类：(A) 首屏体感三件套（字体本地化、favicon+OG、viewport 单位），(B) 响应式 / a11y / DevOps 配套。无 DB schema 变更。

**Tech Stack:** Next.js 15 App Router · TypeScript · Tailwind · SQLite (better-sqlite3) · Docker · SafeLine 反代

---

## 背景

上线后审计出 8 项缺口，权重从高到低排在下方任务中。本计划覆盖全部 8 项。

**一致性原则**
- i18n 字符串改动必须同步 `en/zh/th` 三份字典
- 所有改动进入同一分支 `feature/aikit-web-impl`
- 每个 Task 独立 commit，commit 消息走 `feat/fix/chore:` 前缀
- 部署时机：全部 merge 完再一次性 rsync + `docker compose up -d --build`

**非目标**
- 不做 PWA / 离线 / Service Worker
- 不做 SSR 渲染 masthead 之外的交互组件
- 不引入 observability SaaS（Sentry / Datadog 等）

---

## File Structure

新增文件：
- `public/` — 首次出现，放静态资产
- `public/favicon.svg` — 刊头 `◆` 主视觉 SVG
- `public/favicon.ico` — 退化到老浏览器
- `public/og.png` — 1200×630 社交卡
- `public/fonts/` — Fraunces / Instrument Sans / JetBrains Mono WOFF2 自托管
- `scripts/backup-db.sh` — SQLite hot backup，cron 触发
- `scripts/download-fonts.sh` — 一次性从 Google Fonts CDN 抓 woff2 到 public

修改文件：
- `src/app/layout.tsx` — 注入 favicon / OG metadata
- `src/app/globals.css` — 替换 `@import` 为本地 `@font-face`
- `src/components/chat/ChatPane.tsx` — `vh` → `svh`/`dvh`
- `src/app/layout.tsx` (已列) — 小屏响应式补 subtitle / date / aside
- `src/components/video/VideoForm.tsx` — `hidden md:` 响应式
- `src/components/image/ImageForm.tsx` — 同上
- 多个 `*.tsx` — aria-label / role / sr-only 补
- `docker-compose.yml` — healthcheck + depends_on condition
- `Dockerfile` — `node:20-alpine` → `node:20-bookworm-slim` + 去除 python/g++

---

## Task 1: 字体本地化（大陆首屏阻塞根治）

**Files:**
- Create: `public/fonts/fraunces.woff2`（从 Google Fonts 下载）
- Create: `public/fonts/instrument-sans.woff2`
- Create: `public/fonts/jetbrains-mono.woff2`
- Create: `scripts/download-fonts.sh`
- Modify: `src/app/globals.css:1`

**为什么：** 当前 `@import url('https://fonts.googleapis.com/...')` 在大陆首屏同步阻塞 CSS，Google Fonts 偶发超时造成首屏白屏或 FOIT 数秒。自托管 woff2，从自己的 443 走 SafeLine → 稳定。

- [ ] **Step 1: 写一次性抓字体脚本**

Create `scripts/download-fonts.sh`:
```bash
#!/usr/bin/env bash
# 从 Google Fonts CDN 下载 variable font woff2 到 public/fonts
# 再跑只在替换字体时需要；产物入库
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p public/fonts

fetch() {
  local name="$1" url="$2" out="public/fonts/$3"
  curl -sSL -H 'User-Agent: Mozilla/5.0 AppleWebKit' "$url" -o "$out"
  echo "✓ $name → $out ($(wc -c < "$out") bytes)"
}

# Fraunces variable (opsz,wght + SOFT axis)
fetch fraunces \
  'https://fonts.gstatic.com/s/fraunces/v39/6NUh8FyLNQOQZAnv9ZwNjucOoOkEwSPIew.woff2' \
  fraunces.woff2

# Instrument Sans variable (wght italic)
fetch instrument-sans \
  'https://fonts.gstatic.com/s/instrumentsans/v2/pxiTypc9HsbYzC8hF_vBUXl4X5RE.woff2' \
  instrument-sans.woff2

# JetBrains Mono variable (wght)
fetch jetbrains-mono \
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4xD7OwA.woff2' \
  jetbrains-mono.woff2

echo '完成 · 产物进 git'
```

Chmod + run:
```bash
chmod +x scripts/download-fonts.sh
./scripts/download-fonts.sh
ls -lh public/fonts/
```
Expected: 3 woff2 文件各 ~30–200KB。

- [ ] **Step 2: 改 globals.css 用本地字体**

Modify `src/app/globals.css:1`:
```css
@font-face {
  font-family: 'Fraunces';
  src: url('/fonts/fraunces.woff2') format('woff2-variations');
  font-weight: 300 900;
  font-style: normal italic;
  font-display: swap;
}
@font-face {
  font-family: 'Instrument Sans';
  src: url('/fonts/instrument-sans.woff2') format('woff2-variations');
  font-weight: 400 700;
  font-style: normal italic;
  font-display: swap;
}
@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/jetbrains-mono.woff2') format('woff2-variations');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}
```

删除原来的 `@import url('https://fonts.googleapis.com/...')` 第 1 行。

- [ ] **Step 3: 本地 dev 验证**

Run:
```bash
lsof -ti:3000 || npm run dev &
sleep 3
curl -s http://localhost:3000/fonts/fraunces.woff2 -o /dev/null -w 'HTTP %{http_code} size=%{size_download}B\n'
curl -s http://localhost:3000/ | grep -c 'fonts.googleapis.com'
```
Expected: `HTTP 200 size=~120000B`，grep 返回 `0`（不再外部依赖）。

- [ ] **Step 4: Commit**

```bash
git add public/fonts/ scripts/download-fonts.sh src/app/globals.css
git commit -m "perf(fonts): 自托管 Fraunces/Instrument Sans/JetBrains Mono，去 Google Fonts 依赖

大陆首屏 @import Google Fonts 经常超时导致 FOIT 数秒。
字体从 gstatic CDN 一次性下载到 public/fonts，@font-face 引用本地。
font-display: swap 避免隐身期。"
```

---

## Task 2: Favicon + OG 社交卡

**Files:**
- Create: `public/favicon.svg`
- Create: `public/favicon.ico`
- Create: `public/og.png`（可先用占位，后替 design）
- Modify: `src/app/layout.tsx:12-13`

**为什么：** 当前 tab 空白、朋友群 IM 转发链接无预览。

- [ ] **Step 1: 写 favicon.svg（刊头 ◆ 主视觉）**

Create `public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="hsl(42,33%,92%)"/>
  <path d="M16 6 L26 16 L16 26 L6 16 Z" fill="hsl(16,57%,60%)"/>
  <text x="16" y="20" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-weight="700" font-size="12" fill="hsl(25,8%,20%)">A</text>
</svg>
```

- [ ] **Step 2: 生成 favicon.ico（退化）**

Run（需 ImageMagick）：
```bash
magick convert public/favicon.svg -background none -resize 32x32 public/favicon.ico
ls -la public/favicon.*
```
Expected: 两个文件出现。若无 ImageMagick：
```bash
brew install imagemagick
```

- [ ] **Step 3: 写占位 OG 图**

Create `public/og.png` via curl from placeholder:
```bash
curl -sL 'https://placehold.co/1200x630/f3ede0/c8663d/png?text=AIKit+%C2%B7+Studio+Dispatch&font=playfair-display' -o public/og.png
ls -lh public/og.png
```
Expected: 60–100KB PNG。

- [ ] **Step 4: 注入 metadata**

Modify `src/app/layout.tsx:12`:
```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AIKit — Studio Dispatch',
  description: 'Friends-only AI kit on DashScope · Qwen / Wan / Kling',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.ico' },
  openGraph: {
    title: 'AIKit — Studio Dispatch',
    description: 'A hand-bound dispatch of generative tools — conversation, stills, moving image.',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
};
```

- [ ] **Step 5: 验证**

Run:
```bash
curl -sI http://localhost:3000/favicon.svg | head -3
curl -sI http://localhost:3000/og.png | head -3
curl -s http://localhost:3000/ | grep -oE '<link rel="icon"[^>]+>|<meta property="og:[^>]+>' | head
```
Expected: 两个 200；HTML 里有 icon link + og:title/description/image。

- [ ] **Step 6: Commit**

```bash
git add public/favicon.svg public/favicon.ico public/og.png src/app/layout.tsx
git commit -m "feat(seo): favicon + OG 社交卡

tab 空白 + IM 转发无预览。SVG favicon 用品牌陶土 ◆
占位 OG 图 1200×630；Next.js Metadata API 注入 icons / openGraph / twitter。"
```

---

## Task 3: viewport 单位 vh → dvh（修移动端地址栏抖动）

**Files:**
- Modify: `src/components/chat/ChatPane.tsx:81`

**为什么：** 手机浏览器滚动时地址栏收/展，`vh` 会跟着跳，ChatPane 输入框位置抖。`dvh` (dynamic viewport) 自动适应。

- [ ] **Step 1: 找现场**

Run:
```bash
grep -n 'vh\]' src/components/chat/ChatPane.tsx
```
Expected: 命中 `min-h-[60vh] max-h-[72vh]`。

- [ ] **Step 2: 改 dvh**

Modify `src/components/chat/ChatPane.tsx:81` — 替换：
```tsx
<div className="paper-card flex flex-col min-h-[60vh] max-h-[72vh]">
```
为：
```tsx
<div className="paper-card flex flex-col min-h-[60dvh] max-h-[72dvh]">
```

- [ ] **Step 3: typecheck + 视觉验证**

Run:
```bash
npm run typecheck
curl -s http://localhost:3000/ | grep -oE 'min-h-\[[^]]+\]' | head
```
Expected: typecheck 通过；grep 出 `min-h-[60dvh]`。

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/ChatPane.tsx
git commit -m "fix(ui): ChatPane vh → dvh 修手机地址栏收合抖动

iOS Safari 滚动时 100vh 随地址栏跳变；dvh 对齐可视区动态高度。"
```

---

## Task 4: 小屏 (<md) 响应式补回内容

**Files:**
- Modify: `src/app/layout.tsx:45-73`
- Modify: `src/components/chat/ChatPane.tsx:73,93`
- Modify: `src/components/video/VideoForm.tsx:108`
- Modify: `src/components/image/ImageForm.tsx:77`

**为什么：** < 768px 屏上副标题 / 日期 / 侧栏 aside / Marginalia 全 hidden，剩半个刊头 + 光秃内容。信息层次塌缩。

- [ ] **Step 1: layout.tsx — EST + 日期在小屏以紧凑形式显示**

Modify `src/app/layout.tsx:45`:
```tsx
<div className="eyebrow hidden sm:block">{mh.est}</div>
```
→
```tsx
<div className="eyebrow">{mh.est}</div>
```

Modify `src/app/layout.tsx:48`:
```tsx
<span className="eyebrow hidden md:inline">{today}</span>
```
→
```tsx
<span className="eyebrow text-[0.58rem] sm:text-[0.68rem]">{today}</span>
```

- [ ] **Step 2: subtitle 在小屏换成一行缩略**

Modify `src/app/layout.tsx:57-59`:
```tsx
<p className="max-w-sm text-sm text-ink-soft leading-relaxed italic display hidden md:block">
  {mh.subtitle}
</p>
```
→
```tsx
<p className="max-w-sm text-xs md:text-sm text-ink-soft leading-relaxed italic display block mt-3 md:mt-0">
  {mh.subtitle}
</p>
```

- [ ] **Step 3: 主体左侧 DISPATCH ROOM aside 小屏改成顶部横条**

Modify `src/app/layout.tsx:72-80`:
```tsx
<div className="grid grid-cols-[auto,1fr] gap-6 md:gap-10">
  <aside className="hidden md:flex flex-col items-center pt-2 gap-6">
    <div className="vertical-label">{mh.dispatchRoom}</div>
    <div className="w-px flex-1 bg-rule" />
    <div className="mono text-[0.62rem] tracking-widest text-ink-soft">§ 01</div>
  </aside>
  <div className="min-w-0 fade-up">{children}</div>
</div>
```
→
```tsx
<div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-4 md:gap-10">
  <aside className="flex md:flex-col md:items-center items-baseline gap-3 md:gap-6 md:pt-2 mono text-[0.62rem] tracking-widest text-ink-soft border-b md:border-b-0 pb-2 md:pb-0">
    <span className="md:vertical-label uppercase">{mh.dispatchRoom}</span>
    <span className="hidden md:block w-px flex-1 bg-rule" />
    <span className="ml-auto md:ml-0">§ 01</span>
  </aside>
  <div className="min-w-0 fade-up">{children}</div>
</div>
```

- [ ] **Step 4: ChatPane / ImageForm / VideoForm 顶部 chip 小屏也显示**

Modify `src/components/chat/ChatPane.tsx:73`:
```tsx
<div className="hidden md:flex items-center gap-3">
```
→
```tsx
<div className="flex items-center gap-2 md:gap-3">
```

Modify `src/components/video/VideoForm.tsx:108`:
```tsx
<span className="chip chip-ink hidden md:inline-flex">KLING · WAN</span>
```
→
```tsx
<span className="chip chip-ink">KLING · WAN</span>
```

Modify `src/components/image/ImageForm.tsx:77`:
```tsx
<span className="chip chip-ink hidden md:inline-flex">WAN · v2.2</span>
```
→
```tsx
<span className="chip chip-ink">WAN · v2.2</span>
```

- [ ] **Step 5: 本地视觉自检（开浏览器 375/768/1280px 各看一眼）**

Run:
```bash
npm run typecheck
```
打开 `http://localhost:3000`，DevTools 切 device：iPhone 12 Pro（390）、iPad（768）、desktop（1280）。
Expected: 小屏能看到 subtitle 简版 + DISPATCH ROOM 横条；chip 在所有尺寸都可见。

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/components/chat/ChatPane.tsx src/components/image/ImageForm.tsx src/components/video/VideoForm.tsx
git commit -m "feat(responsive): 小屏 <md 补回 masthead subtitle / dispatchRoom / chip

小屏刊头塌缩严重：副标题 / 日期 / 侧栏 / provider chip 全 hidden。
subtitle 改为小字尾随；DISPATCH ROOM 侧栏小屏改横条 §01 左右分布；
chip 全尺寸可见。"
```

---

## Task 5: Docker Healthcheck + 切换 debian-slim

**Files:**
- Modify: `docker-compose.yml`
- Modify: `Dockerfile`

**为什么：** (a) 容器无探活，重启顺序不可控；SafeLine 探不出后端挂了。(b) alpine 编译 better-sqlite3 每次装 python/g++ 慢；bookworm-slim 用预编译 binary。

- [ ] **Step 1: docker-compose.yml 加 healthcheck**

Modify `docker-compose.yml`:
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
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://127.0.0.1:3000/ || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
```

- [ ] **Step 2: Dockerfile 换 debian-slim**

Replace `Dockerfile`:
```dockerfile
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DASHSCOPE_API_KEY=build-time-placeholder
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apt-get update \
  && apt-get install -y --no-install-recommends tini wget \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd -g 1001 nodejs \
  && useradd -m -u 1001 -g nodejs nextjs \
  && mkdir -p /data \
  && chown -R nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/db/schema.sql ./src/lib/db/schema.sql

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
```

注意：现在 `public/` 存在（Task 1-2 产生），COPY 不会失败。

- [ ] **Step 3: 本地 build 自测**

Run:
```bash
docker build -t aikit-test . 2>&1 | tail -10
docker images aikit-test
```
Expected: build 成功，镜像大小比 alpine 稍大（~250MB）但省掉 python/g++ 环境层。

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml Dockerfile
git commit -m "chore(docker): healthcheck + debian-slim 基础镜像

- compose 加 wget spider healthcheck，SafeLine 可识别后端就绪
- alpine → bookworm-slim，better-sqlite3 用 prebuilt binary，省掉 python/g++ 构建依赖
- Public 目录 COPY 回归（Task 1-2 已建）"
```

---

## Task 6: SQLite 自动备份脚本

**Files:**
- Create: `scripts/backup-db.sh`

**为什么：** `tasks.db` 存 3h 内的任务元数据 + 已生成资源 URL。崩了朋友正在看的视频 link 丢了就难找回。

- [ ] **Step 1: 写 hot backup 脚本**

Create `scripts/backup-db.sh`:
```bash
#!/usr/bin/env bash
# SQLite hot backup（WAL 模式兼容）。服务器端 crontab 每 6h 跑一次。
# 用法：./scripts/backup-db.sh [/path/to/tasks.db] [/backup/dir]

set -euo pipefail

SRC="${1:-/opt/aikit/data/tasks.db}"
DST_DIR="${2:-/opt/aikit/backup}"
mkdir -p "$DST_DIR"

TS=$(date +%Y%m%d-%H%M%S)
OUT="$DST_DIR/tasks-$TS.db"

sqlite3 "$SRC" ".backup '$OUT'"
gzip -9 "$OUT"

# 只留最近 14 份
ls -1t "$DST_DIR"/tasks-*.db.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "✓ backup: $OUT.gz"
```

Chmod:
```bash
chmod +x scripts/backup-db.sh
```

- [ ] **Step 2: 自测**

Run（本地 dev 下）：
```bash
./scripts/backup-db.sh ./data/tasks.db /tmp/aikit-bak
ls -lh /tmp/aikit-bak/
```
Expected: 一个 `tasks-<ts>.db.gz` 文件。

- [ ] **Step 3: 写部署备忘到注释头**

脚本头已包含用法 + crontab 建议。服务器端一次性操作（不进自动化）：
```
crontab -e
# 加一行：
0 */6 * * * /opt/aikit/scripts/backup-db.sh >> /var/log/aikit-backup.log 2>&1
```

- [ ] **Step 4: Commit**

```bash
git add scripts/backup-db.sh
git commit -m "chore(ops): SQLite hot backup 脚本 + 14 份滚动保留

tasks.db 存 3h 软过期任务 + DashScope 24h 过期 URL，崩了难恢复。
sqlite3 .backup 命令兼容 WAL；gzip 压缩；保留最近 14 份。
服务器 crontab: 0 */6 * * * 每 6h 跑一次。"
```

---

## Task 7: a11y 基础补齐

**Files:**
- Modify: `src/components/shared/LangSwitcher.tsx`
- Modify: `src/components/shared/TabNav.tsx`
- Modify: `src/components/image/ImageGallery.tsx`
- Modify: `src/components/video/VideoCard.tsx`
- Modify: `src/components/chat/ChatInput.tsx`

**为什么：** 编辑器审计 10 个交互组件只 5 个有 alt/aria/sr-only。键盘用户、screen reader 用户体验差。

**原则：** 不引入新库，最小补齐：`aria-label` / `role` / `alt`。

- [ ] **Step 1: LangSwitcher**

Open `src/components/shared/LangSwitcher.tsx`，在触发按钮上加 `aria-label={'Change language'}` 或等价本地化。

Modify: 找到 `<button`（或 `<Select>` trigger），加：
```tsx
<button aria-label="Change language" ...
```

- [ ] **Step 2: TabNav**

Open `src/components/shared/TabNav.tsx`，`<nav>` 容器加 `aria-label="Primary"`；每个 `<a>` / `<button>` 加 `aria-current={isActive ? 'page' : undefined}`。

- [ ] **Step 3: ImageGallery — alt 详化**

Modify `src/components/image/ImageGallery.tsx:31`:
```tsx
<img src={u} alt={`plate-${i + 1}`} ...
```
→
```tsx
<img src={u} alt={`AIKit 生成图 ${i + 1}`} ...
```
（用 dict 多语化更好，但 MVP 先写死中文，跟 `dict.image.empty` 风格一致。）

- [ ] **Step 4: VideoCard — video 标签加 aria-label**

Modify `src/components/video/VideoCard.tsx:54`:
```tsx
<video src={videoUrl} controls className="w-full block relative z-10 px-3" />
```
→
```tsx
<video src={videoUrl} controls aria-label="Generated video" className="w-full block relative z-10 px-3" />
```

- [ ] **Step 5: ChatInput — textarea aria-label**

找到 `src/components/chat/ChatInput.tsx` 里的 textarea，加 `aria-label={dict.chat.placeholder}`。

- [ ] **Step 6: typecheck + 人工快扫**

Run:
```bash
npm run typecheck
grep -c 'aria-\|alt=\|role=' $(find src/components -name '*.tsx') | grep -v ':0$'
```
Expected: 命中文件从 5 个增至 10 个。

- [ ] **Step 7: Commit**

```bash
git add src/components/shared/LangSwitcher.tsx src/components/shared/TabNav.tsx src/components/image/ImageGallery.tsx src/components/video/VideoCard.tsx src/components/chat/ChatInput.tsx
git commit -m "a11y: aria-label / alt / role 最小补齐

LangSwitcher / TabNav / ChatInput / ImageGallery / VideoCard。
不引新库，屏读/键盘用户基线可用。"
```

---

## Task 8: 部署上线（全部合并后一次 rsync）

**为什么：** 每个 Task 单独部署浪费窗口期（每次 5-15s downtime）；合并后一次切流。

- [ ] **Step 1: push 到远端**

```bash
git push origin feature/aikit-web-impl:main feature/aikit-web-impl
```
Expected: 推送成功，main/feature 同步。

- [ ] **Step 2: rsync 代码到服务器，保留 `.env` + data**

```bash
rsync -avz --delete \
  --exclude='.git' --exclude='node_modules' --exclude='.next' \
  --exclude='data' --exclude='.env' --exclude='tsconfig.tsbuildinfo' \
  /Users/kerro/Projects/AIKit/ kapple:/opt/aikit/
```
Expected: rsync 输出 public/ 目录 + scripts/ + 改动文件同步；.env 和 data/ 未动。

- [ ] **Step 3: 服务器端 rebuild + up**

```bash
ssh kapple 'cd /opt/aikit && docker compose up -d --build 2>&1 | tail -10'
```
Expected: `Container aikit Started`；约 5-15s 切流窗口。

- [ ] **Step 4: 探活**

```bash
ssh kapple 'docker ps --filter name=aikit --format "{{.Status}}" && curl -sf -o /dev/null -w "local %{http_code}\n" http://127.0.0.1:3100/'
curl -sk -o /dev/null -w 'public %{http_code}\n' https://aikit.kerro.cn/
```
Expected: local 200、public 467（SafeLine auth 挑战）。

- [ ] **Step 5: 首屏体感冒烟测试**

用浏览器开 `https://aikit.kerro.cn`（登录后）：
- [ ] tab 有 favicon
- [ ] 首屏字体即时出现（不再 FOIT）
- [ ] 手机尺寸 (DevTools) 刊头 subtitle 可见、DISPATCH ROOM 在顶部
- [ ] Chat 打字后切 Image 再回，消息仍在（sessionStorage 活着）
- [ ] 切中文刊头文案跟着中文化

- [ ] **Step 6: 服务器端首次 cron 备份**

```bash
ssh kapple 'sudo -n crontab -l 2>/dev/null | grep aikit || (sudo -n crontab -l 2>/dev/null; echo "0 */6 * * * /opt/aikit/scripts/backup-db.sh >> /var/log/aikit-backup.log 2>&1") | sudo -n crontab -'
ssh kapple '/opt/aikit/scripts/backup-db.sh && ls -lh /opt/aikit/backup/'
```
Expected: 一份 `tasks-<ts>.db.gz`。

---

## Self-Review

**1. Spec coverage** — 8 项缺口对齐：

| 缺口 | 任务 |
|---|---|
| #1 Google Fonts 阻塞 | Task 1 ✓ |
| #2 <md 响应式塌缩 | Task 4 ✓ |
| #3 无 favicon / OG | Task 2 ✓ |
| #4 vh 地址栏抖动 | Task 3 ✓ |
| #5 a11y 稀薄 | Task 7 ✓ |
| #6 Docker healthcheck | Task 5 ✓ |
| #7 alpine 编译慢 | Task 5 ✓（合并进 Docker 任务） |
| #8 无 tasks.db 备份 | Task 6 ✓ |

**2. Placeholder scan** — 检查过，无 "TBD"/"similar to"/"handle edge cases"；每步有具体命令或代码。唯一模糊点是 Task 7 Step 2 的 `<nav>` / `<a>` 位置需要读取文件看实际 JSX，这是为了避免重复 Read 节奏，但每步都给了具体加什么属性。

**3. Type consistency** — 新增 `public/fonts/*.woff2` 路径在 Task 1 和 Task 5 Dockerfile `COPY public` 一致；`scripts/backup-db.sh` 路径 `/opt/aikit/data/tasks.db` 跟 `docker-compose.yml` 挂载对齐。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-22-aikit-post-launch-optimization.md`. 

两种执行方式：

**1. Subagent-Driven（推荐）** — 我每个 Task 派一个 fresh subagent，Task 间评审，快速迭代

**2. Inline Execution** — 本 session 按 `executing-plans` 批执行带 checkpoint

哪种？
