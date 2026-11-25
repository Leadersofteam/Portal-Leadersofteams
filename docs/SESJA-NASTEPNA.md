# Portal LOT — następna sesja (jeden ekran)

## Stan (zmierzony 25.11 18:10 UTC)

- Prod web+api z `feat/v17-portal` @ `553487f`, layout `91ca8b8fbcf66cc5`, healthz ok (worker alive, uploads ok).
- P0 „Światło” ON dla wszystkich. **P1 „Rynek” na prodzie za opt-in** `?wyglad=v17`: `/zlecenia` bez flagi = stary wygląd,
  z flagą = P1; `/zlecenia/nieistniejace` = 404 (oba warianty). Zrzuty 390 z produ: `audyt/zrzuty/v17-p1-prod-*-390.png`.
- 8 ODSTĘPSTW P1 od makiety — tabela w `docs/PROGRAM-V17-PORTAL.md`, NIEZAAKCEPTOWANE. Pytanie do Macieja wysłane.
- Rollback: `portal-web:przed-p1-2511`, `portal-api:przed-p1-2511` (migracji nie było). Dysk 89 %.

## Zadania w kolejności

1. **Odpowiedź Macieja na „Włączyć P1 dla wszystkich razem z odstępstwami?”** — TAK: dopisz trasy P1 do `V17_ROUTES`
   w `apps/web/lib/v17-routing.ts` (usuń z `V17_P1_ROUTES`), popraw test, cytat do wiersza ODSTĘPSTW, rebuild web, pomiar.
   Odstępstwo odrzucone → poprawka kodu do makiety przed włączeniem.
2. Przejść na prodzie ścieżkę firmy z ofertami w P1 (`?wyglad=v17`): wybór kółkiem → „Wybierz wykonawcę” (POST niesprawdzony).
   Konto testowe posprzątać.
3. Przejść ścieżkę P0 jako zalogowany Lider (feed → profil → Drabinka) na telefonie; konto posprzątać.
4. Miara Pierwszego Kręgu po 14 dniach (≥ 5 z 20), etapy w `lejek-tworcow.csv`.
5. Scena 3D na telefonie: TBT `/` 394–1002 ms (CPU ×4) — pomiar na prawdziwym telefonie.

## Czeka na właściciela

- Decyzja P1 + odstępstwa (punkt 1). D5 Search Console + Bing. 3–5 prawdziwych zleceń HydroSpark. D3 purge demo („nie teraz”).
- Gałęzie do zamknięcia (wchłonięte): `claude/charming-mcclintock-043cc3`, `claude/dazzling-bose-0da725`,
  `claude/v17-p0-domkniecie-fd4ade`, `claude/v17-p1-makieta-f98340`, `claude/youthful-grothendieck-7ef708`,
  `docs/program-droga-lidera`, `feat/droga-lidera-pl0-pl1`, `feat/s12-widziec-i-reagowac`, `fix/ux-fala2-2110`, `fix/ux-szybkie-2110`.
- Workflow `.github/workflows/deploy-staging.yml` sprzeczny z „wdrożenia ręczne” — decyzja przed PR do main.

## Czego nie robić

- Nie dopisuj nowej paczki V17 do `V17_ROUTES` przed akceptacją na prodzie (P0 jest ON dla wszystkich → publiczne od razu).
- Kodu V17 poza zaakceptowanymi makietami. `pnpm lint` = eslint + lint-tokens. Odstępstwo = wiersz w tabeli + zgoda Macieja.
- `loading.tsx` tylko obok page.tsx listy (grupa `(lista)`), nigdy nad `[id]`/`[slug]`/`[handle]` (200 zamiast 404).
- Nie wdrażaj `main` wprost — `feat/v17-portal`. Mierz po `healthy` + 10 s.
- Po scaleniu z worktree: `pnpm install --offline` (symlink `node_modules`). Zrzuty do porównań z buildu, nie z `next dev`.
- `docker builder prune` tylko pod `vps-kolejka.sh budowa --`. Po budowie czytaj `po-budowie:`. Dysk 89 % — przed budową
  `/root/scripts/worktree-kandydaci.sh --rozmiar`.

## Prompt startowy

Jesteś Liderem Portalu LOT (Opus, `/docker/portal-staging`, gałąź `feat/v17-portal`). Skill `portal-lider-dnia`, potem punkt 1
briefu: odpowiedź Macieja o włączeniu P1 „Rynek” dla wszystkich (z 8 odstępstwami z `docs/PROGRAM-V17-PORTAL.md`).
