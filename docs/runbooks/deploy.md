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

> **Uwaga o nazwach projektów compose na TYM serwerze:** prod działa jako `portal-prod`
> (nie `portal`), staging jako `portal-staging`, oba z katalogu `/docker/portal-staging`
> z lokalnymi nakładkami `prod.override.yml` / `staging.override.yml` (Traefik siedzi na
> sieci `n8n_default`, resolver `mytlschallenge`). Polecenia niżej używają realnych nazw.

```bash
docker compose -p portal-prod ps
docker compose -p portal-prod logs api --since 10m
curl -fsS https://api.leadersofteams.pl/healthz
# Zdarzenie bez konsumenta = ktoś dodał typ zdarzenia i nie podpiął handlera:
docker compose -p portal-prod logs worker --since 10m | grep "bez konsumenta"
```

`/healthz` zwraca `{status, checks:{mysql,redis}, worker:{alive,lastBeatAt}}`.
`503 degraded` wskazuje, która zależność leży.

### Puls workera (S12)

`worker` nie ma portu HTTP, więc jego healthcheck czyta klucz `portal:worker:heartbeat`
w Redisie. Klucz jest odnawiany co 15 s **tylko wtedy, gdy obraca się pętla dispatchera**
(TTL 60 s) — dzięki temu wykrywa nie tylko martwy proces, ale i zakleszczony, czyli ten
przypadek, w którym `docker ps` pokazuje „Up", a wpisy nie pojawiają się w feedzie,
powiadomienia nie przychodzą i punkty nie dojrzewają.

```bash
docker exec portal-prod-redis-1 redis-cli ttl portal:worker:heartbeat   # -2 = worker nie pracuje
docker inspect portal-prod-worker-1 --format '{{.State.Health.Status}}'
```

Kontener przechodzi w `unhealthy` po ok. 2,5 min ciszy (TTL 60 s + 3 × interval 30 s).

### Nadanie roli MODERATOR / ADMIN

⚠️ **Rola jest zamrożona w migawce sesji w Redisie, nie czytana z bazy przy każdym żądaniu.**
Sam `UPDATE` NIE WYSTARCZY — osoba musi się **wylogować i zalogować ponownie**, inaczej
dalej dostaje 403 na `/panel/moderacja` i `/panel/analityka`.

```bash
docker compose -p portal-prod exec mysql \
  mysql -uportal -p"$MYSQL_PASSWORD" portal \
  -e "UPDATE users SET role='MODERATOR' WHERE email='osoba@example.com'"
# → powiedz tej osobie, żeby się przelogowała
```

### Bramka anty-bot (S12)

Rejestracja wymaga rozwiązania zagadki proof-of-work liczonej na naszym Redisie —
bez Cloudflare i bez żadnego klucza. Jeśli ktoś zgłasza, że **nie może założyć konta**:

```bash
# Czy bramka w ogóle jest włączona (powinna być):
docker compose -p portal-prod exec api node -e "console.log(process.env.HUMANCHECK ?? '(domyślnie on)')"
# Powody odmów z ostatniej godziny — pokazuje, KTÓRA warstwa odrzuca:
docker compose -p portal-prod logs api --since 1h | grep humancheck.rejected
```

Znaczenie powodów: `MISSING` — front nie dołączył rozwiązania (błąd JS albo bot);
`UNKNOWN_OR_USED` — wyzwanie wygasło (>15 min) albo ktoś próbuje powtórki;
`WRONG_NUMBER` — złe rozwiązanie; `TOO_FAST` — formularz wysłany szybciej niż w 2 s;
`HONEYPOT` — wypełnione ukryte pole `nazwaFirmy`, czyli automat.

⚠️ **`HUMANCHECK=off` to wyłącznik awaryjny na czas diagnozy, nie ustawienie docelowe.**
Zostawiony na produkcji otwiera rejestrację dla botów.

### Uploady plików (awarie 500 przy wgrywaniu zdjęć)

`/healthz` zwraca pole `uploads`. `"fail"` oznacza, że proces api NIE MOŻE pisać
do wolumenu — wtedy każdy upload kończy się 500, a reszta Portalu działa normalnie.

Najczęstsza przyczyna (zdarzyła się na produkcji 13.08): podkatalog miesięczny
w wolumenie należy do `root`, a api działa jako `node`.

```bash
docker exec portal-prod-api-1 sh -c 'id; ls -ld /app/uploads /app/uploads/*'
# naprawa:
docker exec -u root portal-prod-api-1 chown -R node:node /app/uploads
```

Po naprawie `uploads` w `/healthz` wraca na `"ok"` bez restartu kontenera.

### Dane demo na produkcji (S16)

Produkcja ma dane przykładowe — DECYZJA WŁAŚCICIELA z 13.08 (ryzyko R-16 w `RISKS.md`).
Markery w bazie: konta w domenie `@demo.leadersofteams.pl`, firmy z `nip = 'DEMO-SEED'`.

`tsx` NIE MA w obrazie produkcyjnym (to `pnpm --prod deploy`), więc seed uruchamiamy
z repozytorium na hoście, celując w IP kontenera bazy:

```bash
cd /docker/portal-staging/apps/api
MYSQL_PW=$(grep '^MYSQL_PASSWORD=' ../../infra/.env.prod | cut -d= -f2-)
IP=$(docker inspect portal-prod-mysql-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' | awk '{print $1}')
VOL=$(docker volume inspect portal-prod_portal_uploads --format '{{.Mountpoint}}')

NODE_ENV=production SEED_DEMO=1 SEED_DEMO_ALLOW_PRODUCTION=1   DATABASE_URL="mysql://portal:${MYSQL_PW}@${IP}:3306/portal" UPLOADS_DIR="$VOL"   pnpm exec tsx prisma/seed-demo.ts

# ⚠️ OBOWIĄZKOWO PO SEEDZIE: pliki zapisane z hosta są root-owned, a api działa
# jako `node` → każdy późniejszy upload kończyłby się 500 (EACCES).
docker exec -u root portal-prod-api-1 chown -R node:node /app/uploads
curl -fsS https://api.leadersofteams.pl/healthz   # uploads musi być "ok"
```

Zdjęcie KOMPLETU danych demo jedną komendą (bez `NODE_ENV`, bo `--purge` tylko kasuje):

```bash
SEED_DEMO=1 DATABASE_URL="mysql://portal:${MYSQL_PW}@${IP}:3306/portal"   pnpm exec tsx prisma/seed-demo.ts --purge
```

Dwie flagi (`SEED_DEMO` + `SEED_DEMO_ALLOW_PRODUCTION`) są celowe: zasianie produkcji
nigdy nie ma się zdarzyć przypadkiem.

### Analityka (S12)

```bash
docker exec portal-prod-redis-1 redis-cli hgetall "portal:analytics:v1:views:$(date -u +%F)"
```

Klucze muszą być znormalizowane (`/wpisy/:id`, `/inne`) — **surowy identyfikator w kluczu
oznacza dziurę w białej liście** w `apps/api/src/shared/analytics.ts` i ryzyko rozdęcia
pamięci Redisa przez skanery. Liczby są poglądowe: filtr botów opiera się na User-Agencie,
a endpoint `/analytics/hit` jest publiczny (świadomie — patrz komentarz w `analytics/routes.ts`).
