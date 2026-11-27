# Portal LOT — następna sesja (jeden ekran)

## Stan (zmierzony 26.11 ~23:15 UTC)

- Prod: web `5a3a0e6`, api `55de3f0` (`feat/v17-portal`). P0 i P1 „Rynek” w V17 dla wszystkich; wyjście awaryjne `?wyglad=off`.
- Bramki: lint/typy 0, API 256/256, e2e 42/42. Powrót web: `portal-web:przed-og-2611`. API bez obrazu do powrotu.
- V17 ma 7 ekranów; reszta i landing w starym wyglądzie.

## Zadania w kolejności

Każdy ekran: mobile first (390), 1512 i **3440×1440** (Maciej 26.11) — zrzuty wszystkich trzech.

1. Makiety zaakceptowane 27.11 („Akceptuje obie”): reszta Rynku + 3440 (`claude/nifty-goldstine-496979` @ `781e52b`) oraz
   strona główna + logowanie i stany (`claude/loving-hellman-f538bb` @ `4df30bc`). Po zgodzie na scalenie: scal obie (każda
   scala się czysto, razem konflikt w `audyt/harness/v17-makiety-zrzuty.mjs` i `pro/README.md`), potem kod.
2. Kod: najpierw układ 3440 i strona główna + logowanie, potem reszta Rynku. Nowa paczka = osobna lista tras z opt-inem.
   Zastane z lektury kodu (sesja Rynek, nieodtworzone): „Edytuj” szkicu usługi → 404; ponowna publikacja po błędzie tworzy
   duplikat; „Zweryfikowana” przy samym NIP kontra „rejestru nie sprawdzamy”.
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
