# Runbook: deploy i rollback

## Pierwszy deploy (bootstrap VPS)

Jednorazowo, po podłączeniu SSH (checklista sekretów w `sekrety.md`):

```bash
ssh root@VPS 'bash -s' < infra/bootstrap.sh   # user deploy, sieć, katalogi
# uzupełnij /opt/portal/.env (wzór infra/.env.example, chmod 600)
ssh portal-deploy@VPS
git clone https://github.com/Leadersofteam/Portal-Leadersofteams /opt/portal/repo
cd /opt/portal/repo
docker compose -p portal --env-file /opt/portal/.env -f infra/docker-compose.yml build
# migracje bazowe (schemat po Sprintach 1–6): prisma/migrations/0000_init
docker compose -p portal --env-file /opt/portal/.env -f infra/docker-compose.yml run --rm migrate
docker compose -p portal --env-file /opt/portal/.env -f infra/docker-compose.yml up -d
curl -fsS https://api.leadersofteams.pl/healthz
```

Migracje w repo (`apps/api/prisma/migrations/`) są źródłem prawdy dla `migrate deploy`
na produkcji — nie używamy `db push` poza developmentem.

## Ścieżki standardowe (automatyczne)

- **Staging:** merge do `main` → workflow `deploy-staging.yml` buduje obrazy (GHCR), wykonuje migracje (`migrate`), podnosi stack `portal-staging` i czeka na healthcheck. Porażka = automatyczny rollback do obrazów z `/opt/portal-staging/last-good`.
- **Produkcja:** tag `vX.Y.Z` (`git tag v0.2.0 && git push origin v0.2.0`) → `deploy-prod.yml`, analogicznie na `/opt/portal`.

## Ręczny deploy (awaryjnie lub wariant build-on-VPS, ADR-009)

```bash
ssh portal-deploy@VPS
cd /opt/portal/repo && git fetch origin && git reset --hard origin/main   # lub tag
# bez GHCR (0 zł): build lokalny
docker compose -p portal --env-file /opt/portal/.env -f infra/docker-compose.yml build
docker compose -p portal --env-file /opt/portal/.env -f infra/docker-compose.yml run --rm migrate
docker compose -p portal --env-file /opt/portal/.env -f infra/docker-compose.yml up -d --remove-orphans
```

## Ręczny rollback

```bash
ssh portal-deploy@VPS
read -r WEB_IMAGE API_IMAGE < /opt/portal/last-good
export WEB_IMAGE API_IMAGE
docker compose -p portal --env-file /opt/portal/.env -f /opt/portal/repo/infra/docker-compose.yml up -d
```

Migracje projektujemy w trybie **expand/contract** (ADR-008) — poprzednia wersja aplikacji zawsze działa na nowym schemacie, więc rollback nie wymaga cofania migracji. Nigdy nie cofaj migracji na produkcji bez świeżego backupu.

## Diagnostyka po deployu

```bash
docker compose -p portal ps
docker compose -p portal logs api --since 10m
curl -fsS https://api.leadersofteams.pl/healthz
```

`/healthz` zwraca `{status, checks:{mysql,redis}}` — `503 degraded` wskazuje, która zależność leży.
