# Portal LOT — następna sesja (jeden ekran)

> Stan zmierzony 23.09.2026. Zacznij od tego pliku, nie od historii. Po sesji nadpisz go nowym stanem.
> Stare prompty startowe (`PROMPT-START-SESJI.md`, `PROMPT-STARTOWY-OPUS*.md`) są historyczne.

## Stan
- Produkcja: leadersofteams.pl → 200, 0,13 s (23.09). Gałąź robocza `feat/droga-lidera-pl0-pl1`, ostatni commit `4586bf2` (17.09).
- Program „Droga Lidera” PL0–PL5 wdrożony 05.09 (`docs/PROGRAM-DROGA-LIDERA.md`). Od tego czasu brak commitów funkcjonalnych.
- 17.09: bazy odchudzone (prod 256M, staging 64M, performance_schema OFF).
- Niezacommitowane: `docs/HANDOFF-OPUS.md` (zmiana z innej sesji; najpierw sprawdź, czyja).

- 23.09: staging ZATRZYMANY dla oszczędności RAM. Start: `cd infra && docker compose -p portal-staging -f docker-compose.staging.yml -f staging.override.yml start`.
- 23.09: worktree `/docker/portal-staging-build` usunięty. Kontenery prod mają jeszcze etykiety wskazujące tę ścieżkę. Następne wdrożenie prod rób z `infra/` w tym repo (`.env.prod` jest identyczny); wzorzec worktree z MINY nadal obowiązuje, gdy drzewo główne niesie niedokończony sprint.

## Czeka na właściciela
1. D3 — purge danych demo (`seed-demo.ts --purge`).
2. D5 — Search Console / Bing: zgłoszenie `sitemap.xml`.
3. PR `feat/droga-lidera-pl0-pl1` → `main` (otwiera właściciel).

## Zadania w kolejności
1. Pomiar lejka w `/panel/analityka`: ruch, źródła, pierwsze zlecenia od 05.09. Liczby zapisz tutaj.
2. Z pomiaru wybierz JEDNO wąskie gardło (dystrybucja albo pętla transakcji) i zrób plan sprintu.

## Zasady sesji
- Sesję otwieraj w `/docker/portal-staging`. Pamięć projektu: `~/.claude/projects/-docker-portal-staging/memory/`.
