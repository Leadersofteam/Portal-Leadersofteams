#!/usr/bin/env bash
# Jednorazowa konfiguracja VPS pod stack portalu (ADR-005/008).
# Uruchamiać jako root na VPS: bash bootstrap.sh
set -euo pipefail

DEPLOY_USER="portal-deploy"
PORTAL_DIR="/opt/portal"
STAGING_DIR="/opt/portal-staging"

echo "==> Użytkownik deploy (bez sudo, tylko docker + katalogi portalu)"
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd --create-home --shell /bin/bash "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER"
  echo "Utworzono użytkownika $DEPLOY_USER. Dodaj klucz publiczny CI do:"
  echo "  /home/$DEPLOY_USER/.ssh/authorized_keys"
  install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
fi

echo "==> Sieć Traefika (współdzielona z istniejącym stackiem app)"
docker network inspect traefik_public &>/dev/null || docker network create traefik_public

echo "==> Katalogi projektu"
for dir in "$PORTAL_DIR" "$STAGING_DIR"; do
  install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$dir"
done

for dir in "$PORTAL_DIR" "$STAGING_DIR"; do
  if [ ! -f "$dir/.env" ]; then
    echo "UWAGA: uzupełnij $dir/.env (wzór: infra/.env.example) i ustaw chmod 600."
  fi
done

echo "==> Gotowe. Kolejne kroki:"
echo "  1. Klucz publiczny deploy CI → /home/$DEPLOY_USER/.ssh/authorized_keys"
echo "  2. Uzupełnij $PORTAL_DIR/.env i $STAGING_DIR/.env (chmod 600)"
echo "  3. Sklonuj repo do $PORTAL_DIR/repo (wariant build-on-VPS) lub polegaj na GHCR"
echo "  4. Skonfiguruj backup: infra/backup/README.md (rclone + darmowy tier R2/B2)"
