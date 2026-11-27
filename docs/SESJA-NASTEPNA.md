# Portal LOT — następna sesja (jeden ekran)

## Stan (zmierzony 27.11 ~12:45 UTC)

- Prod: web `06773a8`, api `55de3f0` (`feat/v17-portal`). P0, P1 i układ 3440 (od 2400 px) na prodzie; `?wyglad=off` wraca do starego.
- Powrót web: `portal-web:przed-3440-2711`.
- Dwie sesje kodują: P6+P5 (`claude/ecstatic-golick-3715e4`, opt-in `?wyglad=v17p6`) i reszta Rynku
  (`claude/sharp-ptolemy-f7b31a`). Niescalone i niewdrożone.

## Zadania w kolejności

Każdy ekran: mobile first (390), 1512 i **3440×1440** (Maciej 26.11) — zrzuty wszystkich trzech.

1. Odebrać obie sesje z kodem (zrzuty 390/1512/3440, odstępstwa), potem pytanie o scalenie.
2. Wdrożenie za opt-in po „tak”; nowe ekrany potrzebują reguł 3440 (`.fm .wt .st .br-* .dwie-f .dl-*` z makiety `szerokie.css`).
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
