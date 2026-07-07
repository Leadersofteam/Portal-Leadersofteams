#!/usr/bin/env bash
# Kwartalny test odtwarzania (RPO/RTO — ADR-005): ładuje najnowszy dump
# do tymczasowego kontenera MySQL i wykonuje smoke test.
set -euo pipefail

RCLONE_REMOTE="${RCLONE_REMOTE:-r2:portal-backups}"
WORK_DIR="$(mktemp -d)"
CONTAINER="portal-restore-test"

cleanup() {
  docker rm -f "$CONTAINER" &>/dev/null || true
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

echo "==> Pobieranie najnowszego dumpa"
LATEST="$(rclone lsf "$RCLONE_REMOTE/mysql/" | sort | tail -n1)"
[ -n "$LATEST" ] || { echo "BŁĄD: brak backupów w $RCLONE_REMOTE/mysql/"; exit 1; }
rclone copy "$RCLONE_REMOTE/mysql/$LATEST" "$WORK_DIR/"

echo "==> Tymczasowy MySQL"
docker run -d --name "$CONTAINER" -e MYSQL_ROOT_PASSWORD=restoretest -e MYSQL_DATABASE=portal mysql:8.4
until docker exec "$CONTAINER" mysqladmin ping -h127.0.0.1 -uroot -prestoretest --silent &>/dev/null; do
  sleep 2
done

echo "==> Import: $LATEST"
gunzip -c "$WORK_DIR/$LATEST" | docker exec -i "$CONTAINER" mysql -uroot -prestoretest portal

echo "==> Smoke test"
USERS=$(docker exec "$CONTAINER" mysql -uroot -prestoretest -N -e 'SELECT COUNT(*) FROM portal.users;')
echo "Odtworzono. users=$USERS"
echo "==> RESTORE TEST OK"
