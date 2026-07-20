#!/usr/bin/env bash
# Uruchamia PEŁNY stack lokalnie i odpala e2e ścieżki krytycznej (ADR-008, D5).
# Bez Dockera dla apki: MySQL/Redis z compose dev, api+worker przez tsx, web przez
# `next dev` (czyta API_INTERNAL_URL w runtime). NODE_ENV=development → cookie sesji
# działa po http (Secure=off). Sprząta po sobie (trap). Użycie: bash infra/e2e.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export DATABASE_URL="${DATABASE_URL:-mysql://portal:portal@127.0.0.1:3306/portal}"
export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"
export PORT=3001
export HOST=127.0.0.1
export API_INTERNAL_URL=http://127.0.0.1:3001
export APP_BASE_URL=http://127.0.0.1:3000
export E2E_BASE_URL=http://127.0.0.1:3000
# api/worker: NODE_ENV=development → cookie sesji działa po http (Secure=off).
# web: BUILD produkcyjny (szybka, niezawodna hydracja — brak wyścigów dev-mode).

pids=()
cleanup() {
  for p in "${pids[@]:-}"; do kill "$p" 2>/dev/null || true; done
  docker compose -f infra/docker-compose.dev.yml -p portal-dev down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "== MySQL/Redis (compose dev) =="
docker compose -f infra/docker-compose.dev.yml -p portal-dev up -d --wait
echo "== schema + seed słowników =="
pnpm -C apps/api exec prisma db push --skip-generate
pnpm -C apps/api exec prisma db seed

echo "== build web (produkcyjny) =="
NODE_ENV=production pnpm -C apps/web exec next build >/tmp/e2e-webbuild.log 2>&1 || { tail -30 /tmp/e2e-webbuild.log; exit 1; }

echo "== api + worker + web =="
NODE_ENV=development pnpm -C apps/api exec tsx src/main.ts >/tmp/e2e-api.log 2>&1 & pids+=($!)
NODE_ENV=development pnpm -C apps/api exec tsx src/worker.ts >/tmp/e2e-worker.log 2>&1 & pids+=($!)
NODE_ENV=production pnpm -C apps/web exec next start -p 3000 -H 127.0.0.1 >/tmp/e2e-web.log 2>&1 & pids+=($!)

echo "== czekam na web (http://127.0.0.1:3000) =="
for i in $(seq 1 90); do
  if curl -sf http://127.0.0.1:3000 >/dev/null 2>&1; then echo "web gotowy (${i}s)"; break; fi
  sleep 1
  [ "$i" = "90" ] && { echo "web nie wstał"; tail -30 /tmp/e2e-web.log; exit 1; }
done

echo "== Playwright =="
pnpm -C apps/web exec playwright test "$@"
