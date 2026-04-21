# AIKit Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在腾讯云 `kapple` 服务器上交付 `https://<YOUR_DOMAIN>` 极简 AI Web——3 tab（Chat / Image / Video）封装阿里 DashScope，i18n 三语，雷池 WAF + Basic Auth 门禁，SQLite 存 3h 软过期任务。

**Architecture:** 单进程 Next.js 15 App Router + better-sqlite3 + DashScope async poll。前端 shadcn/ui + Tailwind 的 UI 壳；后端 Route Handlers 做 submit/poll/SSE；部署进 Docker 绑到 `127.0.0.1:3100`，雷池反代 + Let's Encrypt + Basic Auth。不落磁盘除 SQLite 元数据。

**Tech Stack:** Next.js 15（App Router standalone 输出）/ TypeScript 5 / Tailwind 3 / Radix + shadcn/ui / better-sqlite3 11 / axios 1 / zod 3 / Vitest 2 / msw 2 / Node 20 alpine / Docker compose / SafeLine (雷池) Tengine。

---

## Spec Gap（请先 review）

Spec §7.4 写的视频路由是 `wanx-r2v / wanx-i2v / wanx-t2v`，但 DashScope 目前只存在 `wan2.7-t2v`——I2V / R2V 能力实际由 Kling 系列承载（已在 InkFrame 验证）。本 plan 按下面的实际能力做落地：

| 输入 | 路由到 Provider | model ID |
|---|---|---|
| `refImages.length > 0` | `kling-v3-omni` | `kling/kling-v3-omni-video-generation` |
| `firstFrame` | `kling-v3` | `kling/kling-v3-video-generation` |
| 其它 | `wanx-t2v` | `wan2.7-t2v` |

API 响应里的 `provider` 字段、前端 TaskCard 里展示的 provider 标签都采用这三个 ID。如不同意可以改回原 spec 命名但实现仍是这三个 model——给我一句话就行。

---

## 文件结构（任务锁定）

```
AIKit/
├── package.json                              T01
├── tsconfig.json                             T01
├── next.config.mjs                           T01
├── tailwind.config.ts                        T02
├── postcss.config.mjs                        T02
├── vitest.config.ts                          T01
├── .env.example                              T01
├── .gitignore                                T01
├── components.json                           T02
├── src/
│   ├── app/
│   │   ├── layout.tsx                        T15
│   │   ├── page.tsx                          T16
│   │   ├── globals.css                       T02
│   │   ├── image/page.tsx                    T17
│   │   ├── video/page.tsx                    T18
│   │   └── api/
│   │       ├── chat/route.ts                 T12
│   │       ├── image/submit/route.ts         T13
│   │       ├── image/[taskId]/route.ts       T13
│   │       ├── video/submit/route.ts         T14
│   │       └── video/[taskId]/route.ts       T14
│   ├── components/
│   │   ├── chat/ChatPane.tsx                 T16
│   │   ├── chat/MessageList.tsx              T16
│   │   ├── chat/ChatInput.tsx                T16
│   │   ├── image/ImageForm.tsx               T17
│   │   ├── image/ImageGallery.tsx            T17
│   │   ├── video/VideoForm.tsx               T18
│   │   ├── video/VideoCard.tsx               T18
│   │   ├── shared/TabNav.tsx                 T15
│   │   ├── shared/LangSwitcher.tsx           T15
│   │   ├── shared/ExpiryBanner.tsx           T15
│   │   └── ui/                               T02 (shadcn generated)
│   ├── lib/
│   │   ├── env.ts                            T03
│   │   ├── errors.ts                         T03
│   │   ├── dashscope/
│   │   │   ├── client.ts                     T08
│   │   │   ├── chat.ts                       T09
│   │   │   ├── image.ts                      T10
│   │   │   ├── video.ts                      T11
│   │   │   └── types.ts                      T08
│   │   ├── db/
│   │   │   ├── client.ts                     T05
│   │   │   ├── schema.sql                    T05
│   │   │   ├── tasks.ts                      T06
│   │   │   └── cron.ts                       T07
│   │   ├── i18n/
│   │   │   ├── types.ts                      T04
│   │   │   ├── en.ts                         T04
│   │   │   ├── zh.ts                         T04
│   │   │   ├── th.ts                         T04
│   │   │   └── index.ts                      T04
│   │   └── jobs/
│   │       └── poller.ts                     T19
│   └── middleware.ts                         T04
├── tests/
│   ├── fixtures/providers/
│   │   ├── wanx-image/*.json                 T10
│   │   ├── wanx-t2v/*.json                   T11
│   │   ├── kling-v3/*.json                   T11
│   │   └── kling-v3-omni/*.json              T11
│   ├── dashscope/
│   │   ├── chat.test.ts                      T09
│   │   ├── image.test.ts                     T10
│   │   └── video.test.ts                     T11
│   ├── api/
│   │   ├── chat.test.ts                      T12
│   │   ├── image.test.ts                     T13
│   │   └── video.test.ts                     T14
│   └── db/
│       └── tasks.test.ts                     T06
├── data/.gitkeep                             T01
├── Dockerfile                                T21
├── docker-compose.yml                        T21
├── README.md                                 T22
└── docs/superpowers/
    ├── specs/2026-04-20-aikit-web-design.md  (already)
    └── plans/2026-04-20-aikit-web-impl…md    (this file)
```

---

## Task 索引

| # | 名称 | 依赖 |
|---|---|---|
| T01 | Next.js 骨架 + 依赖 + 配置 | — |
| T02 | Tailwind + shadcn/ui + 全局样式 | T01 |
| T03 | env.ts + errors.ts + mapping | T01 |
| T04 | i18n 字典 + middleware + dict loader | T01 |
| T05 | SQLite client + schema 初始化 | T01 |
| T06 | tasks CRUD + resume 查询 | T05 |
| T07 | cron 清理 30 min | T06 |
| T08 | DashScope axios client + types | T03 |
| T09 | Qwen SSE 流 chat.ts + 单测 | T08 |
| T10 | Wanx Image submit/poll + 单测 | T08 |
| T11 | Video 路由 + submit/poll 三 Provider + 单测 | T08 |
| T12 | `/api/chat` Route Handler + 单测 | T09 |
| T13 | `/api/image/*` Route Handlers + 单测 | T06, T10 |
| T14 | `/api/video/*` Route Handlers + 单测 | T06, T11 |
| T15 | layout + TabNav + LangSwitcher + ExpiryBanner | T04 |
| T16 | ChatPane + MessageList + ChatInput | T15, T12 |
| T17 | ImageForm + ImageGallery | T15, T13 |
| T18 | VideoForm + VideoCard + Player | T15, T14 |
| T19 | 启动期 resume poller（已存任务继续） | T06, T14 |
| T20 | 启动期 cron 挂载 | T07, T19 |
| T21 | Dockerfile + docker-compose | 全部 |
| T22 | README + 部署手册 | T21 |
| T23 | 端到端 smoke（本地 Docker 启动验证） | T22 |

---

## Task 1: Next.js 骨架 + 依赖 + 配置

**Files:**
- Create: `/Users/kerro/Projects/AIKit/package.json`
- Create: `/Users/kerro/Projects/AIKit/tsconfig.json`
- Create: `/Users/kerro/Projects/AIKit/next.config.mjs`
- Create: `/Users/kerro/Projects/AIKit/vitest.config.ts`
- Create: `/Users/kerro/Projects/AIKit/.env.example`
- Create: `/Users/kerro/Projects/AIKit/.gitignore`
- Create: `/Users/kerro/Projects/AIKit/data/.gitkeep`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "aikit",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "node .next/standalone/server.js",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "15.1.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "axios": "^1.7.0",
    "better-sqlite3": "^11.5.0",
    "zod": "^3.23.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.0",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.454.0",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-select": "^2.1.2"
  },
  "devDependencies": {
    "@types/node": "^20.16.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/better-sqlite3": "^7.6.11",
    "typescript": "^5.6.0",
    "tailwindcss": "^3.4.14",
    "postcss": "^8.4.49",
    "autoprefixer": "^10.4.20",
    "tailwindcss-animate": "^1.0.7",
    "vitest": "^2.1.4",
    "@vitest/coverage-v8": "^2.1.4",
    "msw": "^2.6.0",
    "eslint": "^9.14.0",
    "eslint-config-next": "15.1.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts"],
  "exclude": ["node_modules", ".next"]
}
```

- [ ] **Step 3: 创建 next.config.mjs**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
};
export default nextConfig;
```

- [ ] **Step 4: 创建 vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: [],
    testTimeout: 10_000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
```

- [ ] **Step 5: 创建 .env.example**

```env
# 阿里 DashScope API Key — 必填，启动期校验
DASHSCOPE_API_KEY=sk-your-key-here

# SQLite 文件路径；Docker 下挂到 /data
DATABASE_PATH=./data/tasks.db

