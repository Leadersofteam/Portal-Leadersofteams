---
name: portal-wdrozenie
description: Ręczne wdrożenie Portalu LoT na staging i produkcję — build obrazów, migracje za profilem tools, backup przed migracją, kontrola po deployu. Użyj przy każdym wdrożeniu, gdy użytkownik mówi „wdróż", „deploy", „wypuść na produkcję", albo gdy trzeba zdiagnozować stan po wdrożeniu.
---

# Wdrożenie — ręczne, nigdy CI

Właściciel ma **twardą zasadę: żadnego auto-deployu z GitHuba**. Wdrażamy z VPS, z katalogu
`/docker/portal-staging`, który jest jednocześnie repozytorium i źródłem obu środowisk.

## Nazwy, które NIE są oczywiste

| Środowisko | Projekt compose                   | Pliki                                                 |
| ---------- | --------------------------------- | ----------------------------------------------------- |
| staging    | `portal-staging`                  | `docker-compose.staging.yml` + `staging.override.yml` |
| produkcja  | **`portal-prod`** (nie `portal`!) | `docker-compose.yml` + `prod.override.yml`            |

Nakładki `*.override.yml` są **lokalne, niecommitowane** — Traefik siedzi na sieci
`n8n_default` z resolverem `mytlschallenge`.

⚠️ **Nazwa `api` jest DWUZNACZNA na tym serwerze.** Staging i prod dzielą `n8n_default`,
a compose nadaje alias równy nazwie usługi — przez co staging-web rozwiązywał `api` na
kontener PRODUKCYJNY i pokazywał dane produkcji. Staging używa dziś aliasu `api-staging`.
Dokładając usługę widoczną z obu projektów, nadaj jej alias unikalny w skali serwera.

## Staging

```bash
cd /docker/portal-staging/infra
docker compose -p portal-staging --env-file .env \
  -f docker-compose.staging.yml -f staging.override.yml build
docker compose -p portal-staging --env-file .env \
  -f docker-compose.staging.yml -f staging.override.yml run --rm migrate
docker compose -p portal-staging --env-file .env \
  -f docker-compose.staging.yml -f staging.override.yml up -d
docker compose -p portal-staging ps
```

## Produkcja

**Backup PRZED migracją** — zawsze, bez wyjątków:

```bash
bash /usr/local/bin/portal-backup.sh
ls -t /root/backups/portal/daily/*.sql.gz | head -1
```

```bash
cd /docker/portal-staging/infra
docker compose -p portal-prod --env-file .env.prod \
  -f docker-compose.yml -f prod.override.yml build
docker compose -p portal-prod --env-file .env.prod \
  -f docker-compose.yml -f prod.override.yml run --rm migrate
docker compose -p portal-prod --env-file .env.prod \
  -f docker-compose.yml -f prod.override.yml up -d
```

⚠️ Krok `run --rm migrate` jest **obowiązkowy i osobny** — usługa stoi za `profiles: [tools]`
i NIE startuje sama. Objaw pominięcia: błędy `P2022 column does not exist` w logach api.

## Kontrola po deployu — trzy rzeczy

```bash
curl -fsS https://api.leadersofteams.pl/healthz
```

Odpowiedź niesie trzy niezależne sygnały:

- `checks.mysql/redis` — decydują o kodzie 200/503,
- `worker.alive` — **puls workera**. `false` znaczy, że wpisy nie pojawią się w feedzie,
  powiadomienia nie przyjdą i punkty nie dojrzeją, mimo że `docker ps` pokazuje „Up",
- `uploads` — zapisywalność wolumenu. `fail` = każde wgranie zdjęcia zwróci 500.

```bash
docker compose -p portal-prod logs worker --since 5m | grep "bez konsumenta"
docker compose -p portal-prod logs api --since 10m | grep '"level":50'
```

`bez konsumenta` oznacza, że ktoś dodał typ zdarzenia i nie podpiął handlera.

## Zmiany wymagające REBUILDU, nie restartu

`next.config.ts` **oraz `API_INTERNAL_URL`** są zapiekane w buildzie (cel rewrite'u `/api/*`
siedzi w `routes-manifest.json`). Sam restart z nowym env poprawi wyłącznie SSR — ruch
z komponentów klienckich nadal pójdzie pod stary adres. To samo dotyczy każdej zmiennej
`NEXT_PUBLIC_*`.

## Po każdym zapisie do wolumenu uploadów spoza kontenera

```bash
docker exec -u root portal-prod-api-1 chown -R node:node /app/uploads
```

Pliki zapisane z hosta należą do `root`, a api działa jako `node` → EACCES i 500 przy
każdym późniejszym uploadzie. Kontrola: pole `uploads` w `/healthz`.

## Rollback

Migracje są **expand-only** (ADR-008), więc poprzednia wersja aplikacji działa na nowym
schemacie — rollback NIE wymaga cofania migracji. Wystarczy wdrożyć poprzedni obraz.
Nigdy nie cofaj migracji na produkcji bez świeżego backupu.
