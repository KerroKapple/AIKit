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
