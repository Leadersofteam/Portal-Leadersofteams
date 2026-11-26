# Portal LOT — następna sesja (jeden ekran)

## Stan (zmierzony 26.11 ~20:35 UTC)

- Prod: web/api `55de3f0` z `feat/v17-portal`. Braki V17 + tło wdrożone; wpis z kompozytora widać w strumieniu (dowód w HANDOFF).
- P0 ON dla wszystkich, P1 „Rynek” za `?wyglad=v17`. Odstępstwa: P0 i P1 w tabeli programu mają status „czeka”.
- Bramki: lint/typy 0, API 256/256, e2e 43/43. Dysk ~91–94 %. Powrót: `portal-{web,api}:przed-braki-2611`.

## Zadania w kolejności

1. Odpowiedź Macieja na „Włączyć P1 dla wszystkich razem z 11 odstępstwami?” — TAK: trasy z `V17_P1_ROUTES` do `V17_ROUTES`
   (`apps/web/lib/v17-routing.ts`), `e2e/v17-routing.spec.ts` i testy starego wyglądu tych tras, cytat w tabeli, bramki,
   rebuild web, pomiar HTML. Odrzucone → najpierw poprawka makiety.
2. Limit API wspólny dla SSR (MINY 26.11): przekazać adres klienta albo zwolnić ruch wewnętrzny, z testem, bez osłabienia
   limitów logowania i rejestracji.
3. Po akceptacji odstępstw P0: usunąć stare `/feed`, `/drabinka`, `/profil`. `/wpisy/[id]`, wpis w grupie i uznana odpowiedź:
   makieta przed kodem.
4. P2 z sędziów: „Moja branża” bez profilu przepuszcza wszystko; ciche błędy akcji wpisu i wylogowania; `.akcja` 40 px na
   tablecie; hexy tła poza tokenami.
5. Drobne zastane: uszkodzony obraz → 500; `/zlecenia/[id]` `OfferForm`/`ReportButton` w starym stylu.

## Czeka na właściciela

- Punkt 1. Co z wpisami persony „Konrad Jaworowski” (i 4 innych kont wyprawy) w publicznym strumieniu: zostają czy ukryć.
- ADR-004 („głos za odpowiedź +pkt” w „Ostatnim świetle”). D5 Search Console + Bing. 3–5 zleceń HydroSpark. D3 purge demo.
- Workflow `deploy-staging.yml` sprzeczny z „wdrożenia ręczne”.

## Czego nie robić

- Nie dopisuj P1 do `V17_ROUTES` bez „tak”. Nie usuwaj starego wyglądu przed akceptacją. Nie wdrażaj `main` wprost.
- Reguł punktowych nie ruszać bez rozmowy. `loading.tsx` tylko obok page.tsx listy, nigdy nad `[id]`/`[slug]`/`[handle]`.
- e2e kasuje wspólną bazę dev — jeden przebieg; po nim `docker stop portal-dev-mysql-1`. Przed budową `free -m` i dysk.

## Prompt startowy

Jesteś Liderem dnia Portalu LOT (Opus, `/docker/portal-staging`, `feat/v17-portal`). Skill `portal-lider-dnia`; punkt 1 briefu:
odpowiedź na pytanie o P1 „Rynek”, potem wspólny limit API.
