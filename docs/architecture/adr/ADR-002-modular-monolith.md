# ADR-002: Modular monolith zamiast mikroserwisów

**Status:** Zaakceptowany
**Data:** 2026-07-04

## Kontekst

Platforma łączy kilka wyraźnych domen: tożsamość, marketplace, społeczność (Q&A/mentoring), system punktowy (Drabinka), powiadomienia, integrację z app.leadersofteams.com. Skala docelowa: 10 000 aktywnych użytkowników na współdzielonym VPS, jeden zespół deweloperski. Brief pyta wprost (sekcja 7, pyt. 6): modular monolith czy wydzielone serwisy od początku?

## Decyzja

**Jeden deployowalny backend (modular monolith) z twardymi granicami modułów**, uruchamiany w dwóch rolach procesów: `api` (HTTP + WebSocket) i `worker` (BullMQ). Moduły:

```
modules/
├── identity        # konta, sesje, role, (faza 2: OIDC provider)
├── marketplace     # zlecenia, oferty, cykl życia, oceny
├── community       # wątki Q&A, odpowiedzi, głosy, akceptacje
├── ladder          # ledger punktowy, projekcja poziomów, definicje progów
├── antifraud       # sygnały, detekcja wzajemności, kolejka moderacyjna
├── notifications   # powiadomienia in-app, e-mail, push przez socket
└── integration     # webhooki i rekoncyliacja z app.leadersofteams.com
```

Reguły graniczne (egzekwowane, nie umowne):

1. **Moduł ma publiczne API** (`modules/<nazwa>/index.ts`) — import z wnętrza innego modułu jest zablokowany regułą ESLint `import/no-restricted-paths` (build failuje).
2. **Zapis do tabel innego modułu jest zakazany** — każdy moduł ma własny namespace tabel; odczyty cross-moduł tylko przez publiczne API modułu.
3. **Komunikacja asynchroniczna przez zdarzenia domenowe**: moduł zapisuje zdarzenie do tabeli `OutboxEvent` w tej samej transakcji co zmianę stanu; dispatcher (worker) publikuje je do BullMQ; moduły subskrybują. Przykład: `marketplace` emituje `order.review_submitted` → `ladder` konsumuje i dopisuje `PointEvent` → `ladder` emituje `ladder.level_achieved` → `notifications` i `integration` konsumują.
4. **Moduł `ladder` nie ma zależności od `identity`/`marketplace`/`community` poza ich zdarzeniami** — to gwarantuje, że logika punktowa jest audytowalna w jednym miejscu (istotne dla wymogu anty-MLM, ADR-004).

## Uzasadnienie

- **Mikroserwisy przy tej skali to przeinżynierowanie**: 10k użytkowników ≈ 200–500 równoczesnych sesji. Koszt mikroserwisów (sieć między serwisami, rozproszone transakcje, N pipeline'ów deploy, observability rozproszona) nie kupuje niczego na jednym VPS-ie, a spowalnia rozwój kilkukrotnie.
- **Monolit bez granic to dług nie do spłacenia** — stąd granice modułów twarde od dnia 1. Wzorzec outbox + zdarzenia sprawia, że wydzielenie modułu do osobnego serwisu (gdy kiedyś zajdzie potrzeba) to zmiana transportu zdarzeń (BullMQ → HTTP/kolejka zewnętrzna), nie przepisanie logiki.
- **Rozdział ról procesów api/worker od dnia 1** daje darmową ścieżkę skalowania: role skalują się niezależnie (więcej replik api przy ruchu, więcej workerów przy zaległościach kolejki) i awaria ciężkiego joba nie zabija obsługi HTTP.

## Konsekwencje

- (+) Jeden deploy, jedna baza, transakcje ACID tam, gdzie są potrzebne (np. zapis stanu + outbox atomowo).
- (+) Ścieżka ewolucji do serwisów bez big-bang rewrite.
- (−) Wymaga dyscypliny granic — mitygacja: lint w CI, code review z checklistą granic.
- (−) Wspólna baza = wspólny blast radius migracji — mitygacja: migracje Prisma jako gate w release (ADR-008).
