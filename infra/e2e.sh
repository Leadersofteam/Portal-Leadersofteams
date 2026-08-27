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
# Origin przeglądarki MUSI być localhost, nie 127.0.0.1: `next start` wypełnia
# x-forwarded-host własnym `localhost`, więc absolutny Location z middleware
# (redirect `/`→`/panel`, P1) wskazuje localhost — po wejściu przez 127.0.0.1
# przekierowanie zmieniałoby origin i gubiło host-only cookie sesji.
# localhost jest secure context tak samo jak 127.0.0.1 (crypto.subtle działa).
export APP_BASE_URL=http://localhost:3000
export E2E_BASE_URL=http://localhost:3000
# api/worker: NODE_ENV=development → cookie sesji działa po http (Secure=off).
# web: BUILD produkcyjny (szybka, niezawodna hydracja — brak wyścigów dev-mode).

pids=()
cleanup() {
  # UWAGA: `pnpm exec …` to opakowanie — zabicie samego rodzica zostawia żywy
  # proces `next-server` na porcie 3000. Kolejny przebieg dostaje wtedy
  # EADDRINUSE, ale skrypt tego NIE widzi (curl trafia w stary serwer) i testy
  # lecą przeciwko POPRZEDNIEMU buildowi — objawia się to lawiną niezrozumiałych
  # czerwonych testów. Dlatego ubijamy całe grupy procesów (startowane setsid).
  for p in "${pids[@]:-}"; do
    kill -- "-$p" 2>/dev/null || kill "$p" 2>/dev/null || true
  done
  docker compose -f infra/docker-compose.dev.yml -p portal-dev down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Port zajęty przez sierotę z poprzedniego przebiegu = testy przeciwko staremu
# buildowi. Lepiej stanąć od razu z jasnym komunikatem niż zielenić/czerwienić
# się z niewłaściwego powodu.
for port in 3000 3001; do
  if ss -ltn "sport = :$port" 2>/dev/null | grep -q LISTEN; then
    echo "BŁĄD: port $port jest zajęty (sierota z poprzedniego przebiegu?)." >&2
    ss -ltnp "sport = :$port" >&2 || true
    exit 1
  fi
done

echo "== MySQL/Redis (compose dev) =="
docker compose -f infra/docker-compose.dev.yml -p portal-dev up -d --wait
echo "== schema + seed słowników =="
pnpm -C apps/api exec prisma db push --skip-generate
pnpm -C apps/api exec prisma db seed

echo "== build web (produkcyjny) =="
NODE_ENV=production pnpm -C apps/web exec next build >/tmp/e2e-webbuild.log 2>&1 || { tail -30 /tmp/e2e-webbuild.log; exit 1; }

echo "== api + worker + web =="
setsid env NODE_ENV=development pnpm -C apps/api exec tsx src/main.ts >/tmp/e2e-api.log 2>&1 & pids+=($!)
setsid env NODE_ENV=development pnpm -C apps/api exec tsx src/worker.ts >/tmp/e2e-worker.log 2>&1 & pids+=($!)
setsid env NODE_ENV=production pnpm -C apps/web exec next start -p 3000 -H 127.0.0.1 >/tmp/e2e-web.log 2>&1 & pids+=($!)

echo "== czekam na web (http://127.0.0.1:3000) =="
for i in $(seq 1 90); do
  if curl -sf http://127.0.0.1:3000 >/dev/null 2>&1; then echo "web gotowy (${i}s)"; break; fi
  sleep 1
  [ "$i" = "90" ] && { echo "web nie wstał"; tail -30 /tmp/e2e-web.log; exit 1; }
done

echo "== Playwright =="
pnpm -C apps/web exec playwright test "$@"
