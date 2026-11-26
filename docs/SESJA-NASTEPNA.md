# Portal LOT — następna sesja (jeden ekran)

## Stan (zmierzony 26.11 ~19:50 UTC)

- Prod healthz ok, worker alive; web/api z `feat/v17-portal` (kod `4ce2eed`). P0 ON dla wszystkich, P1 „Rynek” za `?wyglad=v17`.
- **Na prodzie nadal błąd: strumień V17 nie pokazuje wpisów.** Poprawka gotowa na `claude/intelligent-leakey-584d2c`
  (kod do `b2c3158` + dokumenty), wypchnięta, NIESCALONA, NIEWDROŻONA; scala się bez konfliktów, brak z main 0.
- Bramki gałęzi: lint/typy 0, API 256/256, e2e 43/43, build ok. Migracji brak. 13 odstępstw P0 + 11 P1 „czeka”.
- `portal-dev-mysql-1` zatrzymany (baza dev świeża: migrate + seed). Dysk 89 %.

## Zadania w kolejności

1. Scal `refs/heads/claude/intelligent-leakey-584d2c` do `feat/v17-portal`, `pnpm install --offline`, push. Potem agenci
   `zgodnosc-makiety` (dane, pisanie, więcej, pusty, offline; 1512/390 × 2 motywy) i `recenzent-wygladu`. P1 z sędziów → poprawka.
2. Pokaż Maciejowi zrzuty (1512 jasny + 390) i jedno pytanie: **„Wdrożyć braki i tło na prod razem z 13 odstępstwami P0?”**
   (P0 jest publiczne, więc rebuild publikuje je od razu). TAK → `portal-wdrozenie` (web + api, backup, bez migracji), potem
   pomiar na prodzie: wpis z kompozytora konta testowego widać w strumieniu; konto posprzątać.
3. Decyzja P1: „Włączyć P1 dla wszystkich razem z 11 odstępstwami?” — TAK: trasy z `V17_P1_ROUTES` do `V17_ROUTES`,
   `e2e/v17-routing.spec.ts` i testy starego wyglądu tych tras, cytat w tabeli, bramki, rebuild web.
4. Po wdrożeniu i akceptacji: usunąć stare `/feed`, `/drabinka`, `/profil` (osobny krok). `/wpisy/[id]` jest w starym stylu;
   wpis w grupie i uznana odpowiedź nie mają formy w V17 — makieta przed kodem.
5. Drobne zastane: uszkodzony obraz → 500; `/zlecenia/[id]` `OfferForm`/`ReportButton` w starym stylu; „Ostatnie światło” bez „…”.

## Czeka na właściciela

- Punkty 2 i 3. ADR-004: „Ostatnie światło” pokazuje „głos za odpowiedź +pkt”, a zasada mówi o ocenie lub uznanej odpowiedzi.
- D5 Search Console + Bing. 3–5 prawdziwych zleceń HydroSpark. D3 purge demo („nie teraz”). Na prodzie zostały 3 firmy
  „Test P1 (konto techniczne)” i 3 zlecenia CANCELLED. Workflow `deploy-staging.yml` sprzeczny z „wdrożenia ręczne”.

## Czego nie robić

- Nie pisz od nowa P1 ani braków P0 — są gotowe. Nie usuwaj starego wyglądu przed wdrożeniem braków i akceptacją.
- Nie dopisuj P1 do `V17_ROUTES` bez „tak”. Nie wdrażaj `main` wprost. Reguł punktowych nie ruszać bez rozmowy.
- `loading.tsx` tylko obok page.tsx listy, nigdy nad `[id]`/`[slug]`/`[handle]`.
- e2e kasuje wspólną bazę dev — jeden przebieg na raz. Przed budową `free -m` i dysk.

## Prompt startowy

Jesteś Liderem dnia Portalu LOT (Opus, `/docker/portal-staging`, `feat/v17-portal`). Skill `portal-lider-dnia`; punkt 1 briefu:
scal gałąź z brakami V17 i oceń ją sędziami, potem jedno pytanie do Macieja o wdrożenie.
