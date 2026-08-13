# Roadmapa S12–S15 — „Pierwszych dwudziestu"

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
   Brevo zostaje jako alternatywa, gdyby kiedyś doszedł masowy digest.
   Zweryfikowane na produkcji: rejestracja i **reset hasła** realnie wychodzą (`mail.sent`,
   `transport: smtp`). ⚠️ `MAIL_FROM` musi być adresem uwierzytelnionej skrzynki — nadawca
   z innej domeny nie przejdzie SPF/DMARC.
   **Pozostaje do rozważenia:** osobna skrzynka `portal@leadersofteams.pl` (rozdzieli reputację
   od poczty transakcyjnej App i wyrówna domenę nadawcy z domeną Portalu).
2. **🔴 Moderacja zgłoszeń jest ślepa.** `POST /reports` działa i tworzy `ModerationCase`,
   ale `/panel/moderacja` renderuje wyłącznie notatkę — **nie pokazuje `subjectType`/`subjectId`
   ani linku do zgłoszonej treści**. Moderator widzi, że „coś" zgłoszono, i nie ma jak tego
   otworzyć. Do zrobienia: kolumna typu, link do treści (`/wpisy/:id`, `/grupy/:g/post/:id`,
   `/watki/:id`, `/zlecenia/:id`), podgląd fragmentu, akcja „ukryj treść" (usunięcie
   `ActivityItem` + soft delete) obok istniejących „zwolnij/odrzuć".
3. **Worker heartbeat** (dług z GO-LIVE-CHECKLIST §1): `SET portal:worker:heartbeat EX 60`
   plus healthcheck w compose. Dziś **cicha śmierć workera nie daje żadnego sygnału** — wpisy nie
   pojawiają się w feedzie, powiadomienia nie przychodzą, punkty się nie naliczają, a `docker ps`
   pokazuje „Up". To najgroźniejsza awaria, jaką ten system może mieć.
4. **Analityka za 0 zł, bez cookies i bez danych osobowych:** dzienne agregaty w Redis
   (odsłony ścieżek, rejestracje, publikacje) + prosty podgląd w panelu moderatora.
   Żadnego zewnętrznego skryptu — zgodnie z naszą własną polityką prywatności.
5. **Turnstile** — klucze od właściciela; kod flag-gated jest gotowy. Włączyć **przed** publiczną
   promocją, nie przed zaproszeniami imiennymi.

**Świadomie NIE w tym sprincie:** k6. Test obciążeniowy pustego portalu mierzy hałas — wchodzi
w S15, gdy będzie znany realny kształt ruchu.

**DoD:** reset hasła działa na realnej skrzynce; moderator otwiera zgłoszoną treść jednym
kliknięciem; zabicie workera zapala healthcheck; panel pokazuje wczorajszy ruch.

---

## S13 — Dług z S11 i pierwsze wrażenie Firmy

Cel: domknąć to, co z S11 zostało, i dać Firmie powód do zaufania w 10 sekund.

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
4. **Digest e-mail powiadomień** (job w workerze, za tą samą flagą co reszta poczty) — dzienny,
   wyłącznie o rzeczach wymagających reakcji. Bez „wróć do nas", bez sztucznego zaangażowania.

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
