# ADR-007: Strategia cache, zadań w tle i ruchu czasu rzeczywistego

**Status:** Zaakceptowany
**Data:** 2026-07-04

## Kontekst

Współdzielony VPS (ADR-005) wymusza oszczędne gospodarowanie CPU/IO. Profil ruchu: dominują odczyty publiczne (listingi zleceń, profile, wątki Q&A); zapisy są rzadkie i tolerują asynchroniczność (punkty, powiadomienia, webhooki). Brief pyta (sekcja 7, pyt. 6) o cache, kolejki i WebSockets vs polling.

## Decyzja 1: Cache — trzy poziomy

| Poziom | Mechanizm | Co | TTL / inwalidacja |
|---|---|---|---|
| 1. HTTP/SSR | Next.js ISR (`revalidate`) dla stron publicznych | strona główna, listingi, profile publiczne, wątki Q&A dla niezalogowanych | 60–300 s + `revalidateTag` po mutacji |
| 2. Aplikacyjny | Redis cache-aside w API | wyniki drogich zapytań: listingi z filtrami, agregaty profilu (średnia ocen, liczba zleceń), stan Drabinki, definicje poziomów | TTL 60 s–1 h + **inwalidacja zdarzeniowa**: konsument zdarzeń domenowych (outbox) usuwa klucze po wzorcu (`order:*`, `profile:{id}:*`) |
| 3. Baza | poprawne indeksy > cache | wszystko | patrz DATA-MODEL.md |

Zasady: cache'ujemy tylko dane odtwarzalne z MySQL; klucze z prefiksem wersji schematu (`v1:`); stampede protection przez krótkie locki Redis (`SET NX PX`) przy regeneracji drogich kluczy. **Ledger punktowy i saldo do awansu nigdy nie są serwowane z przeterminowanego cache** na ekranie "Moje punkty" (wymóg transparentności z ADR-004) — tam odczyt z bazy, cache tylko mikroskalowy (≤ 5 s).

## Decyzja 2: Zadania w tle — BullMQ na Redis + wzorzec outbox

Wszystkie skutki uboczne mutacji przechodzą przez: **transakcja MySQL (zmiana stanu + wpis `OutboxEvent`) → dispatcher (worker, polling co 1 s, batch) → kolejki BullMQ → konsumenci**. Gwarancja at-least-once + idempotentni konsumenci (klucz idempotencji = id zdarzenia outbox).

Kolejki (osobne, z priorytetami i limitami współbieżności):

- `ladder` — naliczanie `PointEvent`, przeliczanie projekcji `LadderState`, detekcja awansu; sekwencyjność per użytkownik (BullMQ group/lock po `userId`), żeby projekcja nigdy nie liczyła się współbieżnie dla tej samej osoby.
- `antifraud` — analiza grafu wzajemności (job okresowy co godzinę + trigger po zdarzeniu), flagowanie.
- `notifications` — fan-out powiadomień in-app + e-mail (szablony, throttling per użytkownik, digest zamiast spamu).
- `integration` — webhooki do app.leadersofteams.com (retry z backoffem wykładniczym do 24 h, potem DLQ + alert).
- `maintenance` — rekoncyliacje, czyszczenie, agregaty nocne.

Retry: domyślnie 5 prób z backoffem wykładniczym; po wyczerpaniu → kolejka DLQ + alert. Panel Bull Board (za auth) do wglądu operacyjnego.

## Decyzja 3: Realtime — Socket.IO (WebSocket z fallbackiem), nie polling

- Zastosowania: powiadomienia in-app (badge, toast), aktualizacje na żywo w wątku Q&A (nowa odpowiedź, akceptacja), status zlecenia.
- **Socket.IO** zamiast surowego WS: automatyczny fallback do long-pollingu (użytkownicy B2B za restrykcyjnymi proxy), pokoje (`user:{id}`, `thread:{id}`), adapter Redis pub/sub — dzięki czemu etap 3 skalowania (repliki api, ADR-005) nie wymaga sticky sessions.
- Wzorzec: socket służy **wyłącznie jako sygnał** ("coś się zmieniło, jakie id") — dane zawsze dociągane przez REST. Zero logiki domenowej w warstwie socketowej; utrata połączenia nic nie psuje (stan i tak jest w API).
- Pojemność: 200–500 równoczesnych połączeń WS to znikome obciążenie dla Node (problemy zaczynają się od dziesiątek tysięcy). Heartbeat 25 s, limit połączeń per user.
- Odrzucone: krótki polling (mnoży ruch na współdzielonym VPS dokładnie tam, gdzie go oszczędzamy), SSE (brak dwukierunkowości potrzebnej pod przyszły czat fazy 3+).

## Konsekwencje

- (+) Redis pełni trzy role (cache, kolejki, pub/sub) — jedna dodatkowa usługa zamiast trzech; przy skali 10k to bezpieczne (rozdzielenie instancji Redis to trywialny etap 2 skalowania).
- (+) Outbox daje spójność zdarzeń z transakcjami bez rozproszonych transakcji.
- (−) At-least-once wymusza idempotencję każdego konsumenta — egzekwowane szablonem konsumenta w kodzie i testami.
- (−) Awaria Redis zatrzymuje kolejki i cache — mitygacja: AOF persistence, restart policy, alerty; API degraduje się do trybu bez cache (wolniej, ale działa), zdarzenia czekają bezpiecznie w outboxie MySQL.
