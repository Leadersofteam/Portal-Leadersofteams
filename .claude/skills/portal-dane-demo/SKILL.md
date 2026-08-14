---
name: portal-dane-demo
description: Zasianie i zdjęcie danych przykładowych w Portalu LoT (firmy, Liderzy, zlecenia, usługi, wpisy, dyskusje, tematy) na stagingu i produkcji. Użyj, gdy trzeba wypełnić pusty portal treścią, przesiać dane po zmianie w seedzie, albo usunąć demo przed wpuszczeniem realnych ludzi.
---

# Dane demo — zasianie i zdjęcie jedną komendą

Produkcja ma dane przykładowe **decyzją właściciela z 2026-08-13**, mimo zgłoszonego ryzyka
(fikcyjni Liderzy z punktami vs obietnica ADR-004 — ryzyko **R-16** w `docs/RISKS.md`).
Dlatego istnieje `--purge`: decyzja ma pozostać odwracalna w sekundę.

## Markery w bazie

- konta: domena `@demo.leadersofteams.pl`, hasło `demo-portal-2026`
- firmy: `nip = 'DEMO-SEED'`

Po tych markerach idzie zarówno sprzątanie przed ponownym zasianiem, jak i `--purge`.

## `tsx` NIE ma w obrazie produkcyjnym

Obraz to `pnpm --prod deploy`, więc seed uruchamiamy **z repo na hoście**, celując w IP
kontenera bazy.

```bash
cd /docker/portal-staging/apps/api
MYSQL_PW=$(grep '^MYSQL_PASSWORD=' ../../infra/.env.prod | cut -d= -f2-)
IP=$(docker inspect portal-prod-mysql-1 \
  --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' | awk '{print $1}')
VOL=$(docker volume inspect portal-prod_portal_uploads --format '{{.Mountpoint}}')

NODE_ENV=production SEED_DEMO=1 SEED_DEMO_ALLOW_PRODUCTION=1 \
  DATABASE_URL="mysql://portal:${MYSQL_PW}@${IP}:3306/portal" UPLOADS_DIR="$VOL" \
  pnpm exec tsx prisma/seed-demo.ts
```

⚠️ **OBOWIĄZKOWO PO SEEDZIE** — pliki zapisane z hosta należą do `root`, a api działa jako
`node`, więc bez tego każdy późniejszy upload zwróci 500:

```bash
docker exec -u root portal-prod-api-1 chown -R node:node /app/uploads
curl -fsS https://api.leadersofteams.pl/healthz   # pole `uploads` musi być "ok"
```

Na stagingu identycznie, tylko `.env`, `portal-staging-mysql-1`,
`portal-staging_portal_staging_uploads` i **bez** `NODE_ENV`/`SEED_DEMO_ALLOW_PRODUCTION`.

## Zdjęcie kompletu

```bash
SEED_DEMO=1 DATABASE_URL="mysql://portal:${MYSQL_PW}@${IP}:3306/portal" \
  pnpm exec tsx prisma/seed-demo.ts --purge
```

Kasuje konta, firmy, zlecenia, oferty, oceny, wątki, usługi, wpisy, komentarze, reakcje,
obserwowania, posty w grupach, powiadomienia, oś aktywności i zdarzenia outbox.

## Dwie flagi to nie przypadek

`SEED_DEMO=1` **i** `SEED_DEMO_ALLOW_PRODUCTION=1` — zasianie produkcji nigdy nie ma się
zdarzyć przy okazji innej komendy. Sam `NODE_ENV=production` bez drugiej flagi kończy się
jawną odmową.

## Zasada przy rozbudowie seeda

**Przechodzimy prawdziwą ścieżką kodu, nie wpisujemy stanu ręcznie:**

- punkty nalicza prawdziwy serwis `ladder` (żadnego `pointEvent.create` z ręki),
- obrazy idą przez `filesService.store()` (ta sama konwersja webp i wycinanie EXIF
  co przy realnym uploadzie),
- oś aktywności i tematy buduje `socialService.onSocialPostPublished` / `onPostPublished` —
  **ten sam konsument, którego wywołuje worker**.

Wpisanie `ActivityItem` wprost byłoby szybsze, ale omijałoby logikę projekcji i ukryło jej
awarie — a to jest kod, na którym stoi cały feed.

Dane mają wyglądać jak realna praca: graf obserwowania **nierównomierny**, część wpisów
**bez** reakcji, treści rozłożone w czasie. Feed, w którym każdy wpis ma komplet interakcji,
wygląda nieprawdziwie — a przy pełnym grafie zakładki „Obserwowani" i „Cała społeczność"
byłyby identyczne.

## Kiedy wrócić do decyzji

**Przed zaproszeniem pierwszych realnych Liderów.** Realny Lider obok fikcyjnego z punktami
to dokładnie sytuacja, o którą chodzi w R-16.
