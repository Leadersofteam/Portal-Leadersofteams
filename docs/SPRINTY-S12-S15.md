# Roadmapa S12–S15 — „Pierwszych dwudziestu"

> **⚠️ TEN DOKUMENT JEST HISTORYCZNY.** S12 zamknięty 2026-08-13, S13 częściowo wchłonięty
> przez przyrost S14. Aktualny plan: **[SPRINTY-S15-S19.md](SPRINTY-S15-S19.md)**.
> Zostawiony dla zapisu decyzji i uzasadnień, nie jako lista zadań.

**Data:** 2026-08-13 · **Autor:** Opus 5 (po sesji S8–S11) · **Status:** do zatwierdzenia przez właściciela
**Punkt startowy:** [HANDOFF-OPUS.md](HANDOFF-OPUS.md) · poprzednia roadmapa: [SPRINTY-S8-S12.md](SPRINTY-S8-S12.md)

---

## Diagnoza: co NAPRAWDĘ blokuje Portal

Po S8–S11 Portal ma komplet funkcji obiecanych w briefie: marketplace zleceń (Oferteo),
usługi z pakietami (Fiverr), katalog i zaufanie (Empik), społeczność z wpisami (X), Drabinkę
i kieszonkową powłokę mobilną. **Funkcje przestały być wąskim gardłem.**

Wąskim gardłem są trzy rzeczy, w tej kolejności:

1. **Nie ma ludzi.** ~0 realnych kont. Każda kolejna funkcja to inwestycja w publiczność,
   której jeszcze nie ma.
2. **Pierwsze dwadzieścia osób nie ma marginesu błędu.** Jeśli komuś z tej grupy nie zadziała
   reset hasła albo zgłoszenie treści utknie — nie wróci i nie powie dlaczego.
3. **Nie widzimy, co się dzieje.** Zero analityki, worker bez heartbeatu, moderacja bez wglądu
   w zgłoszenia. Dziś nie umiemy odpowiedzieć nawet na pytanie „czy ktokolwiek tu wszedł".

Dlatego S12–S15 **nie są o nowych modułach**. Są o tym, żeby pierwszych dwudziestu Liderów
weszło, zostało i zostawiło ślad, który umiemy odczytać.

> **Zasady przekrojowe z S8–S12 obowiązują dalej bez zmian:** mobile-first od 390 px,
> język wizualny „światło, na które się wspinasz", 0 zł za klik (ADR-009), anty-MLM (ADR-004),
> anty-engagement (ADR-010), wdrożenia ręczne.

---

## S12 — Widzieć i reagować (przed zaproszeniem kogokolwiek)

Cel: zanim przyjdzie pierwszy realny człowiek, musimy **widzieć ruch** i **móc zareagować**,
gdy coś pójdzie nie tak. To jedyny sprint, który ma sens przed seedingiem.

1. ✅ **Aktywacja e-maila — ZROBIONE 2026-08-13, BEZ zewnętrznego dostawcy.** Portal wysyła
   przez **własną skrzynkę** (`smtp.hostinger.com`, `kontakt@leadersofteams.com`) — tę samą,
   której od dawna używa App. Zero nowego vendora, zero nowego kosztu (skrzynka jest opłacona
   w ramach hostingu domeny), zero powierzania adresów e-mail trzeciej stronie.
   (Brevo, wymieniane tu wcześniej jako alternatywa, zostało USUNIĘTE 2026-08-13 —
   martwy kod zewnętrznego dostawcy.)
   Zweryfikowane na produkcji: rejestracja i **reset hasła** realnie wychodzą (`mail.sent`,
   `transport: smtp`). ⚠️ `MAIL_FROM` musi być adresem uwierzytelnionej skrzynki — nadawca
   z innej domeny nie przejdzie SPF/DMARC.
   **Pozostaje do rozważenia:** osobna skrzynka `portal@leadersofteams.pl` (rozdzieli reputację
   od poczty transakcyjnej App i wyrówna domenę nadawcy z domeną Portalu).
2. ✅ **Moderacja zgłoszeń — ZROBIONE 2026-08-13** (`c4ec600`). Sprawa niesie teraz typ,
   fragment treści, autora i link (`/wpisy/:id`, `/grupy/:g/post/:id`, `/watki/:id`,
   `/zlecenia/:id`) plus akcję **„Ukryj treść"**. Wzorzec `ModerationSubjectModule` jest
   lustrem `AccountDataModule` z RODO: antifraud nie czyta cudzych tabel (ADR-002), każdy
   moduł wnosi podgląd i ukrywanie własnej treści.
   **Rozstrzygnięcia warte zapamiętania:** akcje rozdzielone na punktowe (`RELEASE`/`REJECT`)
   i treściowe (`HIDE`/`DISMISS`) — wcześniej jedna para obsługiwała oba światy i przy
   zgłoszeniu proponowała „zwolnij punkty", których nie było. `THREAD` dostał `hiddenAt`,
   bo Q&A to jedyna punktowana ścieżka społeczna i ukrycie MUSI też odciąć akceptację
   odpowiedzi oraz głosowanie — inaczej treść znika, a farmienie punktów trwa.
   `ORDER` świadomie BEZ ukrywania: zlecenie to umowa dwóch stron, nie publiczna treść.
