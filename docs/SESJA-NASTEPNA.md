# Portal LOT — następna sesja (jeden ekran)

## Stan (zmierzony 28.11 ~01:20 UTC)

- Prod: web i api `a6f6311` (`feat/v17-portal`). P0, P1 i układ 3440 dla wszystkich; `?wyglad=off` wraca do starego.
- Za opt-inem: reszta Rynku (`?wyglad=v17`) oraz P6+P5 (`?wyglad=v17p6`); jedno ciasteczko, wybór jednego wyłącza drugi.
- Powrót: `portal-web:przed-v17p6-2811`, `portal-api:przed-v17p6-2811`.

## Zadania w kolejności

Każdy ekran: mobile first (390), 1512 i **3440×1440** (Maciej 26.11) — zrzuty wszystkich trzech.

1. Maciej ogląda oba opt-iny na prodzie; po „tak” włączyć dla wszystkich (przedtem w 404/błędzie P6 usunąć przełącznik w przeglądarce).
2. Sporadyczny React #418 na `/oferty/[id]` — test zapisuje HTML i DOM sprzed hydracji przy następnym wystąpieniu.
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
