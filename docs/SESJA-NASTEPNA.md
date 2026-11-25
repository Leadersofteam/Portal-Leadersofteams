# Portal LOT — następna sesja (jeden ekran)

## Stan (zmierzony 25.11)

- Prod api+worker+web = `d8c6834` (25.11 ~14:23 UTC, gałąź `feat/v17-portal`). V17 P0 „Światło” (`/feed`, `/profil/[handle]`, `/drabinka`)
  za flagą: domyślnie OFF, podgląd `?wyglad=v17` (ciasteczko `lot_wyglad`), `?wyglad=off` zdejmuje. Publiczne punkty po wagach:
  `GET /api/v1/profiles/:handle/ladder-events` (tylko przyznane/dojrzewające). `healthz` ok, 0 błędów w logach.
- Martwe linki szczegółów → 404 (naprawiony zastany błąd `loading.tsx`). Na żywo: blok „Pierwszy szczebel” (landing, `/start`, `/panel/punkty`).
- Strategia pozyskania liderów: `docs/STRATEGIA-LIDERZY-PL.md` (realni: 2, Google: 0).
- V17 „Światło”: po „AI loop” i 3 rundach jakości — zaakceptowane 25.11 (`claude/charming-mcclintock-043cc3` @ `8a4a602`). Kodu V17 brak.

## Zadania w kolejności

1. V17 P0 na prodzie za flagą — przed włączeniem dla wszystkich: (a) profil powtarza długie bio w lewej kolumnie i w „O mnie”
   (zmierzone na `/profil/konrad-jaworowski`) — w lewej kolumnie 1–2 linie; (b) `zgodnosc-makiety` profilu po poprawce kreski
   (3 z 4 par) i Drabinki 390 ciemny; (c) zrzuty stanów po zmianie punktów; (d) linki „Wszystkie N” bez stron docelowych.
   Potem zgoda Macieja na flagę ON. Następna paczka V17: P1 rynek (`/zlecenia`, `/uslugi`) — makieta → akceptacja → kod.
2. Szkice wiadomości „Pierwszy Krąg” (20 osób z `/docker/leaders-of-teams-app/docs/strategia/lejek-tworcow.csv`) — wysyła Maciej.
3. Scena 3D na telefonie: TBT `/` 394–1002 ms (CPU ×4) — pomiar na prawdziwym telefonie; ewentualnie scena tylko ≥ 900 px.
4. Dziura w analityce 30.09–14.10 — czy nie działał zapis, czy Portal.

## Czeka na właściciela

- Zgoda na włączenie flagi V17 dla wszystkich (po wdrożeniu kodu P0).
- D5 Search Console + Bing (DNS, sitemap) — 10 min. 3–5 prawdziwych zleceń HydroSpark. D3 purge demo (25.11: „nie teraz”).
- Workflow `.github/workflows/deploy-staging.yml` sprzeczny z „wdrożenia ręczne” — decyzja przed PR do main.
- Gałęzie do zamknięcia (wchłonięte): `claude/dazzling-bose-0da725`, `docs/program-droga-lidera`, `feat/droga-lidera-pl0-pl1`,
  `feat/s12-widziec-i-reagowac`, `fix/ux-fala2-2110`, `fix/ux-szybkie-2110`. Wstrzymana: `claude/agitated-rubin-da3bd4` (rama App).

## Czego nie robić

- Kodu V17 przed wpisem akceptacji Macieja. `pnpm lint` = eslint + lint-tokens (sesja P0 puściła sam eslint — 42 kolory). Nie przenosić `loading.tsx` nad `[id]`/`[slug]` (MINY: 200 zamiast 404).
- Nie wdrażaj `main` wprost — wdrażaj `feat/v17-portal`. Po wdrożeniu staging wyłączony (RAM).
- **Po każdej budowie sprzątaj (VPS 22.11):** czytaj linie `po-budowie:`; kontenery próbne `docker rm -fv`; `docker builder prune`
  tylko pod `vps-kolejka.sh budowa --` (najpierw `--max-used-space 4GB`). Typecheck/testy → `lekkie`, zrzuty → `zrzuty`.
- Po przeniesieniu tras usuń `apps/web/.next/types` przed typecheckiem (stare typy wskazują nieistniejące `page.js`).
- Usunięcie danych sprawdzaj w API (404), nie w kodzie strony.

## Prompt startowy

Repo `/docker/portal-staging`, gałąź `feat/v17-portal`. Cel: domknąć P0 „Światło” (bio, zgodność profilu) → zgoda na flagę ON → makieta P1 rynek.
Zacznij od punktu 1 „Zadań”; podgląd V17 na prodzie: `https://leadersofteams.pl/drabinka?wyglad=v17`.
