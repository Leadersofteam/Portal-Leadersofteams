#!/usr/bin/env bash
# Nocny backup MySQL portalu → zewnętrzny darmowy storage (ADR-005/009).
# Cron (użytkownik portal-deploy): 30 3 * * * /opt/portal/repo/infra/backup/backup.sh
# Wymaga: skonfigurowanego rclone remote (np. r2:portal-backups — patrz README.md).
set -euo pipefail

COMPOSE_PROJECT="${COMPOSE_PROJECT:-portal}"
RCLONE_REMOTE="${RCLONE_REMOTE:-r2:portal-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
BACKUP_DIR="${BACKUP_DIR:-/opt/portal/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/portal-mysql-$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "==> Dump bazy portal ($STAMP)"
docker compose -p "$COMPOSE_PROJECT" exec -T mysql \
  sh -c 'exec mysqldump --single-transaction --routines --triggers -uportal -p"$MYSQL_PASSWORD" portal' \
  | gzip > "$FILE"

echo "==> Wysyłka na zewnętrzny storage ($RCLONE_REMOTE)"
rclone copy "$FILE" "$RCLONE_REMOTE/mysql/" --checksum

echo "==> Rotacja: lokalnie i zdalnie > $RETENTION_DAYS dni"
find "$BACKUP_DIR" -name 'portal-mysql-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
rclone delete "$RCLONE_REMOTE/mysql/" --min-age "${RETENTION_DAYS}d"

echo "==> OK: $FILE"
