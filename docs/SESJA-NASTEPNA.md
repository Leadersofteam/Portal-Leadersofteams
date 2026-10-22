# Portal LOT — następna sesja (jeden ekran)

> Stan zmierzony 22.10.2026 ~18:50 UTC. Zacznij od tego pliku, nie od historii. Po sesji nadpisz go nowym stanem.

## Stan (zmierzony)

- Produkcja: `52ff25c` na `feat/droga-lidera-pl0-pl1` (wypchnięta). Gałąź zawiera CAŁY `origin/main` (dług 0 commitów):
  drabinka 3D (#17), logo-drabina (#19), CI (#21), sieć LOT (#22), render programowy (#23). healthz: mysql/redis ok,
  worker alive, uploads ok. Powrót: obrazy `portal-web:powrot-0207887`, `portal-api:powrot-0207887`.
- Logo: wzięte z `main` (PR #19, gradient „network violet” — og.tsx i ikony PWA już go miały). Odwracalne jednym commitem.
- Schemat: scalenie nie przyniosło migracji („No pending migrations”). `main` nadal NIE ma pól prod — PR gałęzi do `main` to naprawia.
- Bramki 22.10: 247 testów API (realny MySQL/Redis), 32 e2e, lint/typecheck/build zielone.
- Mobile 390 (harness mobile-craft, prod): poziomy scroll 0 na 9 trasach, pola < 16 px 0, `touch-action` ✓, 0 błędów konsoli.
- Dane testowe audytu 21.10 USUNIĘTE (zlecenie, firma, wiersz konta, 2 zdarzenia outbox; backup `portal-20261022-182553`).
- Staging zatrzymany (uruchamiany tylko na czas wdrożenia). Analityka: dziura 30.09–14.10 nadal niewyjaśniona.

## Czeka na właściciela

1. Otworzyć PR `feat/droga-lidera-pl0-pl1` → `main` (gałąź zawiera main; scalenie zrówna main z prod). Gałęzie do zamknięcia:
   `claude/focused-shirley-01366f` (poprawka już w gałęzi), `docs/program-droga-lidera` (wchłonięta).
2. Workflow `.github/workflows/deploy-staging.yml` (push do main → SSH deploy) — sprzeczny z „wdrożenia ręczne”; decyzja PRZED scaleniem PR.
3. Dane: duplikat „Macix”, zlecenie „Marketing” w złej branży, identyczne opinie u Konrada — demo czy realne? D3 purge demo.
4. 3 firmy + 2 Liderów do testów (`/root/docs/TESTERZY-I-SPOLECZNOSC.md`). D5 Search Console.

## Zadania w kolejności

1. `notFound()` pod `loading.tsx` zwraca 200 (`/zlecenia/<id>`, `/liderzy/<id>`, `/uslugi/<id>`) — MINY 22.10. Rozważyć
   przeniesienie `loading.tsx` do grup tras list (`(lista)/loading.tsx`), żeby szczegóły dawały prawdziwe 404.
2. Scena 3D na telefonie: TBT `/` 394–1002 ms w harnessie (CPU ×4). Zmierzyć na prawdziwym telefonie; ewentualnie scena tylko ≥ 900 px.
3. Katalog nie może wyglądać na martwy: 5–10 prawdziwych profili/zleceń przed zaproszeniem testerów.
4. Dziura w analityce 30.09–14.10 — czy nie działał zapis, czy Portal.

## Czego nie robić

- Nie wdrażaj `main` wprost — wdrażaj gałąź prod (lub `main` dopiero po scaleniu PR gałęzi prod).
- Nie zostawiaj stagingu uruchomionego po wdrożeniu (RAM). Budowy przez `flock /root/.vps-build.lock …`.
- Usunięcie danych sprawdzaj w API (404), nie w kodzie strony (200 przez streaming).

## Prompt startowy

Portal LOT, `/docker/portal-staging`, gałąź `feat/droga-lidera-pl0-pl1` (= prod `52ff25c`, zawiera main). Zacznij od punktu 1
„Zadań” (prawdziwe 404 na stronach szczegółów). Na koniec skill `portal-zamkniecie-sesji`.