3. ✅ **Worker heartbeat — ZROBIONE 2026-08-13.** `portal:worker:heartbeat` + healthcheck
   w compose prod i staging. Kluczowy szczegół: puls jest odnawiany **tylko gdy obraca się
   pętla dispatchera**, więc łapie także workera żywego, ale zakleszczonego. Zwykły
   `setInterval` dowodziłby jedynie, że proces istnieje, i świeciłby na zielono przy
   dokładnie tej awarii, którą ma wykrywać. Zweryfikowane próbą awarii (patrz
   GO-LIVE-CHECKLIST §1).
4. ✅ **Analityka za 0 zł — ZROBIONE 2026-08-13.** Odsłony ścieżek w Redisie (35 dni,
   biała lista ścieżek jako bariera pamięciowa, id zwijane do `:id`), ale **rejestracje
   i publikacje liczone z BAZY** po `createdAt` — odejście od pierwotnego planu, bo licznik
   w Redisie byłby drugim, gorszym źródłem prawdy (ginie przy flushu, nie liczy wstecz).
   Podgląd: `/panel/analityka` dla MODERATOR/ADMIN. Bez cookies, bez zewnętrznego skryptu,
   bez unikalnych użytkowników (te wymagałyby haszowania IP — nie wchodzimy w to).
5. ✅ **Anty-bot — ZROBIONE 2026-08-13, WŁASNĄ BRAMKĄ.** Cloudflare wykluczony decyzją
   właściciela; zamiast czekać na czyjeś klucze mamy proof-of-work na własnym Redisie
   (`shared/humancheck.ts`), **włączony domyślnie na produkcji**. Warstwy: jednorazowe
   wyzwanie, minimalny czas wypełniania formularza, pole-pułapka, eskalacja kosztu po IP.
   Uczciwie: to podnosi koszt próby, a nie rozpoznaje człowieka — realną barierą pozostają
   limity świeżego konta, weryfikacja e-maila i moderacja. Przy okazji usunięte Brevo:
   Portal nie odpytuje już ŻADNEGO zewnętrznego API (poza SMTP własnej skrzynki).

**Świadomie NIE w tym sprincie:** k6. Test obciążeniowy pustego portalu mierzy hałas — wchodzi
w S15, gdy będzie znany realny kształt ruchu.

**DoD — spełnione:** reset hasła działa na realnej skrzynce ✅; moderator otwiera zgłoszoną
treść jednym kliknięciem ✅; zamrożenie workera zapala healthcheck ✅; panel pokazuje ruch ✅.

---

## S13 — Dług z S11 i pierwsze wrażenie Firmy

Cel: domknąć to, co z S11 zostało, i dać Firmie powód do zaufania w 10 sekund.

