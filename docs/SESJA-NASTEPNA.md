# Portal LOT — następna sesja (jeden ekran)

## Stan (zmierzony 25.11)

- Prod web = `b871406` (gałąź `feat/v17-portal`, wypchnięta; brak z main: 0). API/worker bez zmian od 22.10. `healthz` ok.
- Martwe linki szczegółów → 404 (naprawiony zastany błąd `loading.tsx`). Na żywo: blok „Pierwszy szczebel” (landing, `/start`, `/panel/punkty`).
- Strategia pozyskania liderów: `docs/STRATEGIA-LIDERZY-PL.md` (realni: 2, Google: 0).
- V17 „Światło”: po „AI loop” i 3 rundach jakości — zaakceptowane 25.11 (`claude/charming-mcclintock-043cc3` @ `8a4a602`). Kodu V17 brak.

## Zadania w kolejności

1. V17 „Światło” **ZAAKCEPTOWANE 25.11** („Akceptuję Światło”, makieta @ `8a4a602`). Kod P0 (`/feed`, `/profil/[handle]`,
   `/drabinka`) za `data-wyglad="v17"` — sesja Sonnet wg briefu z karty „V17 P0 Światło: kod…”; Lider weryfikuje zrzutami
   (`zgodnosc-makiety` ZGODNY), bramki, wdrożenie z flagą wyłączoną, włączenie flagi tylko za zgodą Macieja.
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

- Kodu V17 przed wpisem akceptacji Macieja. Nie przenosić `loading.tsx` nad `[id]`/`[slug]` (MINY: 200 zamiast 404).
- Nie wdrażaj `main` wprost — wdrażaj `feat/v17-portal`. Po wdrożeniu staging wyłączony (RAM).
- **Po każdej budowie sprzątaj (VPS 22.11):** czytaj linie `po-budowie:`; kontenery próbne `docker rm -fv`; `docker builder prune`
  tylko pod `vps-kolejka.sh budowa --` (najpierw `--max-used-space 4GB`). Typecheck/testy → `lekkie`, zrzuty → `zrzuty`.
- Po przeniesieniu tras usuń `apps/web/.next/types` przed typecheckiem (stare typy wskazują nieistniejące `page.js`).
- Usunięcie danych sprawdzaj w API (404), nie w kodzie strony.

## Prompt startowy

Repo `/docker/portal-staging`, gałąź `feat/v17-portal`. Cel: kod P0 zaakceptowanej makiety „Światło” za flagą data-wyglad="v17" → zgodność z makietą → wdrożenie z flagą wyłączoną.
Zacznij od punktu 1 „Zadań”; zrzuty i diagnoza są na gałęzi `claude/charming-mcclintock-043cc3`.
