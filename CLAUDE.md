# Portal Leaders of Teams — wejście dla sesji Claude Code

Marketplace B2B i społeczność dla Liderów zespołów, **publicznie żywy** na `leadersofteams.pl`.
Monorepo pnpm: Next.js 15 + Fastify + Prisma + MySQL + Redis + BullMQ. Wdrożenia **ręczne, nigdy CI**.

> Ten plik czyta się przed każdą sesją. Trzy dokumenty to komplet startu:
> **[docs/MINY.md](docs/MINY.md)** (pułapki, które już kosztowały czas),
> **[docs/HANDOFF-OPUS.md](docs/HANDOFF-OPUS.md)** (stan i mechanizmy),
> **[docs/SPRINTY-S18-S21.md](docs/SPRINTY-S18-S21.md)** (kierunek; S15–S19 zamknięte).
> Gotowy prompt do wklejenia: **[docs/PROMPT-STARTOWY-OPUS.md](docs/PROMPT-STARTOWY-OPUS.md)**.
> Procesy powtarzalne są w Skillach (`.claude/skills/`) — patrz [docs/SKILLE.md](docs/SKILLE.md).

## Jedna zasada, z której wynika reszta

**Status w Portalu trzeba ZAPRACOWAĆ.** Punkt Drabinki może przyznać wyłącznie drugi człowiek
za realną pracę: ocena po zrealizowanym zleceniu albo uznana odpowiedź w Q&A. To nie hasło
marketingowe, tylko oś architektury — i jedyny wyróżnik, którego konkurencja nie skopiuje
bez przebudowy produktu.

Każda zmiana, która choćby pośrednio pozwala zdobyć status inaczej, jest zmianą produktu,
a nie funkcją. Wymaga rozmowy z właścicielem, nie decyzji w trakcie sprintu.

## Twarde zasady — nienegocjowalne

- **ADR-004 anty-MLM.** Zero punktów za rekrutację, zaproszenia, aktywność społeczną,
  onboarding, logowanie, wyszukiwanie. Pilnują tego testy STRUKTURALNE, nie regulamin.
  ⚠️ Dodając funkcję społeczną, **rozszerz ścieżkę** w `social/antimlm.integration.test.ts` —
  inaczej test zieleni się przez POMINIĘCIE nowej funkcji. Skill: `portal-anty-mlm`.
- **ADR-009: 0 zł za klik i zero zewnętrznych dostawców po API.** Portal nie wykonuje
  ŻADNEGO wychodzącego wywołania HTTP poza SMTP własnej skrzynki. Cloudflare jest
  **wykluczony decyzją właściciela** — anty-bot to własny proof-of-work na Redisie.
  Nie proponuj Turnstile, reCAPTCHA ani hCaptcha. Ikony i ilustracje rysujemy sami w SVG.
- **ADR-010 anty-engagement.** Feed chronologiczny, bez algorytmu, bez infinite scrolla,
  bez DM, bez streaków i liczników wyświetleń. Ranking wolno stosować wyłącznie do ETYKIET
  (chipy tematów i tagów jako nawigacja), nigdy do kolejności treści.
- **ADR-002 granice modułów.** Import z innego modułu wyłącznie przez `modules/<x>/index.ts`.
  Lint to egzekwuje — nowy moduł DOPISZ do `API_MODULES` w `eslint.config.mjs` razem
  z jego powstaniem, nie po fakcie.
- **Migracje expand-only.** Nowe tabele, kolumny nullable/z domyślną, wartości enuma
  **tylko na końcu** listy. Skill: `portal-migracja`.

## Dwie lekcje, które kosztowały najwięcej

**1. „Backend gotowy" ≠ „funkcja działa".** Poczta była odhaczona jako zrobiona na podstawie
logu `mail.sent`. Nikt nie kliknął linku — obie strony docelowe nie istniały, a reset hasła
był martwy przez tydzień. **Jeśli funkcja ma ścieżkę użytkownika, PRZEJDŹ JĄ.**

**2. Dokumentacja bywa za kodem.** W jednej sesji zdarzyło się to trzy razy: „digest do
zrobienia" (był zrobiony), „ślad zaufania na kartach do zrobienia" (był), „kod anty-bota
gotowy, brakuje kluczy" (klucz nie miał jak trafić do obrazu). **Zanim uznasz cokolwiek
za zrobione ALBO za brakujące — potwierdź to w kodzie.** Dotyczy też list „✅" w dokumentach.

## Rytm pracy

Sprint = jeden spójny, zweryfikowany, **wdrożony** przyrost:

```
pnpm format && pnpm lint && pnpm typecheck && pnpm -r test   # na realnym MySQL/Redis
pnpm build && bash infra/e2e.sh                              # + odtworzenie bazy dev
zrzuty 390 i 1440 px → commit → staging → prod → wpis w HANDOFF
```

Skille: `portal-bramki` (weryfikacja), `portal-wdrozenie` (deploy), `portal-zrzuty` (zrzuty).

## Czego oczekuje właściciel

**Działania z osądem, nie pytań o zakres.** Przy szerokim mandacie decyduj sam, zapisuj
uzasadnienie w kodzie i w commicie, i jedź dalej. Pytaj tylko o to, czego nie da się
rozstrzygnąć z kodu — np. kogo zapraszamy albo czy dane demo zostają na produkcji.

Ma stałą zgodę na **konta testowe na produkcji** i przechodzenie funkcji na żywo.
**Sprzątaj je po sobie** — w tym repo konta testowe potrafiły zostać na miesiąc i były
mylnie liczone jako realni użytkownicy.

Gdy znajdziesz zastany błąd — **napraw go i powiedz wprost, że był zastany**, zamiast
przemilczeć albo przypisać sobie.

## Komentarze w kodzie

Komentuj **DLACZEGO, nie CO**. Najwięcej warte są komentarze przy pułapkach: następna osoba
ma nie wdepnąć w to samo. Ten styl jest w repo konsekwentny — trzymaj go.

## Stan produkcji (2026-08-14)

- **1 realne konto** (właściciel) + komplet danych demo, zasianych świadomą decyzją
  właściciela. Markery: `@demo.leadersofteams.pl`, `nip = 'DEMO-SEED'`.
  Zdjęcie jedną komendą — skill `portal-dane-demo`. Ryzyko zapisane jako R-16 w `docs/RISKS.md`.
- **Funkcje nie są wąskim gardłem — ludzie są.** Portal ma marketplace, usługi, Drabinkę,
  społeczność, grupy, Q&A, moderację, analitykę i PWA. Kolejna funkcja przed pierwszymi
  realnymi Liderami to budowanie w ciemno.
