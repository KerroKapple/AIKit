#!/usr/bin/env bash
# 从 Google Fonts CDN 下载 variable font woff2 到 public/fonts
# 再跑只在替换字体时需要；产物入库
#
# ── URL 失效时如何刷新 ──────────────────────────────────────────────────────
# gstatic URL 带版本号（如 v38），版本升级后旧 URL 会 404。
# 刷新方法：用带浏览器 UA 的 curl 请求 Google Fonts CSS，从 src: url(...) 取新链接。
#
# Fraunces 示例：
#   curl -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' \
#        'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..900&display=swap'
#
# 找到 latin 子集对应的 src: url(...) 行，复制 woff2 地址替换下面的 URL 即可。
# Instrument Sans 同理：
#   https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&display=swap
# JetBrains Mono 同理：
#   https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400..700&display=swap
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p public/fonts

fetch() {
  local name="$1" url="$2" out="public/fonts/$3"
  curl --fail -sSL -H 'User-Agent: Mozilla/5.0 AppleWebKit' "$url" -o "$out"
  local size
  size=$(wc -c < "$out")
  if [[ $size -lt 10000 ]]; then
    echo "✗ $name: downloaded file only $size bytes — URL likely rotted, see header comment" >&2
    exit 1
  fi
  echo "✓ $name → $out ($size bytes)"
}

# Fraunces v38 (opsz,wght variable) — latin subset
fetch fraunces \
  'https://fonts.gstatic.com/s/fraunces/v38/6NU78FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0KxC9TeA.woff2' \
  fraunces.woff2

# Instrument Sans v4 (wght variable, normal) — latin subset
fetch instrument-sans \
  'https://fonts.gstatic.com/s/instrumentsans/v4/pxiTypc9vsFDm051Uf6KVwgkfoSxQ0GsQv8ToedPibnr0SZe1Q.woff2' \
  instrument-sans.woff2

# JetBrains Mono v24 (wght variable) — latin subset
fetch jetbrains-mono \
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwg.woff2' \
  jetbrains-mono.woff2

echo '完成 · 产物进 git'
