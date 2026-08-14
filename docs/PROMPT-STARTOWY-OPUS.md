# Prompt startowy — Portal Leaders of Teams (sesja S17+)

Skopiuj blok poniżej jako pierwszą wiadomość w nowej sesji Claude Code (Opus 5) na VPS.

**Ten prompt jest teraz KRÓTKI i to jest celowe.** Od 2026-08-14 repo ma
[`CLAUDE.md`](../CLAUDE.md) (wczytywany automatycznie), [`docs/MINY.md`](MINY.md) (pułapki)
i **siedem Skilli** w `.claude/skills/`, które włączają się same, gdy zadanie do nich pasuje.
Prompt ma już tylko ustawić zadanie i kierunek — reszta jest w repo i nie wymaga kopiowania.

---

```
Pracujesz nad Portalem Leaders of Teams — marketplace'em B2B i społecznością dla
Liderów zespołów, PUBLICZNIE ŻYWĄ na leadersofteams.pl.
Repo: /docker/portal-staging. Wdrożenia ręczne, nigdy CI.

## Zacznij od tego (w tej kolejności)

1. CLAUDE.md — zasady nienaruszalne i kryterium akceptacji zmiany.
2. docs/MINY.md — pułapki, które w tym repo już kosztowały czas.
3. docs/HANDOFF-OPUS.md — stan, mechanizmy i sprostowania.
4. docs/SPRINTY-S15-S19.md — kierunek i to, co zostało z S17.
5. `git log --oneline -15` i `git status`.

Masz do dyspozycji Skille projektowe (.claude/skills/, mapa w docs/SKILLE.md).
Włączają się same; przy wdrożeniu, migracji, bramkach, danych demo, zrzutach
i funkcjach społecznych KORZYSTAJ Z NICH zamiast odtwarzać procedurę z pamięci.

## Dwie zasady, które w tym repo łamano najczęściej

1. **„Backend gotowy" ≠ „funkcja działa".** Reset hasła był odhaczony na podstawie
   logu `mail.sent` i przez tydzień prowadził w 404, bo strony docelowej nie było.
   Jeśli funkcja ma ścieżkę użytkownika — PRZEJDŹ JĄ.
2. **Dokumentacja bywa za kodem.** W jednej sesji zdarzyło się to trzy razy.
   Zanim uznasz coś za zrobione ALBO za brakujące — potwierdź w kodzie.
   Dotyczy też list „✅".

## Zadanie na tę sesję

Domknij S17 z docs/SPRINTY-S15-S19.md — zostały dwa punkty:

  3. **Zakładki** — prywatne zapisywanie wpisów. BEZ publicznego licznika, żeby
     nie zrobić z tego kolejnej waluty popularności (ADR-010).
  4. **Przypięty wątek w grupie + moderatorzy grup** jako pierwsza linia.
     RBAC już istnieje (`GroupMembership.role`) — brakuje UI i uprawnień w serwisie.

Jeśli po lekturze uznasz, że priorytet powinien być inny — powiedz to wprost,
uzasadnij i zaproponuj swój. Plan sprzed sprintu bywa gorszy niż osąd po
przeczytaniu kodu; tak powstały najlepsze decyzje w tym projekcie.

## Czego oczekuje właściciel

Działania z osądem, nie pytań o zakres. Decyduj sam, zapisuj uzasadnienie w kodzie
i w commicie, jedź dalej. Pytaj tylko o to, czego nie da się rozstrzygnąć z kodu.
Konta testowe na produkcji są dozwolone — sprzątaj je po sobie.
Zastany błąd: napraw i powiedz wprost, że był zastany.

Sekrety, których brakuje, są po jego stronie — zrób wszystko, co da się bez nich,
a na koniec wypisz jednym akapitem, czego potrzebujesz.
```

---

## Stan na 2026-08-14 (dla piszącego prompt, nie do wklejania)

- **Produkcja:** 1 realne konto (właściciel) + komplet danych demo. Wszystkie kontenery
  `healthy`, `worker.alive` i `uploads` zielone.
- **Zamknięte w ostatnich sesjach:** moderacja z podglądem treści, puls workera, analityka
  0 zł, własna bramka anty-bot (Cloudflare wykluczony), obrazy i cytowanie wpisów, publiczny
  profil Firmy, przepływy mailowe, dane demo z warstwą społecznościową, tematy (#hashtagi),
  obrazy w postach grupowych.
- **Otwarte decyzje właściciela:** kogo zapraszamy jako pierwszych realnych Liderów oraz
  czy dane demo zostają na produkcji, gdy oni przyjdą (ryzyko R-16).
- **Gałąź:** `feat/s12-widziec-i-reagowac` — PR tworzy właściciel, na VPS nie ma `gh`.
