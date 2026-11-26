# Portal LOT — następna sesja (jeden ekran)

## Stan (zmierzony 26.11 ~23:15 UTC)

- Prod: web `5a3a0e6`, api `55de3f0` (`feat/v17-portal`). P0 i P1 „Rynek” w V17 dla wszystkich; wyjście awaryjne `?wyglad=off`.
- Bramki: lint/typy 0, API 256/256, e2e 42/42. Powrót web: `portal-web:przed-og-2611`. API bez obrazu do powrotu.
- V17 ma 7 ekranów; reszta i landing w starym wyglądzie.

## Zadania w kolejności

1. Maciej 26.11: cały Portal i landing w V17 PRO. Makieta reszty P1 (`/zlecenia/nowe`, `/uslugi/nowa`, edycja, strony branż,
   `/oferty/[id]`, `/zapytania/[id]`, `/porownanie/*`, `/firmy/[id]`, `/firma/nowa`, `/dla-firm`) → `recenzent-wygladu` →
   zrzuty 1512 + 390 → jedno pytanie. Nowa paczka = OSOBNA lista tras z opt-inem w `lib/v17-routing.ts`.
2. Makieta P6 landing (`/`, `/start`, regulamin, prywatność; scena 3D zostaje) i P5 (logowanie, rejestracja, stany). Dalej P2, P3, P4.
3. Limit API 300/min wspólny dla SSR (MINY 26.11). EACCES cache ISR hubów branż.
4. P2 z sędziów: „Moja branża” bez profilu przepuszcza wszystko; ciche błędy akcji wpisu i wylogowania; `.akcja` 40 px; hexy tła.
5. Stare widoki `/feed`, `/drabinka`, `/profil`, `/zlecenia`, `/uslugi` usuwać dopiero po akceptacji odstępstw P0.

## Czeka na właściciela

- Akceptacja 13 + 5 odstępstw P0 (wdrożone, w tabeli „czeka”). Wpisy persony „Konrad Jaworowski” w strumieniu: zostają czy ukryć.
- ADR-004 („Ostatnie światło”). D5 Search Console (po naprawie `noindex` warto zgłosić ponownie sitemapę). D3 purge demo.

## Czego nie robić

- Nie koduj ekranu bez zaakceptowanej makiety. Nie wdrażaj `main` wprost. Reguł punktowych nie ruszać bez rozmowy.
- `loading.tsx` tylko obok page.tsx listy, nigdy nad `[id]`/`[slug]`/`[handle]`.
- e2e kasuje wspólną bazę dev — jeden przebieg; po nim `docker stop portal-dev-mysql-1`.

## Prompt startowy

Jesteś Liderem dnia Portalu LOT (Opus, `/docker/portal-staging`, `feat/v17-portal`). Skill `portal-lider-dnia` i `portal-v17-design`;
punkt 1 briefu: makieta reszty P1, potem landing. Kod dopiero po mojej akceptacji.
