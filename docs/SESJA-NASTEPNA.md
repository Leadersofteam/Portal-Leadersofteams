# Portal LOT — następna sesja (jeden ekran)

> Stan zmierzony 21.10.2026 wieczór. Zacznij od tego pliku, nie od historii. Po sesji nadpisz go nowym stanem.

## Stan

- Produkcja: `0207887` na `feat/droga-lidera-pl0-pl1` (NIE `main`). healthz: mysql/redis ok, worker alive, uploads ok.
  Powrót: obrazy `portal-web:powrot-18789ae`, `portal-api:powrot-18789ae` (fala 1).
- 21.10 wdrożone fale UX 1+2 (szczegóły: baner `docs/HANDOFF-OPUS.md`). Gość: 0 błędów konsoli, 0 wywołań zewnętrznych.
- `origin/main` (PR #17 drabinka 3D, #19 logo, #21 CI) NIEWDROŻONY: inny schemat (main nie ma pól prod) + konflikt logo.
- Staging zatrzymany od 23.09. Analityka (Redis, 35 dni): dziura 30.09–14.10; 99,6% ruchu bezpośredni, 8 odsłon z Google w 20 dni.
- Dane testowe audytu 21.10 NIEPOSPRZĄTANE (odczyt prod-DB zablokowany): firma „Audyt UX Test Sp”, anulowane zlecenie
  `cmvhdtbu90008pm01hq6vyfmv` (otwiera się publicznie 200), zanonimizowany wiersz konta `audyt-ux-20261021@example.com`.

## Czeka na właściciela

1. Które logo zostaje (PR #19 czy obecne na prod) i czy schemat z prod ma trafić do `main` — odblokowuje wdrożenie `main`.
2. Workflow `.github/workflows/deploy-staging.yml` (push do main → SSH deploy) — sprzeczny z „wdrożenia ręczne”; decyzja.
3. Dane: duplikat „Macix”, zlecenie „Marketing” w złej branży, identyczne opinie u Konrada — demo czy realne? D3 purge demo.
4. 3 firmy + 2 Liderów do testów (`/root/docs/TESTERZY-I-SPOLECZNOSC.md`). D5 Search Console.

## Zadania w kolejności

1. Posprzątać dane testowe audytu 21.10 (lista w „Stan”) — konta testowe mają stałą zgodę; usuwać dzieci → rodzice.
2. Po decyzji 1: scalić `origin/main` do `feat/droga-lidera-pl0-pl1`, bramki, staging, prod (skill `portal-wdrozenie`).
3. Katalog nie może wyglądać na martwy: 5–10 prawdziwych profili/zleceń przed zaproszeniem testerów.
4. Dziura w analityce 30.09–14.10 — czy nie działał zapis, czy Portal.

## Zasady sesji

- Sesję otwieraj w `/docker/portal-staging`. Pamięć projektu: `~/.claude/projects/-docker-portal-staging/memory/`.
- Budowy na VPS przez `flock /root/.vps-build.lock …` (trzy repo budują na jednym serwerze).
- Typecheck pada na usuniętej stronie → `rm -rf apps/web/.next/types` (MINY 21.10).
