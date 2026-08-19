---
name: portal-awaria
description: Wycofanie wdrożenia i odtworzenie bazy Portalu LoT po awarii — rollback obrazów Dockera bez cofania migracji (expand-only) i restore z kopii. Użyj, gdy produkcja po wdrożeniu nie działa, healthz świeci na czerwono albo trzeba wrócić do stanu sprzed zmiany.
---

# Awaria — niska swoboda, dokładne kroki

Skille tego repo prowadzą zmianę do przodu; ten prowadzi ją z powrotem.
Wykonuj sekwencje dokładnie.

## Najpierw: diagnoza (60 sekund)

```bash
curl -fsS https://api.leadersofteams.pl/healthz
# trzy niezależne sygnały: checks.mysql/redis, worker.alive, uploads
docker compose -p portal-prod ps
docker compose -p portal-prod logs api --since 10m | grep '"level":50' | tail -5
docker compose -p portal-prod logs worker --since 10m | tail -10
```

`worker.alive: false` przy kontenerze „Up" = martwa pętla, nie martwy proces —
restart samego workera zwykle wystarcza, bez pełnego rollbacku.

## Rollback KODU (obrazy)

Obrazy `portal-api:local` i `portal-web:local` są NADPISYWANE przy każdym buildzie.
Poprzednie wersje zostają jako nieotagowane sha — dopóki cron `docker-image-prune`
ich nie zabierze.

```bash
# 1. Znajdź poprzedni obraz (CreatedAt sprzed feralnego builda):
docker images --no-trunc --format '{{.ID}} {{.Repository}}:{{.Tag}} {{.CreatedAt}}' | head -8

# 2. Przypnij i podnieś:
docker tag <sha256-api>  portal-api:local
docker tag <sha256-web>  portal-web:local
cd /docker/portal-staging/infra
docker compose -p portal-prod --env-file .env.prod \
  -f docker-compose.yml -f prod.override.yml up -d
curl -fsS https://api.leadersofteams.pl/healthz
```

Gdy poprzedni obraz już nie istnieje — rebuild ze znanego dobrego commita
(`git stash` → `git checkout <dobry>` → build+up jak w `portal-wdrozenie` →
`git checkout -` → `git stash pop`).

**Migracji NIE cofasz.** Są expand-only (ADR-008) — poprzednia wersja aplikacji
ma działać na nowym schemacie. Jeśli nie działa, to nie jest expand-only i masz
większy problem: restore bazy, nie rollback schematu.

## Odtworzenie BAZY z kopii

Kopie: `/root/backups/portal/daily/` (cron 03:45, rotacja 7/4) + wolumen uploads.
⚠️ `infra/backup/README.md` opisuje INNY wariant (rclone) niż realnie zainstalowany
`/usr/local/bin/portal-backup.sh` — wierz skryptowi z `/usr/local/bin`.

```bash
# 0. ZANIM nadpiszesz — zrzut stanu bieżącego (nawet uszkodzonego):
bash /usr/local/bin/portal-backup.sh

# 1. Próba na bazie tymczasowej (produkcji nie dotykasz):
gunzip -c /root/backups/portal/daily/<plik>.sql.gz | \
  docker exec -i portal-prod-mysql-1 sh -c \
  'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS restore_drill" && \
   mysql -uroot -p"$MYSQL_ROOT_PASSWORD" restore_drill'
docker exec portal-prod-mysql-1 sh -c \
  'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" restore_drill -e "SHOW TABLES" | wc -l'
docker exec portal-prod-mysql-1 sh -c \
  'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE restore_drill"'

# 2. Dopiero gdy drill wygląda dobrze — realne odtworzenie do właściwej bazy
#    (nazwa bazy: $MYSQL_DATABASE z infra/.env.prod), potem:
docker compose -p portal-prod --env-file .env.prod \
  -f docker-compose.yml -f prod.override.yml run --rm migrate   # dociąga brakujące migracje
docker compose -p portal-prod restart api worker
```

## Po każdej awarii — obowiązkowo

1. Przejdź ścieżkę użytkownika na żywo (skill `portal-zrzuty`), nie tylko healthz.
2. Wpis w `docs/HANDOFF-OPUS.md`: objaw, przyczyna, co wycofano, skala.
3. Sprawdź `docker compose -p portal-prod logs worker | grep "bez konsumenta"` —
   po rollbacku starszy worker może nie znać nowych typów zdarzeń z outboxa.
