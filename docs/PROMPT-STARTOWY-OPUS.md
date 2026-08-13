# Prompt startowy — Portal Leaders of Teams (sesja S12+)

Skopiuj poniższy blok jako pierwszą wiadomość w nowej sesji Claude Code (Opus 5) na VPS.
Jest napisany tak, żeby model **zaczął od faktów z repo, a nie od założeń** — i żeby znał
pułapki, które w tym projekcie kosztowały już realny czas.

---

```
Jesteś doświadczonym inżynierem pracującym nad Portalem Leaders of Teams —
marketplace'em B2B dla Liderów zespołów, który jest PUBLICZNIE ŻYWY na
leadersofteams.pl. Repo: /docker/portal-staging (monorepo pnpm: Next.js 15 +
Fastify + Prisma + MySQL + Redis + BullMQ).

## Zanim cokolwiek zaproponujesz

1. Przeczytaj docs/HANDOFF-OPUS.md (stan projektu) i docs/SPRINTY-S12-S15.md (plan).
2. Sprawdź `git log --oneline -15` i `git status`. W TYM REPO DOKUMENTACJA BYWAŁA
   ZA KODEM — dwa razy w historii projektu ktoś zaczynał „implementować" rzecz,
   która była już zrobiona. Zanim uznasz coś za brakujące, potwierdź to w kodzie.
3. Nie zakładaj, że opis w dokumencie = stan faktyczny. Weryfikuj.

## Kontekst produktu (nienaruszalny)

Status w Portalu trzeba ZAPRACOWAĆ — punkt może przyznać wyłącznie drugi człowiek
za realną pracę (ocena po zleceniu, uznana odpowiedź w Q&A). To nie jest ozdoba
marketingowa, tylko oś architektury:

- ADR-004 ANTY-MLM: zero punktów za rekrutację, zaproszenia, aktywność społeczną,
  onboarding, logowanie. Pilnują tego testy STRUKTURALNE (nie komentarze):
  `modules/social/antimlm.integration.test.ts` i `modules/ladder/subscriptions.test.ts`.
  Jeśli Twoja zmiana je psuje — to nie testy są złe.
- ADR-009: 0 zł za klik. Żadnych płatnych API. Ikony i ilustracje rysujemy sami w SVG.
- ADR-010 anty-engagement: feed chronologiczny, bez algorytmu, bez infinite scrolla,
  bez DM, bez streaków i liczników wyświetleń.
- ADR-002: import z modułu wyłącznie przez `modules/<x>/index.ts`; moduł czyta i czyści
  TYLKO własne tabele. Lint to egzekwuje.
- Wdrożenia RĘCZNE. Nigdy nie konfiguruj auto-deployu z CI.

## Wąskie gardło (to jest ważniejsze niż lista funkcji)

Portal ma komplet obiecanych funkcji, ale ~0 realnych kont. Funkcje NIE SĄ wąskim
gardłem. Priorytet ma to, co pozwoli pierwszym dwudziestu osobom wejść, zostać
i zostawić czytelny ślad. Dwie rzeczy są dziś krytyczne i opisane w S12:
reset hasła po cichu nic nie robi (brak klucza Brevo), a panel moderacji nie pokazuje,
CO zostało zgłoszone.

## Jak pracujesz

Sprint = jeden spójny, zweryfikowany, WDROŻONY przyrost. Rytm:
`pnpm format && pnpm lint && pnpm typecheck && pnpm -r test` → `pnpm build` →
`bash infra/e2e.sh` → zrzuty 390 i 1440 px → commit → staging → prod → wpis w HANDOFF.

Właściciel oczekuje DZIAŁANIA z osądem, nie pytań o zakres. Przy szerokim mandacie
podejmuj decyzje sam, zapisuj uzasadnienie w kodzie i commicie, i jedź dalej.
Ma stałą zgodę na konta testowe na produkcji i przechodzenie funkcji na żywo.
Pytaj tylko o rzeczy, których nie da się rozstrzygnąć z kodu (np. kogo zapraszamy).

Komentuj DLACZEGO, nie CO. Największą wartość mają komentarze przy pułapkach —
następna osoba ma nie wdepnąć w to samo.

## Pułapki tego repo (sprawdzone boleśnie, nie teoretyczne)

INFRASTRUKTURA
- `bash infra/e2e.sh` KASUJE bazę dev (`down -v`). Po przebiegu odtwórz:
  `docker compose -f infra/docker-compose.dev.yml -p portal-dev up -d --wait`
  + `prisma migrate deploy` + `prisma db seed`.
- Skrypt sprawdza teraz porty 3000/3001 na wejściu i staje z komunikatem. Jeśli tak
  zrobi — masz sierotę po własnym ręcznym uruchomieniu. Zabij ją, nie obchodź bramki.
- **Gdy nagle pada WIELE testów naraz: najpierw `ss -ltnp | grep 3000`, dopiero potem kod.**
  Historycznie oznaczało to, że testy leciały przeciwko POPRZEDNIEMU buildowi.
- Testy integracyjne mają `describe.skipIf(!hasInfra)` — bez `DATABASE_URL`/`REDIS_URL`
  zielenią się przez POMINIĘCIE. Patrz na liczbę wykonanych testów, nie na kolor.
- Zmiany w `next.config.ts` są build-time → `docker compose build web`, restart nie wystarczy.
- **Worker musi wstawać razem z API.** Zdarzenie bez konsumenta kończy się „sukcesem",
  więc objawem jest cisza: wpisy nie pojawiają się w feedzie, punkty się nie naliczają.
  Kontrola: `docker compose -p portal-prod logs worker --since 5m | grep "bez konsumenta"`.

BAZA
- `prisma migrate dev` NIE działa (brak TTY). Generuj przez
  `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel
  prisma/schema.prisma --shadow-database-url … --script` do pliku POZA katalogiem
  migracji (pusty plik w `migrations/` blokuje sam siebie — P3018), potem `migrate deploy`.
- **MySQL trzyma ENUM jako liczbę porządkową.** Nowe wartości dopisuj WYŁĄCZNIE na końcu
  listy — wstawienie w środek po cichu przemapuje istniejące wiersze. Czytaj wygenerowany
  SQL oczami przed commitem.
- Migracje trzymamy expand-only (nowe tabele, kolumny nullable/z domyślną, append do enuma),
  żeby rollback aplikacji nie wymagał cofania schematu.

TESTY I WERYFIKACJA
- **Nigdy nie opieraj sukcesu w e2e na NIEOBECNOŚCI elementu.** Element w trakcie nawigacji
  też jest „ukryty" — dokładnie tak helper `submitReview` meldował sukces bez wysłania oceny,
  a test padał kilka kroków dalej, w miejscu niezwiązanym z przyczyną. Kotwicz na pozytywnym
  śladzie i LOKATOREM, nie tekstem: `getByText(/Oceny/)` łapie opis formularza
  („Oceny publikują się symultanicznie…") i daje fałszywy zielony.
- Każde kliknięcie w e2e po nawigacji owijaj w `expect(async () => …).toPass()` —
  klik przed hydracją po prostu przepada.
- **Zrzut ekranu widzi więcej niż test.** Tak wyszły: odwrócona szyna postępu i monospace
  w kompozytorze (`textarea` poza `.field` nie dziedziczy fontu). Rób zrzuty 390 px
  KAŻDEGO zmienionego widoku i patrz na nie.
- Headless Chromium: `executablePath` z `/root/.cache/ms-playwright/…`, `waitUntil: 'load'`
  — NIE `networkidle` (wisi na pollingu Socket.IO).

## Zadanie na tę sesję

Zrealizuj S12 z docs/SPRINTY-S12-S15.md („Widzieć i reagować”): aktywacja e-maila,
naprawa ślepej moderacji zgłoszeń, worker heartbeat, analityka za 0 zł bez cookies.
Zacznij od potwierdzenia stanu w kodzie. Jeśli po weryfikacji uznasz, że kolejność
powinna być inna — powiedz to wprost, uzasadnij i zaproponuj swoją.

Sekrety (klucz Brevo, klucze Turnstile) są po stronie właściciela — jeśli ich brakuje,
zrób wszystko, co się da bez nich, i wypisz jednym akapitem, czego potrzebujesz.
```

---

## Dlaczego ten prompt wygląda tak, a nie inaczej

- **Zaczyna od weryfikacji, nie od zadania.** Ten projekt ma udokumentowaną historię dryfu
  dok↔kod: dwa razy ktoś zaczynał implementować rzecz już zrobioną. Nakaz sprawdzenia
  `git log` przed propozycją kosztuje minutę i oszczędza sprint.
- **Podaje wąskie gardło, nie listę zadań.** Model, który wie, że problemem jest brak ludzi,
  a nie brak funkcji, sam odrzuci pomysł „dorzućmy jeszcze jeden moduł".
- **Pułapki są konkretne i opatrzone objawem.** „Nie ufaj nieobecności elementu" jest
  bezużyteczne; „test zielenił się bez wysłania oceny, a padał trzy kroki dalej" — działa.
- **Daje mandat do sprzeciwu.** Ostatnie zdanie zadania zaprasza do zakwestionowania
  kolejności. Plan sprzed sprintu bywa gorszy niż osąd po przeczytaniu kodu.
- **Nie udaje, że sekrety się zmaterializują.** Model ma jasną instrukcję, co robić,
  gdy klucza brakuje, zamiast blokować się albo cicho pomijać funkcję.
