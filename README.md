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
npm test            # 全部单测（Vitest）
npm run typecheck   # tsc --noEmit
```

## 部署（以腾讯云 Debian 12 + SafeLine 雷池为例）

### 1. 仓库同步

服务器：
```bash
git clone <repo> /data/aikit && cd /data/aikit
cp .env.example .env
# 编辑 .env 填入 DASHSCOPE_API_KEY
```

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
| `kling/xxx` model URL 404 | 确认 model 放在 JSON body 而非 URL path |
| npm install cache permission | 使用 `npm_config_cache=/tmp/npm-cache npm install` |
