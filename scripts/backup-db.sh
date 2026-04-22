#!/usr/bin/env bash
# SQLite hot backup（WAL 模式兼容）。服务器端 crontab 每 6h 跑一次。
# 用法：./scripts/backup-db.sh [/path/to/tasks.db] [/backup/dir]
#
# 服务器 crontab 示例：
#   0 */6 * * * /opt/aikit/scripts/backup-db.sh >> /var/log/aikit-backup.log 2>&1

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
