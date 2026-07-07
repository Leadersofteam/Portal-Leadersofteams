# Runbook: odtwarzanie z backupu (RPO ≤ 24 h, RTO ≤ 4 h)

Backupy: nocny dump MySQL → zewnętrzny storage (rclone, darmowy tier R2/B2) —
konfiguracja i rotacja w `infra/backup/README.md`.

## Pełne odtworzenie bazy produkcyjnej

1. Zatrzymaj aplikację (baza zostaje):
   `docker compose -p portal stop web api worker`
2. Pobierz wybrany dump:
   `rclone lsf r2:portal-backups/mysql/ | sort | tail` → `rclone copy r2:portal-backups/mysql/<PLIK> /tmp/`
3. Import:
   `gunzip -c /tmp/<PLIK> | docker compose -p portal exec -T mysql sh -c 'exec mysql -uportal -p"$MYSQL_PASSWORD" portal'`
4. Migracje do bieżącej wersji kodu (gdy dump starszy niż kod):
   `docker compose -p portal run --rm migrate`
5. Start i weryfikacja:
   `docker compose -p portal up -d` → `curl -fsS https://api.leadersofteams.pl/healthz`
6. Wpisz zdarzenie (data, użyty dump, czas trwania) na końcu tego pliku.

## Odtworzenie całego VPS (disaster recovery)

1. Nowy VPS: `infra/bootstrap.sh`, uzupełnij `/opt/portal/.env`, sklonuj repo do `/opt/portal/repo`.
2. `docker compose -p portal up -d mysql redis` → import dumpa (kroki 2–4 powyżej).
3. `docker compose -p portal up -d` → przepnij DNS.

## Test kwartalny

`RCLONE_REMOTE=... infra/backup/restore-test.sh` — wynik odnotuj poniżej.

## Dziennik odtworzeń / testów

| Data | Typ (test/incydent) | Dump | Czas | Wynik |
| ---- | ------------------- | ---- | ---- | ----- |
