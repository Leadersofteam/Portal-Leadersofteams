# RUNBOOK — pliki docker-compose (Portal)

Który plik compose do czego. Repo: `Portal-Leadersofteams`, katalog na VPS: `/docker/portal-staging`, pliki w `infra/`.

## Przegląd

| Plik                               | Rola                         | Kontenery                                     | Stan                                                               |
| ---------------------------------- | ---------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| `infra/docker-compose.staging.yml` | **STAGING** (za basic-auth)  | `portal-staging-{web,api,worker,mysql,redis}` | **AKTYWNY**                                                        |
| `infra/docker-compose.yml`         | **PROD** `leadersofteams.pl` | `portal-{web,api,worker,mysql,redis}`         | **nieaktywny** (reguły Traefik gotowe, go-live w osobnym sprincie) |
| `infra/docker-compose.dev.yml`     | lokalne zależności dev/testy | `portal-dev-{mysql,redis}` (porty 3306/6379)  | wg potrzeb                                                         |

## Staging — `infra/docker-compose.staging.yml`

Aktywne wdrożenie `staging.leadersofteams.pl` za **basic-auth** w Traefiku (`STAGING_BASIC_AUTH` = wynik `htpasswd -nB user`). Przycięte limity cgroup (ADR-008). Osobny projekt `portal-staging`.

```bash
cd /docker/portal-staging
docker compose -p portal-staging --env-file /opt/portal-staging/.env -f infra/docker-compose.staging.yml up -d
docker compose -p portal-staging -f infra/docker-compose.staging.yml ps
docker compose -f infra/docker-compose.staging.yml config   # EXIT 0 (walidne)
# migracje (profil tools):
docker compose -p portal-staging --env-file /opt/portal-staging/.env -f infra/docker-compose.staging.yml --profile tools run --rm migrate
```

Healthcheck: `api` (`/healthz`), `mysql`, `redis` — mają. **`web` i `worker` — brak** (planowane do dodania; `worker` bez portu HTTP → healthcheck procesowy/Redis-owy, nie `fetch`). Recreate tych dwóch kontenerów = brama zatwierdzenia (GATE).

## Prod (nieaktywny) — `infra/docker-compose.yml`

Reguły Traefik dla `leadersofteams.pl` / `www.leadersofteams.pl` / `api.leadersofteams.pl` są gotowe, ale **usługa nie jest uruchomiona**. Go-live (start prod, zdjęcie basic-auth, DNS cutover) to **osobny sprint** — patrz `docs/GO-LIVE-CHECKLIST.md`.

```bash
docker compose -f infra/docker-compose.yml config   # EXIT 0 (walidne, ale NIE uruchamiać bez zgody na go-live)
```

## Dev — `infra/docker-compose.dev.yml`

Lekki stack (mysql 8.4 + redis) z portami wystawionymi na host (3306/6379) do developmentu i testów integracyjnych. Osobny projekt `portal-dev`.

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```