# Next.js
NODE_ENV=development
```

- [ ] **Step 6: 创建 .gitignore**

```
node_modules/
.next/
.env
.env.local
/data/*.db
/data/*.db-shm
/data/*.db-wal
*.log
.DS_Store
coverage/
```

- [ ] **Step 7: 创建 data/.gitkeep**

```
```（空文件）

- [ ] **Step 8: 安装依赖**

Run: `cd /Users/kerro/Projects/AIKit && npm install`
Expected: "added N packages" 无 error（better-sqlite3 会触发原生编译，macOS 需装 Xcode CLT）。

- [ ] **Step 9: 验证编译**

Run: `cd /Users/kerro/Projects/AIKit && npm run typecheck`
Expected: 无报错（空项目因无源码通过）。

- [ ] **Step 10: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add package.json package-lock.json tsconfig.json next.config.mjs vitest.config.ts .env.example .gitignore data/.gitkeep && git commit -m "chore: bootstrap Next.js 15 + TS + Vitest skeleton"
```

---

## Task 2: Tailwind + shadcn/ui + 全局样式

**Files:**
- Create: `/Users/kerro/Projects/AIKit/tailwind.config.ts`
- Create: `/Users/kerro/Projects/AIKit/postcss.config.mjs`
- Create: `/Users/kerro/Projects/AIKit/components.json`
- Create: `/Users/kerro/Projects/AIKit/src/app/globals.css`
- Create: `/Users/kerro/Projects/AIKit/src/lib/utils.ts`

- [ ] **Step 1: 创建 tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1200px' } },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
```

- [ ] **Step 2: 创建 postcss.config.mjs**

```javascript
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 3: 创建 components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

- [ ] **Step 4: 创建 src/app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }
  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }
  html { @apply dark; }
  body { @apply bg-background text-foreground antialiased; font-family: ui-sans-serif, system-ui, sans-serif; }
}
```

- [ ] **Step 5: 创建 src/lib/utils.ts**

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
```

- [ ] **Step 6: 安装并生成 shadcn/ui 基础组件**

Run:
```bash
cd /Users/kerro/Projects/AIKit
npx shadcn@latest add button textarea select dropdown-menu label card input sonner -y
```
Expected: 在 `src/components/ui/` 下生成 `button.tsx` / `textarea.tsx` / `select.tsx` / `dropdown-menu.tsx` / `label.tsx` / `card.tsx` / `input.tsx` / `sonner.tsx`。

- [ ] **Step 7: 验证 typecheck 通过**

Run: `cd /Users/kerro/Projects/AIKit && npm run typecheck`
Expected: 无 error。

- [ ] **Step 8: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add tailwind.config.ts postcss.config.mjs components.json src/app/globals.css src/lib/utils.ts src/components/ui/ && git commit -m "chore: add Tailwind + shadcn/ui base components"
```

---

## Task 3: env.ts + errors.ts + DashScope 映射

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/lib/env.ts`
- Create: `/Users/kerro/Projects/AIKit/src/lib/errors.ts`
- Test: `/Users/kerro/Projects/AIKit/tests/lib/errors.test.ts`

- [ ] **Step 1: 写失败测试 tests/lib/errors.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { AIKitError, mapDashScopeError } from '@/lib/errors';

describe('mapDashScopeError', () => {
  it('maps InvalidApiKey → INVALID_KEY', () => {
    const err = mapDashScopeError({ code: 'InvalidApiKey', message: 'bad key' });
    expect(err).toBeInstanceOf(AIKitError);
    expect(err.code).toBe('INVALID_KEY');
  });

  it('maps DataInspectionFailed → CONTENT_POLICY', () => {
    const err = mapDashScopeError({ code: 'DataInspectionFailed', message: 'sensitive' });
    expect(err.code).toBe('CONTENT_POLICY');
  });

  it('maps IPInfringementSuspect → CONTENT_POLICY', () => {
    const err = mapDashScopeError({ code: 'IPInfringementSuspect', message: 'ip' });
    expect(err.code).toBe('CONTENT_POLICY');
  });

  it('maps Throttling.* → RATE_LIMITED', () => {
    const err = mapDashScopeError({ code: 'Throttling.RateQuota', message: 'slow down' });
    expect(err.code).toBe('RATE_LIMITED');
  });

  it('maps ECONNABORTED → NETWORK_ERROR', () => {
    const err = mapDashScopeError({ code: 'ECONNABORTED', message: 'timeout' });
    expect(err.code).toBe('NETWORK_ERROR');
  });

  it('falls back to UNKNOWN', () => {
    const err = mapDashScopeError({ message: 'weird' });
    expect(err.code).toBe('UNKNOWN');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd /Users/kerro/Projects/AIKit && npx vitest run tests/lib/errors.test.ts`
Expected: FAIL — "Cannot find module '@/lib/errors'"

- [ ] **Step 3: 实现 src/lib/errors.ts**

```typescript
export type AIKitErrorCode =
  | 'INVALID_KEY'
  | 'CONTENT_POLICY'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export class AIKitError extends Error {
  constructor(
    public readonly code: AIKitErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AIKitError';
  }

  toJSON() {
    return { code: this.code, message: this.message };
  }
}

export function mapDashScopeError(raw: unknown): AIKitError {
  const r = raw as Record<string, unknown> | null | undefined;
  if (r && typeof r === 'object') {
    const code = typeof r.code === 'string' ? r.code : undefined;
    const message = typeof r.message === 'string' ? r.message : 'unknown';
    if (code === 'InvalidApiKey') return new AIKitError('INVALID_KEY', message, raw);
    if (code === 'DataInspectionFailed' || code === 'IPInfringementSuspect')
      return new AIKitError('CONTENT_POLICY', message, raw);
    if (code && code.startsWith('Throttling'))
      return new AIKitError('RATE_LIMITED', message, raw);
    if (code === 'ECONNABORTED' || code === 'ENETUNREACH' || code === 'ETIMEDOUT')
      return new AIKitError('NETWORK_ERROR', message, raw);
    return new AIKitError('UNKNOWN', message, raw);
  }
  return new AIKitError('UNKNOWN', 'unknown', raw);
}

export function httpStatusForCode(code: AIKitErrorCode): number {
  switch (code) {
    case 'CONTENT_POLICY': return 400;
    case 'RATE_LIMITED':   return 429;
    case 'NETWORK_ERROR':  return 502;
    case 'INVALID_KEY':    return 500;
    case 'UNKNOWN':        return 500;
  }
}
```

- [ ] **Step 4: 实现 src/lib/env.ts**

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DASHSCOPE_API_KEY: z.string().min(1, 'DASHSCOPE_API_KEY required'),
  DATABASE_PATH: z.string().default('./data/tasks.db'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid env: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    );
  }
  return parsed.data;
}

export const env = loadEnv();
```

- [ ] **Step 5: 运行测试通过**

Run: `cd /Users/kerro/Projects/AIKit && DASHSCOPE_API_KEY=sk-test npx vitest run tests/lib/errors.test.ts`
Expected: 6 passed.

- [ ] **Step 6: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/lib/env.ts src/lib/errors.ts tests/lib/errors.test.ts && git commit -m "feat(lib): AIKitError + DashScope error mapping + env validation"
```

---

## Task 4: i18n 字典 + middleware

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/lib/i18n/types.ts`
- Create: `/Users/kerro/Projects/AIKit/src/lib/i18n/en.ts`
- Create: `/Users/kerro/Projects/AIKit/src/lib/i18n/zh.ts`
- Create: `/Users/kerro/Projects/AIKit/src/lib/i18n/th.ts`
- Create: `/Users/kerro/Projects/AIKit/src/lib/i18n/index.ts`
- Create: `/Users/kerro/Projects/AIKit/src/middleware.ts`
- Test: `/Users/kerro/Projects/AIKit/tests/lib/i18n.test.ts`

- [ ] **Step 1: 创建 src/lib/i18n/types.ts**

```typescript
export type Locale = 'en' | 'zh' | 'th';
export const LOCALES: readonly Locale[] = ['en', 'zh', 'th'];
export const DEFAULT_LOCALE: Locale = 'en';

export type Dict = {
  nav: { chat: string; image: string; video: string };
  chat: { send: string; placeholder: string; thinking: string };
  image: {
    prompt: string; promptPlaceholder: string;
    ratio: string; batch: string; generate: string; generating: string;
    empty: string;
  };
  video: {
    prompt: string; promptPlaceholder: string;
    duration: string; resolution: string; aspectRatio: string;
    firstFrame: string; refImages: string; refImagesHint: string;
    generate: string; generating: string;
    providerLabel: string; empty: string;
  };
  common: {
    loading: string; error: string; retry: string;
    expiresAt: string; saveNow: string;
    seconds: string; minutes: string; hours: string;
  };
  errors: {
    INVALID_KEY: string;
    CONTENT_POLICY: string;
    RATE_LIMITED: string;
    NETWORK_ERROR: string;
    UNKNOWN: string;
  };
};
```

- [ ] **Step 2: 创建 src/lib/i18n/en.ts**

```typescript
import type { Dict } from './types';

const en: Dict = {
  nav: { chat: 'Chat', image: 'Image', video: 'Video' },
  chat: { send: 'Send', placeholder: 'Ask anything…', thinking: 'Thinking…' },
  image: {
    prompt: 'Prompt', promptPlaceholder: 'Describe the image…',
    ratio: 'Aspect ratio', batch: 'Batch', generate: 'Generate', generating: 'Generating…',
    empty: 'Your images will appear here.',
  },
  video: {
    prompt: 'Prompt', promptPlaceholder: 'Describe the video…',
    duration: 'Duration', resolution: 'Resolution', aspectRatio: 'Aspect ratio',
    firstFrame: 'First frame (optional)', refImages: 'Reference images (optional)',
    refImagesHint: 'Up to 4 images. If uploaded, routes to kling-v3-omni.',
    generate: 'Generate', generating: 'Generating…',
    providerLabel: 'Provider', empty: 'Your videos will appear here.',
  },
  common: {
    loading: 'Loading…', error: 'Something went wrong', retry: 'Retry',
    expiresAt: 'Expires at', saveNow: 'Save now before it expires',
    seconds: 's', minutes: 'm', hours: 'h',
  },
  errors: {
    INVALID_KEY: 'Server misconfigured: API key invalid. Please contact the admin.',
    CONTENT_POLICY: 'Blocked by the content safety filter. Try a different prompt.',
    RATE_LIMITED: 'Rate limit reached. Please wait a moment and retry.',
    NETWORK_ERROR: 'Network error. Please retry.',
    UNKNOWN: 'Unexpected error. Please retry.',
  },
};
export default en;
```

- [ ] **Step 3: 创建 src/lib/i18n/zh.ts**

```typescript
import type { Dict } from './types';

const zh: Dict = {
  nav: { chat: '对话', image: '生图', video: '生视频' },
  chat: { send: '发送', placeholder: '问点什么…', thinking: '思考中…' },
  image: {
    prompt: '提示词', promptPlaceholder: '描述想要的画面…',
    ratio: '比例', batch: '张数', generate: '生成', generating: '生成中…',
    empty: '图片结果将显示在这里。',
  },
  video: {
    prompt: '提示词', promptPlaceholder: '描述想要的视频…',
    duration: '时长', resolution: '分辨率', aspectRatio: '比例',
    firstFrame: '首帧图（可选）', refImages: '参考图（可选）',
    refImagesHint: '最多 4 张。上传参考图会走 kling-v3-omni。',
    generate: '生成', generating: '生成中…',
    providerLabel: '模型', empty: '视频结果将显示在这里。',
  },
  common: {
    loading: '加载中…', error: '出错了', retry: '重试',
    expiresAt: '过期时间', saveNow: '3 小时后失效，及时另存',
    seconds: '秒', minutes: '分钟', hours: '小时',
  },
  errors: {
    INVALID_KEY: '服务端配置错误：API Key 无效，请联系管理员。',
    CONTENT_POLICY: '内容未通过安全审核，请换个说法。',
    RATE_LIMITED: '达到速率限制，请稍后再试。',
    NETWORK_ERROR: '网络错误，请重试。',
    UNKNOWN: '未知错误，请重试。',
  },
};
export default zh;
```

- [ ] **Step 4: 创建 src/lib/i18n/th.ts**

```typescript
import type { Dict } from './types';

const th: Dict = {
  nav: { chat: 'แชท', image: 'ภาพ', video: 'วิดีโอ' },
  chat: { send: 'ส่ง', placeholder: 'ถามอะไรก็ได้…', thinking: 'กำลังคิด…' },
  image: {
    prompt: 'พรอมต์', promptPlaceholder: 'อธิบายภาพที่ต้องการ…',
    ratio: 'อัตราส่วน', batch: 'จำนวน', generate: 'สร้าง', generating: 'กำลังสร้าง…',
    empty: 'ภาพของคุณจะปรากฏที่นี่',
  },
  video: {
    prompt: 'พรอมต์', promptPlaceholder: 'อธิบายวิดีโอที่ต้องการ…',
    duration: 'ความยาว', resolution: 'ความละเอียด', aspectRatio: 'อัตราส่วน',
    firstFrame: 'เฟรมแรก (ไม่บังคับ)', refImages: 'ภาพอ้างอิง (ไม่บังคับ)',
    refImagesHint: 'สูงสุด 4 ภาพ หากอัปโหลดจะใช้ kling-v3-omni',
    generate: 'สร้าง', generating: 'กำลังสร้าง…',
    providerLabel: 'โมเดล', empty: 'วิดีโอของคุณจะปรากฏที่นี่',
  },
  common: {
    loading: 'กำลังโหลด…', error: 'เกิดข้อผิดพลาด', retry: 'ลองใหม่',
    expiresAt: 'หมดอายุ', saveNow: 'บันทึกก่อนหมดอายุภายใน 3 ชั่วโมง',
    seconds: 'วินาที', minutes: 'นาที', hours: 'ชั่วโมง',
  },
  errors: {
    INVALID_KEY: 'เซิร์ฟเวอร์ตั้งค่าไม่ถูกต้อง: API key ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ',
    CONTENT_POLICY: 'ถูกกรองโดยระบบตรวจสอบเนื้อหา โปรดลองพรอมต์อื่น',
    RATE_LIMITED: 'ถึงขีดจำกัดอัตรา โปรดรอสักครู่แล้วลองใหม่',
    NETWORK_ERROR: 'ข้อผิดพลาดเครือข่าย โปรดลองใหม่',
    UNKNOWN: 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ โปรดลองใหม่',
  },
};
export default th;
```

- [ ] **Step 5: 创建 src/lib/i18n/index.ts**

```typescript
import en from './en';
import zh from './zh';
import th from './th';
import { type Dict, type Locale, DEFAULT_LOCALE, LOCALES } from './types';

const DICTS: Record<Locale, Dict> = { en, zh, th };

export function getDict(locale: string | undefined): Dict {
  if (locale && (LOCALES as readonly string[]).includes(locale)) {
    return DICTS[locale as Locale];
  }
  return DICTS[DEFAULT_LOCALE];
}

export function normalizeLocale(locale: string | undefined | null): Locale {
  if (locale && (LOCALES as readonly string[]).includes(locale)) return locale as Locale;
  return DEFAULT_LOCALE;
}

export { type Dict, type Locale, DEFAULT_LOCALE, LOCALES };
```

- [ ] **Step 6: 写测试 tests/lib/i18n.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { getDict, normalizeLocale, LOCALES, DEFAULT_LOCALE } from '@/lib/i18n';
import en from '@/lib/i18n/en';
import zh from '@/lib/i18n/zh';
import th from '@/lib/i18n/th';

describe('i18n', () => {
  it('returns default en when no locale', () => {
    expect(getDict(undefined).nav.chat).toBe('Chat');
  });

  it('returns zh for zh', () => {
    expect(getDict('zh').nav.chat).toBe('对话');
  });

  it('returns th for th', () => {
    expect(getDict('th').nav.chat).toBe('แชท');
  });

  it('falls back to default for unknown', () => {
    expect(getDict('fr').nav.chat).toBe('Chat');
  });

  it('normalizeLocale returns valid locale', () => {
    expect(normalizeLocale('zh')).toBe('zh');
    expect(normalizeLocale(null)).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale('xx')).toBe(DEFAULT_LOCALE);
  });

  it('all dicts share identical key structure', () => {
    const flatten = (o: unknown, prefix = ''): string[] => {
      if (typeof o !== 'object' || o === null) return [prefix];
      return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
        flatten(v, prefix ? `${prefix}.${k}` : k),
      );
    };
    const enKeys = flatten(en).sort();
    expect(flatten(zh).sort()).toEqual(enKeys);
    expect(flatten(th).sort()).toEqual(enKeys);
  });

  it('LOCALES exports all 3', () => {
    expect(LOCALES).toEqual(['en', 'zh', 'th']);
  });
});
```

- [ ] **Step 7: 运行测试通过**

Run: `cd /Users/kerro/Projects/AIKit && DASHSCOPE_API_KEY=sk-test npx vitest run tests/lib/i18n.test.ts`
Expected: 7 passed.

- [ ] **Step 8: 创建 src/middleware.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { LOCALES, DEFAULT_LOCALE } from '@/lib/i18n/types';

const COOKIE_NAME = 'locale';

export function middleware(req: NextRequest) {
  const current = req.cookies.get(COOKIE_NAME)?.value;
  if (current && (LOCALES as readonly string[]).includes(current)) {
    return NextResponse.next();
  }
  const accept = req.headers.get('accept-language') ?? '';
  const preferred = (LOCALES as readonly string[]).find((l) => accept.toLowerCase().includes(l)) ?? DEFAULT_LOCALE;
  const res = NextResponse.next();
  res.cookies.set(COOKIE_NAME, preferred, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  return res;
}

export const config = {
  matcher: ['/((?!api|_next|favicon).*)'],
};
```

- [ ] **Step 9: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/lib/i18n/ src/middleware.ts tests/lib/i18n.test.ts && git commit -m "feat(i18n): en/zh/th dicts + locale cookie middleware"
```

---

## Task 5: SQLite client + schema

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/lib/db/schema.sql`
- Create: `/Users/kerro/Projects/AIKit/src/lib/db/client.ts`

- [ ] **Step 1: 创建 src/lib/db/schema.sql**

```sql
CREATE TABLE IF NOT EXISTS tasks (
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

CREATE INDEX IF NOT EXISTS idx_tasks_expires ON tasks(expires_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status  ON tasks(status);
```

- [ ] **Step 2: 创建 src/lib/db/client.ts**

```typescript
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../env';

const SCHEMA_PATH = path.resolve(process.cwd(), 'src/lib/db/schema.sql');

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (instance) return instance;

  const dir = path.dirname(env.DATABASE_PATH);
  fs.mkdirSync(dir, { recursive: true });

  const db = new Database(env.DATABASE_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  instance = db;
  return db;
}

export function closeDb(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
```

- [ ] **Step 3: 验证 typecheck**

Run: `cd /Users/kerro/Projects/AIKit && npm run typecheck`
Expected: 无 error。

- [ ] **Step 4: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/lib/db/client.ts src/lib/db/schema.sql && git commit -m "feat(db): SQLite client + schema bootstrap"
```

---

## Task 6: tasks CRUD + resume 查询

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/lib/db/tasks.ts`
- Test: `/Users/kerro/Projects/AIKit/tests/db/tasks.test.ts`

- [ ] **Step 1: 写失败测试 tests/db/tasks.test.ts**

```typescript
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const TEST_DB = path.resolve(process.cwd(), 'data/test-tasks.db');
process.env.DATABASE_PATH = TEST_DB;
process.env.DASHSCOPE_API_KEY = 'sk-test';

import {
  createTask, getTask, setDashScopeId, markSuccess, markFailed,
  listPendingNotExpired, listNotExpired, deleteExpired,
} from '@/lib/db/tasks';
import { getDb, closeDb } from '@/lib/db/client';

function resetDb() {
  closeDb();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  getDb();
}

beforeEach(resetDb);
afterAll(() => {
  closeDb();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe('tasks db', () => {
  it('creates and reads a task', () => {
    const row = createTask({ type: 'image', provider: 'wanx-image', prompt: 'a cat', params: { n: 2 } });
    expect(row.task_id).toBeTruthy();
    expect(row.status).toBe('pending');
    const read = getTask(row.task_id);
    expect(read?.prompt).toBe('a cat');
    expect(JSON.parse(read!.params!)).toEqual({ n: 2 });
  });

  it('stores dashscope id and marks success', () => {
    const row = createTask({ type: 'image', provider: 'wanx-image', prompt: 'x', params: {} });
    setDashScopeId(row.task_id, 'ds-123');
    markSuccess(row.task_id, ['https://x/a.png', 'https://x/b.png']);
    const read = getTask(row.task_id)!;
    expect(read.dashscope_id).toBe('ds-123');
    expect(read.status).toBe('success');
    expect(JSON.parse(read.result_urls!)).toEqual(['https://x/a.png', 'https://x/b.png']);
  });

  it('marks failed with error', () => {
    const row = createTask({ type: 'image', provider: 'wanx-image', prompt: 'x', params: {} });
    markFailed(row.task_id, 'CONTENT_POLICY', 'blocked');
    const read = getTask(row.task_id)!;
    expect(read.status).toBe('failed');
    expect(read.error_code).toBe('CONTENT_POLICY');
    expect(read.error_message).toBe('blocked');
  });

  it('listPendingNotExpired excludes expired and non-pending', () => {
    const fresh = createTask({ type: 'video', provider: 'wanx-t2v', prompt: 'a', params: {} });
    const done = createTask({ type: 'video', provider: 'wanx-t2v', prompt: 'b', params: {} });
    markSuccess(done.task_id, ['u']);
    const stale = createTask({ type: 'video', provider: 'wanx-t2v', prompt: 'c', params: {} });
    getDb().prepare('UPDATE tasks SET expires_at = ? WHERE task_id = ?').run(Date.now() - 1000, stale.task_id);

    const list = listPendingNotExpired();
    const ids = list.map((r) => r.task_id);
    expect(ids).toContain(fresh.task_id);
    expect(ids).not.toContain(done.task_id);
    expect(ids).not.toContain(stale.task_id);
  });

  it('listNotExpired returns all non-expired ordered desc', () => {
    const a = createTask({ type: 'image', provider: 'wanx-image', prompt: 'a', params: {} });
    const b = createTask({ type: 'image', provider: 'wanx-image', prompt: 'b', params: {} });
    const list = listNotExpired();
    expect(list[0].task_id).toBe(b.task_id);
    expect(list[1].task_id).toBe(a.task_id);
  });

  it('deleteExpired removes only expired', () => {
    const fresh = createTask({ type: 'image', provider: 'wanx-image', prompt: 'a', params: {} });
    const stale = createTask({ type: 'image', provider: 'wanx-image', prompt: 'b', params: {} });
    getDb().prepare('UPDATE tasks SET expires_at = ? WHERE task_id = ?').run(Date.now() - 1000, stale.task_id);
    const n = deleteExpired();
    expect(n).toBe(1);
    expect(getTask(fresh.task_id)).toBeTruthy();
    expect(getTask(stale.task_id)).toBeNull();
  });

  it('3h expiry default', () => {
    const row = createTask({ type: 'image', provider: 'wanx-image', prompt: 'x', params: {} });
    const diff = row.expires_at - row.created_at;
    expect(diff).toBe(3 * 60 * 60 * 1000);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd /Users/kerro/Projects/AIKit && npx vitest run tests/db/tasks.test.ts`
Expected: FAIL — "Cannot find module '@/lib/db/tasks'"

- [ ] **Step 3: 实现 src/lib/db/tasks.ts**

```typescript
import { randomUUID } from 'node:crypto';
import { getDb } from './client';

export const TASK_TTL_MS = 3 * 60 * 60 * 1000;

export type TaskType = 'image' | 'video';
export type TaskStatus = 'pending' | 'success' | 'failed';

export type TaskRow = {
  task_id: string;
  type: TaskType;
  provider: string;
  dashscope_id: string | null;
  status: TaskStatus;
  prompt: string;
  params: string | null;
  result_urls: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: number;
  expires_at: number;
};

export function createTask(input: {
  type: TaskType;
  provider: string;
  prompt: string;
  params: Record<string, unknown>;
}): TaskRow {
  const db = getDb();
  const now = Date.now();
  const row: TaskRow = {
    task_id: randomUUID(),
    type: input.type,
    provider: input.provider,
    dashscope_id: null,
    status: 'pending',
    prompt: input.prompt,
    params: JSON.stringify(input.params ?? {}),
    result_urls: null,
    error_code: null,
    error_message: null,
    created_at: now,
    expires_at: now + TASK_TTL_MS,
  };
  db.prepare(
    `INSERT INTO tasks (task_id,type,provider,dashscope_id,status,prompt,params,result_urls,error_code,error_message,created_at,expires_at)
     VALUES (@task_id,@type,@provider,@dashscope_id,@status,@prompt,@params,@result_urls,@error_code,@error_message,@created_at,@expires_at)`,
  ).run(row);
  return row;
}

export function getTask(taskId: string): TaskRow | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId);
  return (row ?? null) as TaskRow | null;
}

export function setDashScopeId(taskId: string, dashscopeId: string): void {
  getDb().prepare('UPDATE tasks SET dashscope_id = ? WHERE task_id = ?').run(dashscopeId, taskId);
}

export function markSuccess(taskId: string, urls: string[]): void {
  getDb()
    .prepare("UPDATE tasks SET status = 'success', result_urls = ? WHERE task_id = ?")
    .run(JSON.stringify(urls), taskId);
}

export function markFailed(taskId: string, code: string, message: string): void {
  getDb()
    .prepare("UPDATE tasks SET status = 'failed', error_code = ?, error_message = ? WHERE task_id = ?")
    .run(code, message, taskId);
}

export function listPendingNotExpired(): TaskRow[] {
  const now = Date.now();
  return getDb()
    .prepare("SELECT * FROM tasks WHERE status = 'pending' AND expires_at > ?")
    .all(now) as TaskRow[];
}

export function listNotExpired(): TaskRow[] {
  const now = Date.now();
  return getDb()
    .prepare('SELECT * FROM tasks WHERE expires_at > ? ORDER BY created_at DESC')
    .all(now) as TaskRow[];
}

export function deleteExpired(): number {
  const now = Date.now();
  return getDb().prepare('DELETE FROM tasks WHERE expires_at < ?').run(now).changes;
}
```

- [ ] **Step 4: 运行测试通过**

Run: `cd /Users/kerro/Projects/AIKit && npx vitest run tests/db/tasks.test.ts`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/lib/db/tasks.ts tests/db/tasks.test.ts && git commit -m "feat(db): tasks CRUD + resume query with 3h TTL"
```

---

## Task 7: cron 清理（30 min）

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/lib/db/cron.ts`

- [ ] **Step 1: 实现 src/lib/db/cron.ts**

```typescript
import { deleteExpired } from './tasks';

const CLEAN_INTERVAL_MS = 30 * 60 * 1000;

let handle: NodeJS.Timeout | null = null;

export function startCleanupCron(): void {
  if (handle) return;
  handle = setInterval(() => {
    try {
      const n = deleteExpired();
      if (n > 0) console.log(`[cron] deleted ${n} expired tasks`);
    } catch (err) {
      console.error('[cron] cleanup failed:', err);
    }
  }, CLEAN_INTERVAL_MS);
  if (handle.unref) handle.unref();
}

export function stopCleanupCron(): void {
  if (handle) {
    clearInterval(handle);
    handle = null;
  }
}
```

- [ ] **Step 2: 验证 typecheck**

Run: `cd /Users/kerro/Projects/AIKit && npm run typecheck`
Expected: 无 error。

- [ ] **Step 3: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/lib/db/cron.ts && git commit -m "feat(db): 30min cleanup cron for expired tasks"
```

---

## Task 8: DashScope axios client + types

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/lib/dashscope/types.ts`
- Create: `/Users/kerro/Projects/AIKit/src/lib/dashscope/client.ts`

- [ ] **Step 1: 创建 src/lib/dashscope/types.ts**

```typescript
export type DashScopeSubmitResp = {
  output: { task_id: string; task_status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' };
  request_id?: string;
};

export type DashScopePollImageResp = {
  output: {
    task_id: string;
    task_status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
    code?: string;
    message?: string;
    choices?: Array<{ message?: { content?: Array<{ image?: string }> } }>;
  };
  request_id?: string;
};

export type DashScopePollVideoResp = {
  output: {
    task_id: string;
    task_status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
    code?: string;
    message?: string;
    video_url?: string;
  };
  request_id?: string;
};
```

- [ ] **Step 2: 创建 src/lib/dashscope/client.ts**

```typescript
import axios, { AxiosInstance } from 'axios';
import { env } from '../env';

export const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com';
export const DASHSCOPE_API = `${DASHSCOPE_BASE}/api/v1`;
export const DASHSCOPE_COMPAT = `${DASHSCOPE_BASE}/compatible-mode/v1`;

export function createSubmitClient(): AxiosInstance {
  return axios.create({
    baseURL: DASHSCOPE_API,
    timeout: 30_000,
    headers: {
      Authorization: `Bearer ${env.DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
  });
}

export function createPollClient(): AxiosInstance {
  return axios.create({
    baseURL: DASHSCOPE_API,
    timeout: 30_000,
    headers: {
      Authorization: `Bearer ${env.DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/lib/dashscope/client.ts src/lib/dashscope/types.ts && git commit -m "feat(dashscope): axios client factories + response types"
```

---

## Task 9: Qwen SSE 流 chat.ts

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/lib/dashscope/chat.ts`
- Test: `/Users/kerro/Projects/AIKit/tests/dashscope/chat.test.ts`

- [ ] **Step 1: 写失败测试 tests/dashscope/chat.test.ts**

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';

process.env.DASHSCOPE_API_KEY = 'sk-test';

import { streamQwenChat } from '@/lib/dashscope/chat';
import { AIKitError } from '@/lib/errors';

function mockFetchSse(chunks: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return vi.fn().mockResolvedValue(new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }));
}

afterEach(() => { vi.restoreAllMocks(); });

describe('streamQwenChat', () => {
  it('yields deltas from SSE', async () => {
    globalThis.fetch = mockFetchSse([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n',
    ]) as unknown as typeof fetch;
    const out: string[] = [];
    for await (const d of streamQwenChat([{ role: 'user', content: 'hi' }])) out.push(d);
    expect(out.join('')).toBe('Hello world');
  });

  it('throws mapped AIKitError on 401 InvalidApiKey', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'InvalidApiKey', message: 'bad key' }), { status: 401 }),
    ) as unknown as typeof fetch;
    const gen = streamQwenChat([{ role: 'user', content: 'hi' }]);
    await expect(async () => { for await (const _ of gen) {} }).rejects.toMatchObject({
      name: 'AIKitError', code: 'INVALID_KEY',
    });
  });

  it('throws CONTENT_POLICY on DataInspectionFailed', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'DataInspectionFailed', message: 'blocked' }), { status: 400 }),
    ) as unknown as typeof fetch;
    const gen = streamQwenChat([{ role: 'user', content: 'hi' }]);
    await expect(async () => { for await (const _ of gen) {} }).rejects.toMatchObject({
      code: 'CONTENT_POLICY',
    });
  });

  it('ignores malformed data lines', async () => {
    globalThis.fetch = mockFetchSse([
      'data: not-json\n\n',
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
      'data: [DONE]\n\n',
    ]) as unknown as typeof fetch;
    const out: string[] = [];
    for await (const d of streamQwenChat([{ role: 'user', content: 'x' }])) out.push(d);
    expect(out.join('')).toBe('ok');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd /Users/kerro/Projects/AIKit && npx vitest run tests/dashscope/chat.test.ts`
Expected: FAIL — "Cannot find module '@/lib/dashscope/chat'"

- [ ] **Step 3: 实现 src/lib/dashscope/chat.ts**

```typescript
import { env } from '../env';
import { AIKitError, mapDashScopeError } from '../errors';
import { DASHSCOPE_COMPAT } from './client';

export type ChatRole = 'system' | 'user' | 'assistant';
export type ChatMessage = { role: ChatRole; content: string };

const MODEL = 'qwen-turbo';

export async function* streamQwenChat(messages: ChatMessage[]): AsyncGenerator<string> {
  let resp: Response;
  try {
    resp = await fetch(`${DASHSCOPE_COMPAT}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ model: MODEL, messages, stream: true }),
    });
  } catch (err) {
    throw new AIKitError('NETWORK_ERROR', (err as Error).message ?? 'fetch failed', err);
  }

  if (!resp.ok || !resp.body) {
    const payload = await resp.json().catch(() => ({}));
    throw mapDashScopeError(payload);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    for (const raw of parts) {
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') {
        if (payload === '[DONE]') return;
        continue;
      }
      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // 忽略解析失败的行（DashScope 会插入非 JSON 心跳）
      }
    }
  }
}
```

- [ ] **Step 4: 运行测试通过**

Run: `cd /Users/kerro/Projects/AIKit && npx vitest run tests/dashscope/chat.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/lib/dashscope/chat.ts tests/dashscope/chat.test.ts && git commit -m "feat(dashscope): Qwen-Turbo SSE stream with error mapping"
```

---

## Task 10: Wanx Image submit/poll

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/lib/dashscope/image.ts`
- Create: `/Users/kerro/Projects/AIKit/tests/fixtures/providers/wanx-image/submit_success.json`
- Create: `/Users/kerro/Projects/AIKit/tests/fixtures/providers/wanx-image/poll_success.json`
- Create: `/Users/kerro/Projects/AIKit/tests/fixtures/providers/wanx-image/poll_failed_content_policy.json`
- Test: `/Users/kerro/Projects/AIKit/tests/dashscope/image.test.ts`

- [ ] **Step 1: 复制 fixture**

Run:
```bash
mkdir -p /Users/kerro/Projects/AIKit/tests/fixtures/providers/wanx-image && \
cp /Users/kerro/Projects/InkFrame/test/fixtures/providers/wanx-image/submit_success.json /Users/kerro/Projects/AIKit/tests/fixtures/providers/wanx-image/ && \
cp /Users/kerro/Projects/InkFrame/test/fixtures/providers/wanx-image/poll_success.json /Users/kerro/Projects/AIKit/tests/fixtures/providers/wanx-image/ && \
cp /Users/kerro/Projects/InkFrame/test/fixtures/providers/wanx-image/poll_failed_content_policy.json /Users/kerro/Projects/AIKit/tests/fixtures/providers/wanx-image/
```
Expected: 3 files copied.

- [ ] **Step 2: 写失败测试 tests/dashscope/image.test.ts**

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

process.env.DASHSCOPE_API_KEY = 'sk-test';

import { submitImage, pollImage, type ImageParams } from '@/lib/dashscope/image';

const FIX = path.resolve('tests/fixtures/providers/wanx-image');
const loadFixture = (f: string) => JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8'));

afterEach(() => { vi.restoreAllMocks(); });

describe('submitImage', () => {
  it('returns dashscope task_id on success', async () => {
    const post = vi.fn().mockResolvedValue({ data: loadFixture('submit_success.json') });
    vi.doMock('axios', () => ({
      default: { create: () => ({ post, get: vi.fn() }) },
    }));
    const { submitImage: reloaded } = await import('@/lib/dashscope/image');
    const params: ImageParams = { prompt: 'cat', aspectRatio: '16:9', batchSize: 2 };
    const out = await reloaded(params);
    expect(out.dashscopeId).toBe('wanx-task-FIXTURE_JOB_ID');
    expect(post).toHaveBeenCalledTimes(1);
    const body = post.mock.calls[0][1];
    expect(body.model).toBe('wan2.7-image-pro');
    expect(body.parameters.size).toBe('1280*720');
    expect(body.parameters.n).toBe(2);
  });

  it('throws CONTENT_POLICY when DataInspectionFailed', async () => {
    const post = vi.fn().mockRejectedValue({
      response: { data: { code: 'DataInspectionFailed', message: 'blocked' } },
    });
    vi.doMock('axios', () => ({
      default: { create: () => ({ post, get: vi.fn() }) },
    }));
    const { submitImage: reloaded } = await import('@/lib/dashscope/image');
    await expect(reloaded({ prompt: 'x', aspectRatio: '1:1', batchSize: 1 }))
      .rejects.toMatchObject({ code: 'CONTENT_POLICY' });
  });
});

describe('pollImage', () => {
  it('returns urls on success', async () => {
    const get = vi.fn().mockResolvedValue({ data: loadFixture('poll_success.json') });
    vi.doMock('axios', () => ({
      default: { create: () => ({ post: vi.fn(), get }) },
    }));
    const { pollImage: reloaded } = await import('@/lib/dashscope/image');
    const out = await reloaded('wanx-task-FIXTURE_JOB_ID');
    expect(out.status).toBe('success');
    if (out.status === 'success') {
      expect(out.urls).toEqual([
        'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/FIXTURE_IMAGE_1.png',
        'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/FIXTURE_IMAGE_2.png',
      ]);
    }
  });

  it('returns failed + code on DataInspectionFailed', async () => {
    const get = vi.fn().mockResolvedValue({ data: loadFixture('poll_failed_content_policy.json') });
    vi.doMock('axios', () => ({
      default: { create: () => ({ post: vi.fn(), get }) },
    }));
    const { pollImage: reloaded } = await import('@/lib/dashscope/image');
    const out = await reloaded('wanx-task-FIXTURE_JOB_ID');
    expect(out.status).toBe('failed');
    if (out.status === 'failed') {
      expect(out.code).toBe('DataInspectionFailed');
      expect(out.message).toMatch(/inappropriate/i);
    }
  });
});
```

- [ ] **Step 3: 运行测试验证失败**

Run: `cd /Users/kerro/Projects/AIKit && npx vitest run tests/dashscope/image.test.ts`
Expected: FAIL — "Cannot find module '@/lib/dashscope/image'"

- [ ] **Step 4: 实现 src/lib/dashscope/image.ts**

```typescript
import { mapDashScopeError } from '../errors';
import { createSubmitClient, createPollClient } from './client';
import type { DashScopePollImageResp, DashScopeSubmitResp } from './types';

const MODEL = 'wan2.7-image-pro';
const SUBMIT_PATH = '/services/aigc/image-generation/generation';

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type BatchSize = 1 | 2 | 3 | 4;

export type ImageParams = {
  prompt: string;
  aspectRatio: AspectRatio;
  batchSize: BatchSize;
};

const SIZE_BY_RATIO: Record<AspectRatio, string> = {
  '1:1': '1024*1024',
  '16:9': '1280*720',
  '9:16': '720*1280',
  '4:3': '1024*768',
  '3:4': '768*1024',
};

export async function submitImage(p: ImageParams): Promise<{ dashscopeId: string }> {
  const client = createSubmitClient();
  const body = {
    model: MODEL,
    input: { messages: [{ role: 'user', content: [{ text: p.prompt }] }] },
    parameters: { size: SIZE_BY_RATIO[p.aspectRatio], n: p.batchSize },
  };
  try {
    const resp = await client.post<DashScopeSubmitResp>(SUBMIT_PATH, body);
    return { dashscopeId: resp.data.output.task_id };
  } catch (err) {
    const raw = (err as { response?: { data?: unknown } }).response?.data ?? err;
    throw mapDashScopeError(raw);
  }
}

export type PollImageResult =
  | { status: 'pending' }
  | { status: 'success'; urls: string[] }
  | { status: 'failed'; code: string; message: string };

export async function pollImage(dashscopeId: string): Promise<PollImageResult> {
  const client = createPollClient();
  try {
    const resp = await client.get<DashScopePollImageResp>(`/tasks/${dashscopeId}`);
    const o = resp.data.output;
    if (o.task_status === 'PENDING' || o.task_status === 'RUNNING') {
      return { status: 'pending' };
    }
    if (o.task_status === 'SUCCEEDED') {
      const urls: string[] = [];
      for (const choice of o.choices ?? []) {
        for (const part of choice.message?.content ?? []) {
          if (part.image) urls.push(part.image);
        }
      }
      return { status: 'success', urls };
    }
    return { status: 'failed', code: o.code ?? 'UNKNOWN', message: o.message ?? 'failed' };
  } catch (err) {
    const raw = (err as { response?: { data?: unknown } }).response?.data ?? err;
    throw mapDashScopeError(raw);
  }
}
```

- [ ] **Step 5: 运行测试通过**

Run: `cd /Users/kerro/Projects/AIKit && npx vitest run tests/dashscope/image.test.ts`
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/lib/dashscope/image.ts tests/dashscope/image.test.ts tests/fixtures/providers/wanx-image/ && git commit -m "feat(dashscope): Wanx Image submit/poll + fixtures"
```

---

## Task 11: Video 路由 + submit/poll 三 Provider

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/lib/dashscope/video.ts`
- Create: `/Users/kerro/Projects/AIKit/tests/fixtures/providers/wanx-t2v/*.json`
- Create: `/Users/kerro/Projects/AIKit/tests/fixtures/providers/kling-v3/*.json`
- Create: `/Users/kerro/Projects/AIKit/tests/fixtures/providers/kling-v3-omni/*.json`
- Test: `/Users/kerro/Projects/AIKit/tests/dashscope/video.test.ts`

- [ ] **Step 1: 复制 fixture**

Run:
```bash
mkdir -p /Users/kerro/Projects/AIKit/tests/fixtures/providers/{wanx-t2v,kling-v3,kling-v3-omni} && \
cp /Users/kerro/Projects/InkFrame/test/fixtures/providers/wanx-t2v/*.json /Users/kerro/Projects/AIKit/tests/fixtures/providers/wanx-t2v/ && \
cp /Users/kerro/Projects/InkFrame/test/fixtures/providers/kling-v3/*.json /Users/kerro/Projects/AIKit/tests/fixtures/providers/kling-v3/ && \
cp /Users/kerro/Projects/InkFrame/test/fixtures/providers/kling-v3-omni/*.json /Users/kerro/Projects/AIKit/tests/fixtures/providers/kling-v3-omni/
```
Expected: 6 files copied total（每目录 2 个）。

- [ ] **Step 2: 写失败测试 tests/dashscope/video.test.ts**

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

process.env.DASHSCOPE_API_KEY = 'sk-test';

import { routeVideoProvider, type VideoParams } from '@/lib/dashscope/video';

const fix = (p: string) => JSON.parse(fs.readFileSync(path.resolve('tests/fixtures/providers', p), 'utf8'));

afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

describe('routeVideoProvider', () => {
  const base: VideoParams = { prompt: 'x', duration: 5, resolution: '720p', aspectRatio: '16:9' };
  it('routes t2v when no first frame, no ref images', () => {
    expect(routeVideoProvider(base)).toBe('wanx-t2v');
  });
  it('routes kling-v3 when firstFrame present', () => {
    expect(routeVideoProvider({ ...base, firstFrame: 'https://x/a.png' })).toBe('kling-v3');
  });
  it('routes kling-v3-omni when refImages present', () => {
    expect(routeVideoProvider({ ...base, refImages: ['https://x/a.png'] })).toBe('kling-v3-omni');
  });
  it('refImages wins over firstFrame', () => {
    expect(routeVideoProvider({ ...base, firstFrame: 'x', refImages: ['y'] })).toBe('kling-v3-omni');
  });
});

describe('submitVideo', () => {
  it('t2v: posts wan2.7-t2v with size+duration', async () => {
    const post = vi.fn().mockResolvedValue({ data: fix('wanx-t2v/submit_success.json') });
    vi.doMock('axios', () => ({ default: { create: () => ({ post, get: vi.fn() }) } }));
    const { submitVideo } = await import('@/lib/dashscope/video');
    const out = await submitVideo({ prompt: 'x', duration: 5, resolution: '720p', aspectRatio: '16:9' });
    expect(out.provider).toBe('wanx-t2v');
    expect(out.dashscopeId).toBe('wanx-t2v-FIXTURE_JOB_ID');
    const body = post.mock.calls[0][1];
    expect(body.model).toBe('wan2.7-t2v');
    expect(body.input.prompt).toBe('x');
    expect(body.parameters.size).toBe('1280*720');
    expect(body.parameters.duration).toBe(5);
  });

  it('kling-v3: sends img_url on first frame', async () => {
    const post = vi.fn().mockResolvedValue({ data: fix('kling-v3/submit_success.json') });
    vi.doMock('axios', () => ({ default: { create: () => ({ post, get: vi.fn() }) } }));
    const { submitVideo } = await import('@/lib/dashscope/video');
    const out = await submitVideo({
      prompt: 'x', duration: 5, resolution: '1080p', aspectRatio: '9:16',
      firstFrame: 'https://x/a.png',
    });
    expect(out.provider).toBe('kling-v3');
    expect(out.dashscopeId).toBe('kling-v3-FIXTURE_JOB_ID');
    const body = post.mock.calls[0][1];
    expect(body.model).toBe('kling/kling-v3-video-generation');
    expect(body.input.img_url).toBe('https://x/a.png');
    expect(body.parameters.size).toBe('1080*1920');
  });

  it('kling-v3-omni: sends ref_images on refImages', async () => {
    const post = vi.fn().mockResolvedValue({ data: fix('kling-v3-omni/submit_success.json') });
    vi.doMock('axios', () => ({ default: { create: () => ({ post, get: vi.fn() }) } }));
    const { submitVideo } = await import('@/lib/dashscope/video');
    const out = await submitVideo({
      prompt: 'x', duration: 10, resolution: '720p', aspectRatio: '1:1',
      refImages: ['https://x/a.png', 'https://x/b.png'],
    });
    expect(out.provider).toBe('kling-v3-omni');
    const body = post.mock.calls[0][1];
    expect(body.model).toBe('kling/kling-v3-omni-video-generation');
    expect(body.input.ref_images).toEqual(['https://x/a.png', 'https://x/b.png']);
    expect(body.parameters.size).toBe('720*720');
    expect(body.parameters.duration).toBe(10);
  });
});

describe('pollVideo', () => {
  it('returns success+url', async () => {
    const get = vi.fn().mockResolvedValue({ data: fix('wanx-t2v/poll_success.json') });
    vi.doMock('axios', () => ({ default: { create: () => ({ post: vi.fn(), get }) } }));
    const { pollVideo } = await import('@/lib/dashscope/video');
    const out = await pollVideo('wanx-t2v-FIXTURE_JOB_ID');
    expect(out.status).toBe('success');
    if (out.status === 'success') {
      expect(out.url).toMatch(/FIXTURE_VIDEO\.mp4$/);
    }
  });

  it('returns pending when PENDING', async () => {
    const get = vi.fn().mockResolvedValue({ data: { output: { task_id: 'x', task_status: 'PENDING' } } });
    vi.doMock('axios', () => ({ default: { create: () => ({ post: vi.fn(), get }) } }));
    const { pollVideo } = await import('@/lib/dashscope/video');
    const out = await pollVideo('x');
    expect(out.status).toBe('pending');
  });

  it('returns failed+code on FAILED', async () => {
    const get = vi.fn().mockResolvedValue({
      data: { output: { task_id: 'x', task_status: 'FAILED', code: 'DataInspectionFailed', message: 'blocked' } },
    });
    vi.doMock('axios', () => ({ default: { create: () => ({ post: vi.fn(), get }) } }));
    const { pollVideo } = await import('@/lib/dashscope/video');
    const out = await pollVideo('x');
    expect(out.status).toBe('failed');
    if (out.status === 'failed') {
      expect(out.code).toBe('DataInspectionFailed');
    }
  });
});
```

- [ ] **Step 3: 运行测试验证失败**

Run: `cd /Users/kerro/Projects/AIKit && npx vitest run tests/dashscope/video.test.ts`
Expected: FAIL — "Cannot find module '@/lib/dashscope/video'"

- [ ] **Step 4: 实现 src/lib/dashscope/video.ts**

```typescript
import { mapDashScopeError } from '../errors';
import { createSubmitClient, createPollClient } from './client';
import type { DashScopePollVideoResp, DashScopeSubmitResp } from './types';

const SUBMIT_PATH = '/services/aigc/video-generation/video-synthesis';

export type VideoProvider = 'wanx-t2v' | 'kling-v3' | 'kling-v3-omni';

export type VideoDuration = 5 | 10;
export type VideoResolution = '720p' | '1080p';
export type VideoAspectRatio = '16:9' | '9:16' | '1:1';

export type VideoParams = {
  prompt: string;
  duration: VideoDuration;
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  firstFrame?: string;
  refImages?: string[];
};

const MODEL_BY_PROVIDER: Record<VideoProvider, string> = {
  'wanx-t2v': 'wan2.7-t2v',
  'kling-v3': 'kling/kling-v3-video-generation',
  'kling-v3-omni': 'kling/kling-v3-omni-video-generation',
};

const SIZE_MATRIX: Record<VideoResolution, Record<VideoAspectRatio, string>> = {
  '720p': { '16:9': '1280*720', '9:16': '720*1280', '1:1': '720*720' },
  '1080p': { '16:9': '1920*1080', '9:16': '1080*1920', '1:1': '1080*1080' },
};

const KLING_OMNI_MAX_REF = 4;

export function routeVideoProvider(p: VideoParams): VideoProvider {
  if (p.refImages && p.refImages.length > 0) return 'kling-v3-omni';
  if (p.firstFrame) return 'kling-v3';
  return 'wanx-t2v';
}

export async function submitVideo(p: VideoParams): Promise<{ dashscopeId: string; provider: VideoProvider }> {
  const provider = routeVideoProvider(p);
  const size = SIZE_MATRIX[p.resolution][p.aspectRatio];

  const input: Record<string, unknown> = { prompt: p.prompt };
  if (provider === 'kling-v3' && p.firstFrame) input.img_url = p.firstFrame;
  if (provider === 'kling-v3-omni' && p.refImages) {
    input.ref_images = p.refImages.slice(0, KLING_OMNI_MAX_REF);
  }

  const body = {
    model: MODEL_BY_PROVIDER[provider],
    input,
    parameters: { size, duration: p.duration },
  };

  const client = createSubmitClient();
  try {
    const resp = await client.post<DashScopeSubmitResp>(SUBMIT_PATH, body);
    return { dashscopeId: resp.data.output.task_id, provider };
  } catch (err) {
    const raw = (err as { response?: { data?: unknown } }).response?.data ?? err;
    throw mapDashScopeError(raw);
  }
}

export type PollVideoResult =
  | { status: 'pending' }
  | { status: 'success'; url: string }
  | { status: 'failed'; code: string; message: string };

export async function pollVideo(dashscopeId: string): Promise<PollVideoResult> {
  const client = createPollClient();
  try {
    const resp = await client.get<DashScopePollVideoResp>(`/tasks/${dashscopeId}`);
    const o = resp.data.output;
    if (o.task_status === 'PENDING' || o.task_status === 'RUNNING') {
      return { status: 'pending' };
    }
    if (o.task_status === 'SUCCEEDED') {
      return { status: 'success', url: o.video_url ?? '' };
    }
    return { status: 'failed', code: o.code ?? 'UNKNOWN', message: o.message ?? 'failed' };
  } catch (err) {
    const raw = (err as { response?: { data?: unknown } }).response?.data ?? err;
    throw mapDashScopeError(raw);
  }
}
```

- [ ] **Step 5: 运行测试通过**

Run: `cd /Users/kerro/Projects/AIKit && npx vitest run tests/dashscope/video.test.ts`
Expected: 10 passed.

- [ ] **Step 6: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/lib/dashscope/video.ts tests/dashscope/video.test.ts tests/fixtures/providers/wanx-t2v/ tests/fixtures/providers/kling-v3/ tests/fixtures/providers/kling-v3-omni/ && git commit -m "feat(dashscope): video smart-route + wanx-t2v/kling-v3/kling-v3-omni"
```

---

## Task 12: /api/chat Route Handler

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/app/api/chat/route.ts`
- Test: `/Users/kerro/Projects/AIKit/tests/api/chat.test.ts`

- [ ] **Step 1: 写失败测试 tests/api/chat.test.ts**

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';

process.env.DASHSCOPE_API_KEY = 'sk-test';

afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

async function readSse(resp: Response): Promise<string[]> {
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const deltas: string[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const l of lines) {
      if (l.startsWith('data:')) {
        const payload = l.slice(5).trim();
        if (!payload) continue;
        const parsed = JSON.parse(payload);
        if (parsed.delta) deltas.push(parsed.delta);
      }
    }
  }
  return deltas;
}

describe('POST /api/chat', () => {
  it('proxies SSE stream from streamQwenChat', async () => {
    vi.doMock('@/lib/dashscope/chat', () => ({
      streamQwenChat: async function* () { yield 'Hi'; yield ' there'; },
    }));
    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://x/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    });
    const resp = await POST(req);
    expect(resp.headers.get('content-type')).toMatch(/text\/event-stream/);
    const deltas = await readSse(resp);
    expect(deltas.join('')).toBe('Hi there');
  });

  it('returns JSON error with mapped code on AIKitError', async () => {
    vi.doMock('@/lib/dashscope/chat', () => ({
      streamQwenChat: async function* () {
        const { AIKitError } = await import('@/lib/errors');
        throw new AIKitError('CONTENT_POLICY', 'blocked');
      },
    }));
    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://x/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'x' }] }),
    });
    const resp = await POST(req);
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.error.code).toBe('CONTENT_POLICY');
  });

  it('400 on invalid body', async () => {
    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://x/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notMessages: 'x' }),
    });
    const resp = await POST(req);
    expect(resp.status).toBe(400);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd /Users/kerro/Projects/AIKit && npx vitest run tests/api/chat.test.ts`
Expected: FAIL — "Cannot find module '@/app/api/chat/route'"

- [ ] **Step 3: 实现 src/app/api/chat/route.ts**

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { streamQwenChat } from '@/lib/dashscope/chat';
import { AIKitError, httpStatusForCode } from '@/lib/errors';

export const runtime = 'nodejs';

const bodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string().min(1),
  })).min(1),
});

export async function POST(req: NextRequest | Request) {
  let parsed;
  try {
    parsed = bodySchema.safeParse(await req.json());
  } catch {
    return Response.json({ error: { code: 'UNKNOWN', message: 'invalid json' } }, { status: 400 });
  }
  if (!parsed.success) {
    return Response.json({ error: { code: 'UNKNOWN', message: 'invalid body' } }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const delta of streamQwenChat(parsed.data.messages)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (err) {
        if (err instanceof AIKitError) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.toJSON() })}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: { code: 'UNKNOWN', message: 'internal' } })}\n\n`));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
```

注：测试里第二个用例（AIKitError 立即 400）的期望需要调整——实际我们在 stream 里发 error event 而非改 HTTP 状态。修正测试为以下版本（替换原第二个用例）：

```typescript
  it('emits error event with mapped code inside the stream', async () => {
    vi.doMock('@/lib/dashscope/chat', () => ({
      streamQwenChat: async function* () {
        const { AIKitError } = await import('@/lib/errors');
        throw new AIKitError('CONTENT_POLICY', 'blocked');
      },
    }));
    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://x/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'x' }] }),
    });
    const resp = await POST(req);
    expect(resp.status).toBe(200);
    const text = await resp.text();
    expect(text).toMatch(/CONTENT_POLICY/);
  });
```

把原测试文件第二个 `it` 替换为这段。

- [ ] **Step 4: 更新测试（替换第二个用例）**

Edit `tests/api/chat.test.ts`：把 `returns JSON error with mapped code on AIKitError` 整段替换成上面的 `emits error event with mapped code inside the stream`。

- [ ] **Step 5: 运行测试通过**

Run: `cd /Users/kerro/Projects/AIKit && npx vitest run tests/api/chat.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/app/api/chat/route.ts tests/api/chat.test.ts && git commit -m "feat(api): POST /api/chat SSE proxy for Qwen stream"
```

---

## Task 13: /api/image/* Route Handlers

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/app/api/image/submit/route.ts`
- Create: `/Users/kerro/Projects/AIKit/src/app/api/image/[taskId]/route.ts`
- Test: `/Users/kerro/Projects/AIKit/tests/api/image.test.ts`

- [ ] **Step 1: 写失败测试 tests/api/image.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const TEST_DB = path.resolve(process.cwd(), 'data/test-api-image.db');
process.env.DATABASE_PATH = TEST_DB;
process.env.DASHSCOPE_API_KEY = 'sk-test';

beforeEach(async () => {
  vi.resetModules();
  const { closeDb } = await import('@/lib/db/client');
  closeDb();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});
afterEach(async () => {
  vi.restoreAllMocks();
  const { closeDb } = await import('@/lib/db/client');
  closeDb();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe('POST /api/image/submit', () => {
  it('submits then persists task + returns taskId', async () => {
    vi.doMock('@/lib/dashscope/image', () => ({
      submitImage: vi.fn().mockResolvedValue({ dashscopeId: 'ds-123' }),
      pollImage: vi.fn(),
    }));
    const { POST } = await import('@/app/api/image/submit/route');
    const req = new Request('http://x/api/image/submit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'a cat', aspectRatio: '16:9', batchSize: 2 }),
    });
    const resp = await POST(req);
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.taskId).toBeTruthy();

    const { getTask } = await import('@/lib/db/tasks');
    const row = getTask(body.taskId)!;
    expect(row.dashscope_id).toBe('ds-123');
    expect(row.status).toBe('pending');
    expect(row.provider).toBe('wanx-image');
  });

  it('returns 400 on invalid body', async () => {
    const { POST } = await import('@/app/api/image/submit/route');
    const req = new Request('http://x/api/image/submit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: '' }),
    });
    const resp = await POST(req);
    expect(resp.status).toBe(400);
  });

  it('maps CONTENT_POLICY to 400 when submit throws', async () => {
    vi.doMock('@/lib/dashscope/image', () => ({
      submitImage: vi.fn().mockImplementation(async () => {
        const { AIKitError } = await import('@/lib/errors');
        throw new AIKitError('CONTENT_POLICY', 'blocked');
      }),
      pollImage: vi.fn(),
    }));
    const { POST } = await import('@/app/api/image/submit/route');
    const req = new Request('http://x/api/image/submit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'x', aspectRatio: '1:1', batchSize: 1 }),
    });
    const resp = await POST(req);
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.error.code).toBe('CONTENT_POLICY');
  });
});

describe('GET /api/image/:taskId', () => {
  it('returns pending when still polling', async () => {
    vi.doMock('@/lib/dashscope/image', () => ({
      submitImage: vi.fn().mockResolvedValue({ dashscopeId: 'ds-1' }),
      pollImage: vi.fn().mockResolvedValue({ status: 'pending' }),
    }));
    const submitMod = await import('@/app/api/image/submit/route');
    const submitResp = await submitMod.POST(new Request('http://x/api/image/submit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'x', aspectRatio: '1:1', batchSize: 1 }),
    }));
    const { taskId } = await submitResp.json();

    const { GET } = await import('@/app/api/image/[taskId]/route');
    const resp = await GET(new Request(`http://x/api/image/${taskId}`), { params: Promise.resolve({ taskId }) });
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.status).toBe('pending');
  });

  it('writes urls on poll success and returns them', async () => {
    vi.doMock('@/lib/dashscope/image', () => ({
      submitImage: vi.fn().mockResolvedValue({ dashscopeId: 'ds-1' }),
      pollImage: vi.fn().mockResolvedValue({ status: 'success', urls: ['https://x/a.png'] }),
    }));
    const submitMod = await import('@/app/api/image/submit/route');
    const { taskId } = await (await submitMod.POST(new Request('http://x/api/image/submit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'x', aspectRatio: '1:1', batchSize: 1 }),
    }))).json();

    const { GET } = await import('@/app/api/image/[taskId]/route');
    const resp = await GET(new Request(`http://x/api/image/${taskId}`), { params: Promise.resolve({ taskId }) });
    const body = await resp.json();
    expect(body.status).toBe('success');
    expect(body.urls).toEqual(['https://x/a.png']);
  });

  it('returns 404 when task not found', async () => {
    const { GET } = await import('@/app/api/image/[taskId]/route');
    const resp = await GET(new Request('http://x/api/image/xxx'), { params: Promise.resolve({ taskId: 'xxx' }) });
    expect(resp.status).toBe(404);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd /Users/kerro/Projects/AIKit && npx vitest run tests/api/image.test.ts`
Expected: FAIL — "Cannot find module '@/app/api/image/submit/route'"

- [ ] **Step 3: 实现 src/app/api/image/submit/route.ts**

```typescript
import { z } from 'zod';
import { submitImage } from '@/lib/dashscope/image';
import { createTask, setDashScopeId } from '@/lib/db/tasks';
import { AIKitError, httpStatusForCode } from '@/lib/errors';

export const runtime = 'nodejs';

const bodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']),
  batchSize: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = bodySchema.safeParse(await req.json());
  } catch {
    return Response.json({ error: { code: 'UNKNOWN', message: 'invalid json' } }, { status: 400 });
  }
  if (!parsed.success) {
    return Response.json({ error: { code: 'UNKNOWN', message: 'invalid body' } }, { status: 400 });
  }
  const p = parsed.data;
  const task = createTask({ type: 'image', provider: 'wanx-image', prompt: p.prompt, params: p });
  try {
    const { dashscopeId } = await submitImage(p);
    setDashScopeId(task.task_id, dashscopeId);
    return Response.json({ taskId: task.task_id });
  } catch (err) {
    if (err instanceof AIKitError) {
      const { markFailed } = await import('@/lib/db/tasks');
      markFailed(task.task_id, err.code, err.message);
      return Response.json({ error: err.toJSON() }, { status: httpStatusForCode(err.code) });
    }
    return Response.json({ error: { code: 'UNKNOWN', message: 'internal' } }, { status: 500 });
  }
}
```

- [ ] **Step 4: 实现 src/app/api/image/[taskId]/route.ts**

```typescript
import { pollImage } from '@/lib/dashscope/image';
import { getTask, markSuccess, markFailed } from '@/lib/db/tasks';
import { AIKitError, httpStatusForCode } from '@/lib/errors';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await ctx.params;
  const row = getTask(taskId);
  if (!row || row.type !== 'image' || row.expires_at < Date.now()) {
    return Response.json({ error: { code: 'UNKNOWN', message: 'not found' } }, { status: 404 });
  }
  if (row.status === 'success') {
    return Response.json({
      status: 'success',
      urls: JSON.parse(row.result_urls ?? '[]'),
      expiresAt: row.expires_at,
    });
  }
  if (row.status === 'failed') {
    return Response.json({
      status: 'failed',
      error: { code: row.error_code ?? 'UNKNOWN', message: row.error_message ?? 'failed' },
      expiresAt: row.expires_at,
    });
  }
  if (!row.dashscope_id) {
    return Response.json({ status: 'pending', expiresAt: row.expires_at });
  }
  try {
    const result = await pollImage(row.dashscope_id);
    if (result.status === 'success') {
      markSuccess(taskId, result.urls);
      return Response.json({ status: 'success', urls: result.urls, expiresAt: row.expires_at });
    }
    if (result.status === 'failed') {
      markFailed(taskId, result.code, result.message);
      return Response.json({
        status: 'failed',
        error: { code: result.code, message: result.message },
        expiresAt: row.expires_at,
      });
    }
    return Response.json({ status: 'pending', expiresAt: row.expires_at });
  } catch (err) {
    if (err instanceof AIKitError) {
      return Response.json({ error: err.toJSON() }, { status: httpStatusForCode(err.code) });
    }
    return Response.json({ error: { code: 'UNKNOWN', message: 'internal' } }, { status: 500 });
  }
}
```

- [ ] **Step 5: 运行测试通过**

Run: `cd /Users/kerro/Projects/AIKit && npx vitest run tests/api/image.test.ts`
Expected: 6 passed.

- [ ] **Step 6: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/app/api/image/ tests/api/image.test.ts && git commit -m "feat(api): image submit + poll with DB persistence"
```

---

## Task 14: /api/video/* Route Handlers

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/app/api/video/submit/route.ts`
- Create: `/Users/kerro/Projects/AIKit/src/app/api/video/[taskId]/route.ts`
- Test: `/Users/kerro/Projects/AIKit/tests/api/video.test.ts`

- [ ] **Step 1: 写失败测试 tests/api/video.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const TEST_DB = path.resolve(process.cwd(), 'data/test-api-video.db');
process.env.DATABASE_PATH = TEST_DB;
process.env.DASHSCOPE_API_KEY = 'sk-test';

beforeEach(async () => {
  vi.resetModules();
  const { closeDb } = await import('@/lib/db/client');
  closeDb();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});
afterEach(async () => {
  vi.restoreAllMocks();
  const { closeDb } = await import('@/lib/db/client');
  closeDb();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe('POST /api/video/submit', () => {
  it('persists task with provider from router', async () => {
    vi.doMock('@/lib/dashscope/video', () => ({
      submitVideo: vi.fn().mockResolvedValue({ dashscopeId: 'ds-v1', provider: 'kling-v3' }),
      pollVideo: vi.fn(),
      routeVideoProvider: vi.fn().mockReturnValue('kling-v3'),
    }));
    const { POST } = await import('@/app/api/video/submit/route');
    const req = new Request('http://x/api/video/submit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        prompt: 'a cat', duration: 5, resolution: '720p', aspectRatio: '16:9',
        firstFrame: 'https://x/a.png',
      }),
    });
    const resp = await POST(req);
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.taskId).toBeTruthy();
    expect(body.provider).toBe('kling-v3');

    const { getTask } = await import('@/lib/db/tasks');
    const row = getTask(body.taskId)!;
    expect(row.provider).toBe('kling-v3');
    expect(row.dashscope_id).toBe('ds-v1');
  });

  it('returns 400 on invalid body', async () => {
    const { POST } = await import('@/app/api/video/submit/route');
    const req = new Request('http://x/api/video/submit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: '' }),
    });
    const resp = await POST(req);
    expect(resp.status).toBe(400);
  });
});

describe('GET /api/video/:taskId', () => {
  it('returns success+videoUrl on poll success', async () => {
    vi.doMock('@/lib/dashscope/video', () => ({
      submitVideo: vi.fn().mockResolvedValue({ dashscopeId: 'ds-v1', provider: 'wanx-t2v' }),
      pollVideo: vi.fn().mockResolvedValue({ status: 'success', url: 'https://x/v.mp4' }),
      routeVideoProvider: vi.fn().mockReturnValue('wanx-t2v'),
    }));
    const submitMod = await import('@/app/api/video/submit/route');
    const { taskId } = await (await submitMod.POST(new Request('http://x/api/video/submit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'x', duration: 5, resolution: '720p', aspectRatio: '16:9' }),
    }))).json();

    const { GET } = await import('@/app/api/video/[taskId]/route');
    const resp = await GET(new Request(`http://x/api/video/${taskId}`), { params: Promise.resolve({ taskId }) });
    const body = await resp.json();
    expect(body.status).toBe('success');
    expect(body.videoUrl).toBe('https://x/v.mp4');
    expect(body.provider).toBe('wanx-t2v');
  });

  it('returns 404 when task not found', async () => {
    const { GET } = await import('@/app/api/video/[taskId]/route');
    const resp = await GET(new Request('http://x/api/video/xxx'), { params: Promise.resolve({ taskId: 'xxx' }) });
    expect(resp.status).toBe(404);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd /Users/kerro/Projects/AIKit && npx vitest run tests/api/video.test.ts`
Expected: FAIL — module not found。

- [ ] **Step 3: 实现 src/app/api/video/submit/route.ts**

```typescript
import { z } from 'zod';
import { submitVideo, routeVideoProvider } from '@/lib/dashscope/video';
import { createTask, setDashScopeId, markFailed } from '@/lib/db/tasks';
import { AIKitError, httpStatusForCode } from '@/lib/errors';

export const runtime = 'nodejs';

const bodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  duration: z.union([z.literal(5), z.literal(10)]),
  resolution: z.enum(['720p', '1080p']),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']),
  firstFrame: z.string().optional(),
  refImages: z.array(z.string()).max(4).optional(),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = bodySchema.safeParse(await req.json());
  } catch {
    return Response.json({ error: { code: 'UNKNOWN', message: 'invalid json' } }, { status: 400 });
  }
  if (!parsed.success) {
    return Response.json({ error: { code: 'UNKNOWN', message: 'invalid body' } }, { status: 400 });
  }
  const p = parsed.data;
  const provider = routeVideoProvider(p);
  const task = createTask({ type: 'video', provider, prompt: p.prompt, params: p });
  try {
    const { dashscopeId } = await submitVideo(p);
    setDashScopeId(task.task_id, dashscopeId);
    return Response.json({ taskId: task.task_id, provider });
  } catch (err) {
    if (err instanceof AIKitError) {
      markFailed(task.task_id, err.code, err.message);
      return Response.json({ error: err.toJSON() }, { status: httpStatusForCode(err.code) });
    }
    return Response.json({ error: { code: 'UNKNOWN', message: 'internal' } }, { status: 500 });
  }
}
```

- [ ] **Step 4: 实现 src/app/api/video/[taskId]/route.ts**

```typescript
import { pollVideo } from '@/lib/dashscope/video';
import { getTask, markSuccess, markFailed } from '@/lib/db/tasks';
import { AIKitError, httpStatusForCode } from '@/lib/errors';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await ctx.params;
  const row = getTask(taskId);
  if (!row || row.type !== 'video' || row.expires_at < Date.now()) {
    return Response.json({ error: { code: 'UNKNOWN', message: 'not found' } }, { status: 404 });
  }
  if (row.status === 'success') {
    const urls = JSON.parse(row.result_urls ?? '[]') as string[];
    return Response.json({
      status: 'success',
      videoUrl: urls[0] ?? '',
      provider: row.provider,
      expiresAt: row.expires_at,
    });
  }
  if (row.status === 'failed') {
    return Response.json({
      status: 'failed',
      error: { code: row.error_code ?? 'UNKNOWN', message: row.error_message ?? 'failed' },
      provider: row.provider,
      expiresAt: row.expires_at,
    });
  }
  if (!row.dashscope_id) {
    return Response.json({ status: 'pending', provider: row.provider, expiresAt: row.expires_at });
  }
  try {
    const result = await pollVideo(row.dashscope_id);
    if (result.status === 'success') {
      markSuccess(taskId, [result.url]);
      return Response.json({
        status: 'success',
        videoUrl: result.url,
        provider: row.provider,
        expiresAt: row.expires_at,
      });
    }
    if (result.status === 'failed') {
      markFailed(taskId, result.code, result.message);
      return Response.json({
        status: 'failed',
        error: { code: result.code, message: result.message },
        provider: row.provider,
        expiresAt: row.expires_at,
      });
    }
    return Response.json({ status: 'pending', provider: row.provider, expiresAt: row.expires_at });
  } catch (err) {
    if (err instanceof AIKitError) {
      return Response.json({ error: err.toJSON() }, { status: httpStatusForCode(err.code) });
    }
    return Response.json({ error: { code: 'UNKNOWN', message: 'internal' } }, { status: 500 });
  }
}
```

- [ ] **Step 5: 运行测试通过**

Run: `cd /Users/kerro/Projects/AIKit && npx vitest run tests/api/video.test.ts`
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/app/api/video/ tests/api/video.test.ts && git commit -m "feat(api): video submit + poll with provider routing"
```

---

## Task 15: Layout + TabNav + LangSwitcher + ExpiryBanner

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/app/layout.tsx`
- Create: `/Users/kerro/Projects/AIKit/src/components/shared/TabNav.tsx`
- Create: `/Users/kerro/Projects/AIKit/src/components/shared/LangSwitcher.tsx`
- Create: `/Users/kerro/Projects/AIKit/src/components/shared/ExpiryBanner.tsx`
- Create: `/Users/kerro/Projects/AIKit/src/app/_components/DictProvider.tsx`

- [ ] **Step 1: 创建 src/app/_components/DictProvider.tsx**

```tsx
'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { Dict, Locale } from '@/lib/i18n/types';

type Ctx = { dict: Dict; locale: Locale };
const DictContext = createContext<Ctx | null>(null);

export function DictProvider({ dict, locale, children }: Ctx & { children: ReactNode }) {
  return <DictContext.Provider value={{ dict, locale }}>{children}</DictContext.Provider>;
}

export function useDict(): Ctx {
  const ctx = useContext(DictContext);
  if (!ctx) throw new Error('useDict must be inside DictProvider');
  return ctx;
}
```

- [ ] **Step 2: 创建 src/components/shared/TabNav.tsx**

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDict } from '@/app/_components/DictProvider';

export function TabNav() {
  const pathname = usePathname();
  const { dict } = useDict();
  const tabs = [
    { href: '/', label: dict.nav.chat },
    { href: '/image', label: dict.nav.image },
    { href: '/video', label: dict.nav.video },
  ] as const;
  return (
    <nav className="flex items-center gap-1">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'px-4 py-2 text-sm rounded-md transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: 创建 src/components/shared/LangSwitcher.tsx**

```tsx
'use client';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useDict } from '@/app/_components/DictProvider';
import type { Locale } from '@/lib/i18n/types';

const LABELS: Record<Locale, string> = { en: 'English', zh: '中文', th: 'ไทย' };
const FLAGS: Record<Locale, string> = { en: 'EN', zh: 'ZH', th: 'TH' };

export function LangSwitcher() {
  const router = useRouter();
  const { locale } = useDict();
  const set = (l: Locale) => {
    document.cookie = `locale=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Globe className="h-4 w-4" />
          <span>{FLAGS[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(LABELS) as Locale[]).map((l) => (
          <DropdownMenuItem key={l} onClick={() => set(l)}>
            {LABELS[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: 创建 src/components/shared/ExpiryBanner.tsx**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useDict } from '@/app/_components/DictProvider';

type TaskMeta = { expires_at: number };

export function ExpiryBanner({ tasks }: { tasks: TaskMeta[] }) {
  const { dict } = useDict();
  const earliest = tasks.reduce<number | null>((acc, t) => {
    if (t.expires_at < Date.now()) return acc;
    return acc === null || t.expires_at < acc ? t.expires_at : acc;
  }, null);
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (earliest === null) return null;
  const remaining = Math.max(0, earliest - now);
  const mins = Math.floor(remaining / 60_000);
  const hrs = Math.floor(mins / 60);
  const label = hrs > 0 ? `${hrs}${dict.common.hours} ${mins % 60}${dict.common.minutes}` : `${mins}${dict.common.minutes}`;
  return (
    <div className="px-4 py-2 text-sm text-muted-foreground border-b bg-muted/30">
      ⏰ {dict.common.expiresAt}: {label} — {dict.common.saveNow}
    </div>
  );
}
```

- [ ] **Step 5: 创建 src/app/layout.tsx**

```tsx
import './globals.css';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { getDict, normalizeLocale } from '@/lib/i18n';
import { DictProvider } from './_components/DictProvider';
import { TabNav } from '@/components/shared/TabNav';
import { LangSwitcher } from '@/components/shared/LangSwitcher';

export const metadata = { title: 'AIKit', description: 'Friends-only AI kit on DashScope' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const c = await cookies();
  const locale = normalizeLocale(c.get('locale')?.value);
  const dict = getDict(locale);
  return (
    <html lang={locale}>
      <body>
        <DictProvider dict={dict} locale={locale}>
          <header className="flex items-center justify-between px-6 py-3 border-b">
            <div className="flex items-center gap-6">
              <span className="text-lg font-semibold">AIKit</span>
              <TabNav />
            </div>
            <LangSwitcher />
          </header>
          <main className="container py-6">{children}</main>
        </DictProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: typecheck**

Run: `cd /Users/kerro/Projects/AIKit && npm run typecheck`
Expected: 无 error。

- [ ] **Step 7: 启动 dev 并目视检查**

Run（手动终端）: `cd /Users/kerro/Projects/AIKit && DASHSCOPE_API_KEY=sk-placeholder npm run dev`
访问 `http://localhost:3000/`：
- 看到 header 有 AIKit logo + 3 tab + 右上角 EN 下拉
- 切 ZH → 文案变中文
- 切 TH → 文案变泰文

- [ ] **Step 8: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/app/layout.tsx src/app/_components/ src/components/shared/ && git commit -m "feat(ui): layout + TabNav + LangSwitcher + ExpiryBanner"
```

---

## Task 16: ChatPane + MessageList + ChatInput

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/app/page.tsx`
- Create: `/Users/kerro/Projects/AIKit/src/components/chat/ChatPane.tsx`
- Create: `/Users/kerro/Projects/AIKit/src/components/chat/MessageList.tsx`
- Create: `/Users/kerro/Projects/AIKit/src/components/chat/ChatInput.tsx`

- [ ] **Step 1: 创建 src/components/chat/MessageList.tsx**

```tsx
'use client';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

export function MessageList({ messages, pendingAssistant }: { messages: ChatMsg[]; pendingAssistant: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pendingAssistant]);
  return (
    <div ref={ref} className="flex-1 overflow-y-auto px-2 py-4 space-y-3">
      {messages.map((m, i) => (
        <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
          <div className={cn(
            'max-w-[70%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm',
            m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
          )}>{m.content}</div>
        </div>
      ))}
      {pendingAssistant !== null && (
        <div className="flex justify-start">
          <div className="max-w-[70%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm bg-muted">
            {pendingAssistant || '…'}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 创建 src/components/chat/ChatInput.tsx**

```tsx
'use client';
import { useState, type KeyboardEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useDict } from '@/app/_components/DictProvider';

export function ChatInput({ onSend, disabled }: { onSend: (text: string) => void; disabled: boolean }) {
  const { dict } = useDict();
  const [v, setV] = useState('');
  const submit = () => {
    const text = v.trim();
    if (!text || disabled) return;
    onSend(text);
    setV('');
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };
  return (
    <div className="flex gap-2 p-2 border-t">
      <Textarea value={v} onChange={(e) => setV(e.target.value)} onKeyDown={onKey}
        placeholder={dict.chat.placeholder} className="min-h-[60px]" disabled={disabled}/>
      <Button onClick={submit} disabled={disabled || !v.trim()}>{dict.chat.send}</Button>
    </div>
  );
}
```

- [ ] **Step 3: 创建 src/components/chat/ChatPane.tsx**

```tsx
'use client';
import { useState } from 'react';
import { MessageList, type ChatMsg } from './MessageList';
import { ChatInput } from './ChatInput';
import { useDict } from '@/app/_components/DictProvider';

export function ChatPane() {
  const { dict } = useDict();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (text: string) => {
    setError(null);
    const next: ChatMsg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setPending('');
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      if (!resp.ok || !resp.body) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody?.error?.code ?? 'UNKNOWN');
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let assistant = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const l of lines) {
          if (!l.startsWith('data:')) continue;
          const payload = l.slice(5).trim();
          if (!payload) continue;
          const evt = JSON.parse(payload) as { delta?: string; error?: { code: string }; done?: boolean };
          if (evt.error) { throw new Error(evt.error.code); }
          if (evt.delta) { assistant += evt.delta; setPending(assistant); }
        }
      }
      setMessages([...next, { role: 'assistant', content: assistant }]);
    } catch (e) {
      const code = (e as Error).message as keyof typeof dict.errors;
      setError(dict.errors[code] ?? dict.errors.UNKNOWN);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] border rounded-lg">
      <MessageList messages={messages} pendingAssistant={pending} />
      {error && <div className="px-3 py-2 text-sm text-destructive border-t">{error}</div>}
      <ChatInput onSend={send} disabled={pending !== null} />
    </div>
  );
}
```

- [ ] **Step 4: 创建 src/app/page.tsx**

```tsx
import { ChatPane } from '@/components/chat/ChatPane';

export default function ChatPage() {
  return <ChatPane />;
}
```

- [ ] **Step 5: 目视验证**

Run（手动）: `cd /Users/kerro/Projects/AIKit && DASHSCOPE_API_KEY=<real-key> npm run dev`
- 访问 `/` → 输入 "hi" 回车 → 看到流式文字 token 逐个出现
- 空输入 Send 禁用
- Shift+Enter 换行

- [ ] **Step 6: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/app/page.tsx src/components/chat/ && git commit -m "feat(ui): ChatPane with SSE consumer"
```

---

## Task 17: ImageForm + ImageGallery

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/app/image/page.tsx`
- Create: `/Users/kerro/Projects/AIKit/src/components/image/ImageForm.tsx`
- Create: `/Users/kerro/Projects/AIKit/src/components/image/ImageGallery.tsx`

- [ ] **Step 1: 创建 src/components/image/ImageGallery.tsx**

```tsx
'use client';
import { useDict } from '@/app/_components/DictProvider';

export function ImageGallery({ urls }: { urls: string[] }) {
  const { dict } = useDict();
  if (urls.length === 0) {
    return <div className="text-sm text-muted-foreground py-8 text-center">{dict.image.empty}</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {urls.map((u, i) => (
        <a key={i} href={u} target="_blank" rel="noreferrer" className="block border rounded-md overflow-hidden">
          <img src={u} alt={`result-${i}`} className="w-full h-auto" />
        </a>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 创建 src/components/image/ImageForm.tsx**

```tsx
'use client';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { useDict } from '@/app/_components/DictProvider';
import { ImageGallery } from './ImageGallery';

const RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const;
const BATCHES = [1, 2, 3, 4] as const;
const POLL_INTERVAL = 3_000;

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'polling'; taskId: string }
  | { kind: 'done'; urls: string[] }
  | { kind: 'error'; message: string };

export function ImageForm() {
  const { dict } = useDict();
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>('1:1');
  const [batch, setBatch] = useState<(typeof BATCHES)[number]>(1);
  const [state, setState] = useState<State>({ kind: 'idle' });

  const submit = async () => {
    if (!prompt.trim()) return;
    setState({ kind: 'submitting' });
    try {
      const resp = await fetch('/api/image/submit', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio: ratio, batchSize: batch }),
      });
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.error?.code ?? 'UNKNOWN');
      setState({ kind: 'polling', taskId: body.taskId });
      pollLoop(body.taskId);
    } catch (e) {
      const code = (e as Error).message as keyof typeof dict.errors;
      setState({ kind: 'error', message: dict.errors[code] ?? dict.errors.UNKNOWN });
    }
  };

  const pollLoop = async (taskId: string) => {
    while (true) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      const resp = await fetch(`/api/image/${taskId}`);
      const body = await resp.json();
      if (!resp.ok) {
        const code = body?.error?.code ?? 'UNKNOWN';
        setState({ kind: 'error', message: dict.errors[code as keyof typeof dict.errors] ?? dict.errors.UNKNOWN });
        return;
      }
      if (body.status === 'success') { setState({ kind: 'done', urls: body.urls }); return; }
      if (body.status === 'failed') {
        const code = body?.error?.code ?? 'UNKNOWN';
        setState({ kind: 'error', message: dict.errors[code as keyof typeof dict.errors] ?? dict.errors.UNKNOWN });
        return;
      }
    }
  };

  const busy = state.kind === 'submitting' || state.kind === 'polling';

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div>
          <Label>{dict.image.prompt}</Label>
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder={dict.image.promptPlaceholder} className="min-h-[120px]" disabled={busy}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{dict.image.ratio}</Label>
            <Select value={ratio} onValueChange={(v) => setRatio(v as typeof ratio)} disabled={busy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RATIOS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>{dict.image.batch}</Label>
            <Select value={String(batch)} onValueChange={(v) => setBatch(Number(v) as typeof batch)} disabled={busy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BATCHES.map((b) => <SelectItem key={b} value={String(b)}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={submit} disabled={busy || !prompt.trim()} className="w-full">
          {busy ? dict.image.generating : dict.image.generate}
        </Button>
        {state.kind === 'error' && <div className="text-sm text-destructive">{state.message}</div>}
      </div>
      <div className="border rounded-lg p-4 min-h-[300px]">
        <ImageGallery urls={state.kind === 'done' ? state.urls : []} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建 src/app/image/page.tsx**

```tsx
import { ImageForm } from '@/components/image/ImageForm';

export default function ImagePage() {
  return <ImageForm />;
}
```

- [ ] **Step 4: 目视验证**

Run（手动）: 同 T16。访问 `/image` → 输入 prompt → 选 16:9 + 2 张 → 点 Generate → 按钮变 Generating → 约 20s 后两张图显示。

- [ ] **Step 5: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/app/image/ src/components/image/ && git commit -m "feat(ui): ImageForm with poll + gallery"
```

---

## Task 18: VideoForm + VideoCard

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/app/video/page.tsx`
- Create: `/Users/kerro/Projects/AIKit/src/components/video/VideoForm.tsx`
- Create: `/Users/kerro/Projects/AIKit/src/components/video/VideoCard.tsx`

- [ ] **Step 1: 创建 src/components/video/VideoCard.tsx**

```tsx
'use client';
import { useDict } from '@/app/_components/DictProvider';

export function VideoCard({
  status, provider, videoUrl, error,
}: {
  status: 'pending' | 'success' | 'failed' | 'idle';
  provider?: string;
  videoUrl?: string;
  error?: string;
}) {
  const { dict } = useDict();
  if (status === 'idle') {
    return <div className="text-sm text-muted-foreground py-8 text-center">{dict.video.empty}</div>;
  }
  return (
    <div className="space-y-2">
      {provider && <div className="text-xs text-muted-foreground">{dict.video.providerLabel}: {provider}</div>}
      {status === 'pending' && <div className="text-sm">{dict.video.generating}</div>}
      {status === 'success' && videoUrl && (
        <video src={videoUrl} controls className="w-full rounded-md" />
      )}
      {status === 'failed' && error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  );
}
```

- [ ] **Step 2: 创建 src/components/video/VideoForm.tsx**

```tsx
'use client';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { useDict } from '@/app/_components/DictProvider';
import { VideoCard } from './VideoCard';

const DURATIONS = [5, 10] as const;
const RESOLUTIONS = ['720p', '1080p'] as const;
const RATIOS = ['16:9', '9:16', '1:1'] as const;
const POLL_INTERVAL = 5_000;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'polling'; taskId: string; provider: string }
  | { kind: 'done'; videoUrl: string; provider: string }
  | { kind: 'error'; message: string; provider?: string };

export function VideoForm() {
  const { dict } = useDict();
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(5);
  const [resolution, setResolution] = useState<(typeof RESOLUTIONS)[number]>('720p');
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>('16:9');
  const [firstFrame, setFirstFrame] = useState<string | null>(null);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [state, setState] = useState<State>({ kind: 'idle' });

  const onFirstFrame = async (f: File | null) => { setFirstFrame(f ? await fileToDataUrl(f) : null); };
  const onRefImages = async (fs: FileList | null) => {
    if (!fs) return setRefImages([]);
    const list = await Promise.all(Array.from(fs).slice(0, 4).map(fileToDataUrl));
    setRefImages(list);
  };

  const submit = async () => {
    if (!prompt.trim()) return;
    setState({ kind: 'submitting' });
    try {
      const body: Record<string, unknown> = { prompt, duration, resolution, aspectRatio: ratio };
      if (firstFrame) body.firstFrame = firstFrame;
      if (refImages.length) body.refImages = refImages;
      const resp = await fetch('/api/video/submit', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.code ?? 'UNKNOWN');
      setState({ kind: 'polling', taskId: data.taskId, provider: data.provider });
      pollLoop(data.taskId, data.provider);
    } catch (e) {
      const code = (e as Error).message as keyof typeof dict.errors;
      setState({ kind: 'error', message: dict.errors[code] ?? dict.errors.UNKNOWN });
    }
  };

  const pollLoop = async (taskId: string, provider: string) => {
    while (true) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      const resp = await fetch(`/api/video/${taskId}`);
      const body = await resp.json();
      if (!resp.ok) {
        const code = body?.error?.code ?? 'UNKNOWN';
        setState({ kind: 'error', provider, message: dict.errors[code as keyof typeof dict.errors] ?? dict.errors.UNKNOWN });
        return;
      }
      if (body.status === 'success') { setState({ kind: 'done', videoUrl: body.videoUrl, provider }); return; }
      if (body.status === 'failed') {
        const code = body?.error?.code ?? 'UNKNOWN';
        setState({ kind: 'error', provider, message: dict.errors[code as keyof typeof dict.errors] ?? dict.errors.UNKNOWN });
        return;
      }
    }
  };

  const busy = state.kind === 'submitting' || state.kind === 'polling';
  const card =
    state.kind === 'done' ? { status: 'success' as const, videoUrl: state.videoUrl, provider: state.provider } :
    state.kind === 'polling' ? { status: 'pending' as const, provider: state.provider } :
    state.kind === 'error' ? { status: 'failed' as const, error: state.message, provider: state.provider } :
    { status: 'idle' as const };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div>
          <Label>{dict.video.prompt}</Label>
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder={dict.video.promptPlaceholder} className="min-h-[120px]" disabled={busy}/>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>{dict.video.duration}</Label>
            <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v) as typeof duration)} disabled={busy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d}s</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>{dict.video.resolution}</Label>
            <Select value={resolution} onValueChange={(v) => setResolution(v as typeof resolution)} disabled={busy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RESOLUTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>{dict.video.aspectRatio}</Label>
            <Select value={ratio} onValueChange={(v) => setRatio(v as typeof ratio)} disabled={busy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RATIOS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>{dict.video.firstFrame}</Label>
          <input type="file" accept="image/*" disabled={busy}
            onChange={(e) => onFirstFrame(e.target.files?.[0] ?? null)}
            className="block text-sm" />
        </div>
        <div>
          <Label>{dict.video.refImages}</Label>
          <input type="file" accept="image/*" multiple disabled={busy}
            onChange={(e) => onRefImages(e.target.files)} className="block text-sm" />
          <p className="text-xs text-muted-foreground mt-1">{dict.video.refImagesHint}</p>
        </div>
        <Button onClick={submit} disabled={busy || !prompt.trim()} className="w-full">
          {busy ? dict.video.generating : dict.video.generate}
        </Button>
      </div>
      <div className="border rounded-lg p-4 min-h-[300px]">
        <VideoCard {...card} />
      </div>
    </div>
  );
}
```

注意：`firstFrame` 和 `refImages` 作为 `data:image/...` base64 传给 DashScope。**DashScope 实际可能要求可公开访问的 URL 而非 base64**——这一块 InkFrame 也是上层完成本地路径→可访问 URL 转换。Plan 里先做 data URL 透传，启动 smoke 时验证。如 DashScope 拒绝 data URL，在 T23 smoke 阶段切换为"先上传到临时图床再传 URL"——需要新增一个任务 T18a（暂未排入，等 smoke 结果）。

- [ ] **Step 3: 创建 src/app/video/page.tsx**

```tsx
import { VideoForm } from '@/components/video/VideoForm';

export default function VideoPage() {
  return <VideoForm />;
}
```

- [ ] **Step 4: 目视验证（T2V）**

Run（手动）: 访问 `/video` → 只填 prompt → Generate → 等 5 分钟 → video 出现。

- [ ] **Step 5: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/app/video/ src/components/video/ && git commit -m "feat(ui): VideoForm + VideoCard with firstFrame/refImages"
```

---

## Task 19: 启动期 resume poller

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/lib/jobs/poller.ts`
- Modify: `/Users/kerro/Projects/AIKit/src/app/api/image/[taskId]/route.ts` (no change — poller calls same core)
- Modify: `/Users/kerro/Projects/AIKit/src/app/api/video/[taskId]/route.ts`

- [ ] **Step 1: 创建 src/lib/jobs/poller.ts**

```typescript
import { listPendingNotExpired, markSuccess, markFailed, type TaskRow } from '../db/tasks';
import { pollImage } from '../dashscope/image';
import { pollVideo } from '../dashscope/video';
import { AIKitError } from '../errors';

const POLL_INTERVAL_MS = 8_000;
const started = new Set<string>();

export function resumePendingTasks(): void {
  const pending = listPendingNotExpired();
  for (const row of pending) {
    if (!row.dashscope_id) continue;
    if (started.has(row.task_id)) continue;
    started.add(row.task_id);
    void pollInBackground(row);
  }
  if (pending.length > 0) console.log(`[resume] started polling for ${pending.length} pending tasks`);
}

async function pollInBackground(row: TaskRow): Promise<void> {
  while (Date.now() < row.expires_at) {
    await sleep(POLL_INTERVAL_MS);
    try {
      if (row.type === 'image') {
        const out = await pollImage(row.dashscope_id!);
        if (out.status === 'success') { markSuccess(row.task_id, out.urls); return; }
        if (out.status === 'failed') { markFailed(row.task_id, out.code, out.message); return; }
      } else {
        const out = await pollVideo(row.dashscope_id!);
        if (out.status === 'success') { markSuccess(row.task_id, [out.url]); return; }
        if (out.status === 'failed') { markFailed(row.task_id, out.code, out.message); return; }
      }
    } catch (err) {
      if (err instanceof AIKitError && err.code !== 'NETWORK_ERROR') {
        markFailed(row.task_id, err.code, err.message);
        return;
      }
      // NETWORK_ERROR 重试
    }
  }
  markFailed(row.task_id, 'UNKNOWN', 'expired before completion');
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/lib/jobs/ && git commit -m "feat(jobs): background poller that resumes pending tasks"
```

---

## Task 20: 启动期挂载 cron + resume

**Files:**
- Create: `/Users/kerro/Projects/AIKit/src/lib/bootstrap.ts`
- Modify: `/Users/kerro/Projects/AIKit/src/app/layout.tsx`

- [ ] **Step 1: 创建 src/lib/bootstrap.ts**

```typescript
import { startCleanupCron } from './db/cron';
import { resumePendingTasks } from './jobs/poller';
import { getDb } from './db/client';

let booted = false;

export function bootOnce(): void {
  if (booted) return;
  booted = true;
  // 强制触发 DB 初始化（建表）
  getDb();
  startCleanupCron();
  resumePendingTasks();
  console.log('[boot] cron + resume started');
}
```

- [ ] **Step 2: 修改 src/app/layout.tsx 在顶部注入 bootOnce**

在 `import './globals.css';` 下一行加：

```typescript
import { bootOnce } from '@/lib/bootstrap';
bootOnce();
```

完整 layout.tsx 头部示例：

```tsx
import './globals.css';
import { bootOnce } from '@/lib/bootstrap';
import { cookies } from 'next/headers';
// ... 其它 import
bootOnce();
export const metadata = { title: 'AIKit', description: 'Friends-only AI kit on DashScope' };
// ... 其余不变
```

（注意：Next.js 15 的 App Router 会在服务启动首次渲染 layout 时执行 `bootOnce()`——幂等，多次调用只执行一次。）

- [ ] **Step 3: 验证 typecheck**

Run: `cd /Users/kerro/Projects/AIKit && npm run typecheck`
Expected: 无 error。

- [ ] **Step 4: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add src/lib/bootstrap.ts src/app/layout.tsx && git commit -m "feat(boot): startup cron + resume pending tasks"
```

---

## Task 21: Dockerfile + docker-compose.yml

**Files:**
- Create: `/Users/kerro/Projects/AIKit/Dockerfile`
- Create: `/Users/kerro/Projects/AIKit/docker-compose.yml`
- Create: `/Users/kerro/Projects/AIKit/.dockerignore`

- [ ] **Step 1: 创建 Dockerfile**

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apk add --no-cache tini \
  && addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001 \
  && mkdir -p /data \
  && chown -R nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/db/schema.sql ./src/lib/db/schema.sql

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
```

- [ ] **Step 2: 创建 .dockerignore**

```
node_modules
.next
.git
.env
.env.local
data/*.db
data/*.db-shm
data/*.db-wal
docs
tests
*.md
coverage
```

- [ ] **Step 3: 创建 docker-compose.yml**

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

- [ ] **Step 4: 本地构建验证**

Run: `cd /Users/kerro/Projects/AIKit && docker compose build`
Expected: build 成功输出镜像。

- [ ] **Step 5: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add Dockerfile docker-compose.yml .dockerignore && git commit -m "chore: Dockerfile standalone + compose for 127.0.0.1:3100"
```

---

## Task 22: README + 部署手册

**Files:**
- Create: `/Users/kerro/Projects/AIKit/README.md`

- [ ] **Step 1: 写 README.md**

```markdown
# AIKit

朋友圈（≤ 5 人）用的极简 AI Web，封装阿里 DashScope：Qwen-Turbo 对话 / Wanx 生图 / Wanx + Kling v3 生视频。

- **Live**: https://<YOUR_DOMAIN> （雷池 Basic Auth）
- **Stack**: Next.js 15 + TS + Tailwind + shadcn/ui + better-sqlite3 + DashScope
- **Design**: `docs/superpowers/specs/2026-04-20-aikit-web-design.md`
- **Plan**: `docs/superpowers/plans/2026-04-20-aikit-web-implementation.md`

## 本地开发

```bash
cp .env.example .env
# 填入 DASHSCOPE_API_KEY
npm install
npm run dev
# http://localhost:3000
```

## 测试

```bash
npm test            # 全部单测
npm run typecheck
```

## 部署到 kapple

### 1. 仓库同步

服务器：`git clone <repo> /data/aikit && cd /data/aikit && cp .env.example .env`，填入 key。

### 2. 启动容器

```bash
docker compose up -d --build
docker logs -f aikit
```

`127.0.0.1:3100` 会监听 Next.js 服务（只暴露给本机，不对公网）。

### 3. DNS（腾讯云 DNSPod）

| 类型 | 主机记录 | 记录值 | TTL |
|---|---|---|---|
| A | ai | <YOUR_SERVER_IP> | 600 |

### 4. 雷池反代

在 `https://<kapple>:9443` 管理台：

1. **防护应用 → 新增**：
   - 域名 `<YOUR_DOMAIN>`
   - 上游 `http://127.0.0.1:3100`
2. **HTTPS 配置 → 自动申请证书**（Let's Encrypt）。失败时先挂雷池自签兜底。
3. **自定义规则** 追加 Nginx 片段：
```nginx
auth_basic "AI Kit";
auth_basic_user_file /etc/nginx/conf.d/aikit.htpasswd;
```

### 5. Basic Auth 账号

宿主机生成：
```bash
htpasswd -c /data/safeline/resources/nginx/aikit.htpasswd kerro
```
雷池容器通过卷 `/data/safeline/resources/nginx` 已挂到 Tengine `/etc/nginx/conf.d`。

### 6. 验收

打开 `https://<YOUR_DOMAIN>` → 浏览器弹 Basic Auth → 登录后看到 AIKit。走一遍 Chat / Image / Video。

## 故障排查

| 症状 | 排查 |
|---|---|
| 雷池 497 | 用户走的是 80，浏览器会被 302 到 443 — 雷池默认配置 |
| 容器内 SQLite 报只读 | `chown -R 1001:1001 /data/aikit/data` |
| `kling/xxx` model URL 404 | 确认 model 是放在 JSON body 里而非 URL path |
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kerro/Projects/AIKit && git add README.md && git commit -m "docs: README with local dev + kapple deploy steps"
```

---

## Task 23: 端到端 smoke（本地 Docker）

**Files:** （仅脚本执行，不改代码）

- [ ] **Step 1: 构建并起容器**

Run:
```bash
cd /Users/kerro/Projects/AIKit
cp .env.example .env
# 手动编辑 .env 填入 DASHSCOPE_API_KEY
docker compose up -d --build
docker logs -f aikit | head -30
```
Expected: 日志包含 `[boot] cron + resume started` 和 `started on port 3000`。

- [ ] **Step 2: Chat smoke**

Run:
```bash
curl -N -X POST http://127.0.0.1:3100/api/chat \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"Say hi in 5 words"}]}'
```
Expected: 多行 `data: {"delta":"..."}` 到 `data: {"done":true}`。

- [ ] **Step 3: Image smoke**

```bash
TASK=$(curl -s -X POST http://127.0.0.1:3100/api/image/submit \
  -H 'content-type: application/json' \
  -d '{"prompt":"a cute cat","aspectRatio":"1:1","batchSize":1}' | jq -r .taskId)
echo $TASK
# 每 3s poll 一次
until curl -s http://127.0.0.1:3100/api/image/$TASK | jq -e '.status=="success" or .status=="failed"' >/dev/null; do sleep 3; done
curl -s http://127.0.0.1:3100/api/image/$TASK | jq .
```
Expected: `status: success` 带 `urls: [...]`。

- [ ] **Step 4: Video T2V smoke**

```bash
TASK=$(curl -s -X POST http://127.0.0.1:3100/api/video/submit \
  -H 'content-type: application/json' \
  -d '{"prompt":"a dog running in grass","duration":5,"resolution":"720p","aspectRatio":"16:9"}' | jq -r .taskId)
# 每 8s poll
until curl -s http://127.0.0.1:3100/api/video/$TASK | jq -e '.status=="success" or .status=="failed"' >/dev/null; do sleep 8; done
curl -s http://127.0.0.1:3100/api/video/$TASK | jq .
```
Expected: `status: success` 带 `videoUrl`，`provider: "wanx-t2v"`。

- [ ] **Step 5: Resume smoke**

```bash
TASK=$(curl -s -X POST http://127.0.0.1:3100/api/video/submit \
  -H 'content-type: application/json' \
  -d '{"prompt":"a sunrise","duration":5,"resolution":"720p","aspectRatio":"16:9"}' | jq -r .taskId)
# 立刻重启
docker restart aikit
sleep 5
# 仍能 poll 到完成
until curl -s http://127.0.0.1:3100/api/video/$TASK | jq -e '.status=="success" or .status=="failed"' >/dev/null; do sleep 8; done
curl -s http://127.0.0.1:3100/api/video/$TASK | jq .
```
Expected: 重启后最终仍 success。

- [ ] **Step 6: 浏览器人工走读**

- 打开 `http://localhost:3100/` → 切 EN/ZH/TH → 文案变化
- Chat tab：发 "tell me a joke"，看到流式
- Image tab：生成 2 张图 → 成功显示
- Video tab：T2V / firstFrame / refImages 三种路径各走一次

- [ ] **Step 7: 验收矩阵 checklist**

对照 spec §11.5 逐条核对：

- [ ] 英文用户首次访问（Basic Auth + 默认英文）—（待部署到 kapple 后核）
- [ ] 切中文
- [ ] Chat 两轮流式
- [ ] 生图 16:9 + 2 张
- [ ] 生视频 T2V
- [ ] 生视频 I2V（firstFrame）
- [ ] 生视频 R2V（refImages）
- [ ] 3h 过期（可通过 SQL 改 expires_at 验证）
- [ ] 容器重启 resume（T23 Step 5 已覆盖）
- [ ] CONTENT_POLICY Toast（用敏感词）

- [ ] **Step 8: 清理 & push**

```bash
cd /Users/kerro/Projects/AIKit
docker compose down
git push -u origin main   # 待用户审核 push 权限，默认不自动 push
```

---

## Self-Review

1. **Spec coverage**:
   - §3 决策 → 全映射（T01-T22）
   - §4 架构 → Docker T21、雷池 T22、SQLite T05、DashScope T08-11
   - §5 仓库结构 → T01-T21 全落地
   - §6 前端 → T15-T18
   - §7 API 契约 → T12-T14（注：chat 错误改走流内事件，测试 T12-Step 4 已修正）
   - §8 数据层 → T05-T07（3h TTL 常量 T06），cron T07，resume T19
   - §9 部署 → T21/T22
   - §10 错误处理 → T03（mapping + httpStatusForCode）
   - §11 测试策略 → 每个 DashScope / API 任务都带单测，fixture 复用 InkFrame（T10/T11）
   - §11.5 验收矩阵 → T23 Step 7 清单
   - §12.1 风险里的 `kling/` URL 编码问题 → T11 在 body 里传 model 已遵守

2. **Placeholder scan**: 无 TBD / similar to / TODO。T18 里标注了 "DashScope 可能拒绝 data URL" 的 smoke 阶段应急——不是 placeholder，是已知风险 + 明确的后续任务占位（T18a 未排入，等 smoke 结果再决定是否新增）。

3. **Type consistency**:
   - `VideoProvider` 在 T11 定义为 `'wanx-t2v' | 'kling-v3' | 'kling-v3-omni'`，T14 API 和 T18 前端 TaskCard 都一致使用
   - `AspectRatio` 类型在 image 用 `'1:1'|'16:9'|'9:16'|'4:3'|'3:4'`，video 用 `'16:9'|'9:16'|'1:1'` —— 两者独立不冲突
   - `TaskType` `'image'|'video'` 从 DB 层 T06 贯穿到所有 API
   - `AIKitErrorCode` 5 个值（T03），i18n dict.errors 5 个键（T04），一致

---

## 执行交接

Plan 已保存到 `/Users/kerro/Projects/AIKit/docs/superpowers/plans/2026-04-20-aikit-web-implementation.md`。两种执行方式：

**1. Subagent-Driven（推荐）** — 每个任务 spawn 独立 subagent + 两阶段 review，适合这种多模块串行依赖的项目，互不污染 context。

**2. Inline Execution** — 本 session 内连续跑，批量 checkpoint。

告诉我选哪个（以及 T11 的视频路由命名是否按本 plan 的 `wanx-t2v / kling-v3 / kling-v3-omni`，还是改回 spec §7.4 的 `wanx-t2v / wanx-i2v / wanx-r2v`），我开始调度。
