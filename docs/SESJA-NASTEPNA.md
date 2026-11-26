# Portal LOT — następna sesja (jeden ekran)

## Stan (zmierzony 26.11 ~11:55 UTC)

- Prod web+api z `feat/v17-portal` @ `4ce2eed` (kod aplikacji), healthz ok, worker alive. Rollback: `portal-web:przed-p1fix-2611`,
  `portal-api:przed-p1fix-2611` (migracji nie było).
- P0 ON dla wszystkich. **P1 „Rynek” KOD GOTOWY i wdrożony za opt-in** `?wyglad=v17` — nie pisać od nowa.
  `zgodnosc-makiety` runda 2: 4 ekrany ZGODNE poza 11 odstępstwami (tabela w `docs/PROGRAM-V17-PORTAL.md`, NIEZAAKCEPTOWANE).
- Ścieżka firmy przeszła na prodzie: kółka 44×44, „Wybierz wykonawcę” POST 200. W-06 naprawione. E2E 39/39, API 255/255.
- Zostały na prodzie po testach: 3 firmy „Test P1 (konto techniczne)”, 3 zlecenia CANCELLED, ukryte profile; konta zanonimizowane.

## Zadania w kolejności

1. **Odpowiedź Macieja na „Włączyć P1 dla wszystkich razem z 11 odstępstwami?”** — TAK: w `apps/web/lib/v17-routing.ts` trasy
   z `V17_P1_ROUTES` do `V17_ROUTES`, popraw `e2e/v17-routing.spec.ts` (i testy starego wyglądu tych tras), cytat w tabeli,
   bramki, rebuild web, pomiar. Odrzucone → najpierw poprawka do makiety.
2. **Braki V17 P0 → makieta → akceptacja → kod → dopiero usunięcie starych `/feed`, `/drabinka`, `/profil`.** Maciej 26.11:
   „Najpierw braki”. Braki: docenienie, zapisywanie, cytaty i zdjęcia we wpisach, podgląd offline, przełącznik motywu.
3. `/zlecenia/[id]` widok Lidera: `OfferForm` i `ReportButton` w starym stylu (P2). „Ostatnie światło”: tytuł ucięty bez „…”.
4. ADR-004 do rozstrzygnięcia z Maciejem: „Ostatnie światło” może pokazać „głos za odpowiedź +pkt”, a akapit i CLAUDE.md mówią
   tylko o ocenie albo uznanej odpowiedzi. Reguł punktowych nie ruszać bez rozmowy.
5. Ścieżka P0 jako zalogowany Lider na telefonie; miara Pierwszego Kręgu po 14 dniach; TBT sceny 3D na prawdziwym telefonie.

## Czeka na właściciela

- Decyzja P1 (punkt 1). D5 Search Console + Bing. 3–5 prawdziwych zleceń HydroSpark. D3 purge demo („nie teraz”).
- Gałęzie wchłonięte do zamknięcia: patrz `stan-galezi.sh`. Workflow `deploy-staging.yml` sprzeczny z „wdrożenia ręczne”.

## Czego nie robić

- Nie usuwaj starego wyglądu przed uzupełnieniem braków w V17. Nie dopisuj P1 do `V17_ROUTES` bez „tak”.
- Kodu V17 poza zaakceptowanymi makietami. Odstępstwo = wiersz w tabeli + zgoda Macieja.
- `loading.tsx` tylko obok page.tsx listy (grupa `(lista)`), nigdy nad `[id]`/`[slug]`/`[handle]`.
- Nie wdrażaj `main` wprost. Po scaleniu z worktree: `pnpm install --offline`.
- **Dysk 92 % (w trakcie budowy 95 %)** — przed budową `/root/scripts/worktree-kandydaci.sh --rozmiar`.

## Prompt startowy

Jesteś Liderem Portalu LOT (Opus, `/docker/portal-staging`, gałąź `feat/v17-portal`). Skill `portal-lider-dnia`, potem punkt 1
briefu: odpowiedź Macieja o włączeniu P1 „Rynek” (kod gotowy i wdrożony za opt-in, nie pisać od nowa).