> **✅ Punkty 1 i 3 ZROBIONE 2026-08-13** (poza sprintem, na życzenie właściciela).
> `Company.nipVerifiedAt` + odznaka i `GET /listings/tags/popular` + chipy weszły.
> Punkt 3 („ślad zaufania na kartach") okazał się w większości JUŻ ZROBIONY —
> średnia ocen i liczba opinii renderują się na `/liderzy` i `/uslugi` od dawna.
> Brakuje tam wyłącznie liczby ZREALIZOWANYCH ZLECEŃ przy Liderze (mamy ją już
> policzoną dla Firmy w `getCompanyPublicStats`) oraz ocen w wynikach `/szukaj`.
> Doszedł też publiczny profil Firmy (punkt 2) — patrz baner S14 w HANDOFF.

1. **Dług z S11 (świadomie nieukończony — nie zapomniany):**
   - `Company.nipVerifiedAt` + odznaka **„NIP — suma kontrolna OK"**. Walidacja sumy kontrolnej
     już DZIAŁA i odrzuca błędne numery przy tworzeniu firmy (`isValidNip`, testy w
     `shared/nip.test.ts`), ale **nie ma trwałego znacznika ani odznaki w UI** — styl `.nip-badge`
     czeka nieużywany w `styles/search.css`. ⚠️ Copy jest istotne prawnie: sprawdzamy wyłącznie
     poprawność formalną, więc etykieta nie może brzmieć „NIP zweryfikowany".
   - `GET /listings/tags/popular` + chipy popularnych tagów w katalogu usług. To nie ozdoba:
     bardzo krótkie frazy („HR", „IT", „AI") **nigdy** nie wejdą do FULLTEXT
     (`innodb_ft_min_token_size = 3`), więc tagi są jedyną drogą do tych kategorii.
2. **Publiczny profil Firmy** (`/firmy/[id]`): historia zleceń, oceny wystawione Liderom i
   otrzymane od nich (dwustronność = uczciwość), staż. Dziś Lider składający ofertę widzi
   wyłącznie nazwę — czyli decyduje w ciemno.
3. **Ślad zaufania na kartach:** liczba zrealizowanych zleceń i średnia ocena przy Liderze
   w katalogu i w wynikach wyszukiwania (dane już są — `getLeaderReviewStatsMany`).
4. ~~**Digest e-mail powiadomień**~~ — ⚠️ **JUŻ ISTNIEJE** (kolejny dryf dok↔kod, wykryty
   w S12): `notifications.sendDailyDigests` + timer w `apps/api/src/worker.ts`. Zamiast
   pisać go od nowa, do rozstrzygnięcia są dwie rzeczy:
   - `setInterval(24 h)` odlicza od STARTU PROCESU, więc przy częstych wdrożeniach digest
     może nie odpalić się nigdy. Do zmiany na „najbliższa godzina X".
   - treść („Masz N nieprzeczytanych powiadomień") ociera się o „wróć do nas" z ADR-010.
     Decyzja o copy należy do właściciela — proponowany kierunek: wysyłać wyłącznie wtedy,
     gdy jest coś WYMAGAJĄCEGO REAKCJI, i pisać co to jest, zamiast podawać licznik.

---

## S14 — Pierwszych dwudziestu (seeding + obserwacja)

Cel: wprowadzić realnych ludzi i **patrzeć**, zamiast zgadywać.

> **Kamień decyzyjny właściciela.** Ten sprint zaczyna się od Twojej decyzji, kogo zapraszamy.
> Bez niej reszta nie ma sensu — a z nią wszystkie kolejne priorytety wynikną z obserwacji,
> nie z domysłów.

1. **Narzędzie CLI do zaproszeń** (`apps/api/src/cli`): tworzy konto z jednorazowym linkiem
   ustawienia hasła. **Zero punktów za zaproszenie i za przyjęcie zaproszenia** — twardy test,
   jak w `antimlm.integration.test.ts`. To jest dokładnie ten moment, w którym system typu MLM
   zacząłby dawać punkty za rekrutację; my nie damy nigdy (ADR-004, brief §6).
2. **Strona `/start` dla zaproszonych** — wariant kreatora z 30-sekundowym wyjaśnieniem
   Trzech Płaszczyzn, dla kogoś, kto trafia z linku i nie zna marki.
3. **Ręczne seedowanie rynku**: 5–10 usług i 3–5 zleceń od realnych osób. Katalog z jedną
   pozycją wygląda gorzej niż pusty.
4. **Tygodniowy przegląd obserwacji** (z analityki z S12): gdzie ludzie odpadają, czego szukają
   bez wyniku, które puste stany są końcem drogi. **Wyniki tego przeglądu ustalają kolejność
   S15** — nie ta roadmapa.

---

## S15 — Skala i tempo (dopiero gdy jest co skalować)

Wchodzi wyłącznie wtedy, gdy S14 pokaże realny ruch.

1. **k6 load test** (poza szczytem, ostrożnie — VPS współdzielony z App i Zodiamo), wyniki
   w `docs/perf/`. Bloker R-04 z GO-LIVE-CHECKLIST.
2. **Budżet wydajności mobile**: LCP < 2,5 s na 4G, `fetchpriority` na hero, lazy na galeriach.
3. **Paginacja feedu globalnego pod obciążeniem** — dziś kursor po `createdAt, id` z indeksem
   `activity_items(createdAt)`; przy realnym wolumenie zweryfikować plan zapytania.
4. **Decyzje odłożone do danych:** Meilisearch (jeśli FULLTEXT przestanie wystarczać),
   moduł `teams` (ADR-010 dec. 2 — wymaga przeprojektowania po porzuceniu integracji z App),
   Academy/monetyzacja (ADR-011/012/013). **Żadnej z nich nie zaczynać bez danych z S14.**

---

## Czego w tej roadmapie świadomie NIE MA

- **Nowych modułów produktowych.** Portal ma komplet obiecanych funkcji; kolejne przed
  pierwszymi użytkownikami to budowanie w ciemno.
- **Grywalizacji, streaków, „wróć do nas".** ADR-010 i brief §6 — nie negocjujemy tego,
  nawet gdy metryki będą kusić.
- **Integracji z app.leadersofteams.com.** Porzucona decyzją właściciela 2026-07-20.

## Rytm pracy (bez zmian)

Sprint = jeden spójny przyrost: `pnpm format && pnpm lint && pnpm typecheck && pnpm -r test`
(na realnym MySQL/Redis!) → `pnpm build` → `bash infra/e2e.sh` → zrzuty 390/1440 px →
commit → staging + `run --rm migrate` → prod → wpis w HANDOFF. PR tworzy właściciel (brak `gh`).
