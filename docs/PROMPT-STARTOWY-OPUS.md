# Prompt startowy — Portal Leaders of Teams (sesja S18+)

Skopiuj blok poniżej jako pierwszą wiadomość w nowej sesji Claude Code (Opus 5) na VPS.

**Ten prompt jest KRÓTKI i to jest celowe.** Repo ma [`CLAUDE.md`](../CLAUDE.md) (wczytywany
automatycznie), [`docs/MINY.md`](MINY.md) (pułapki) i **siedem Skilli** w `.claude/skills/`,
które włączają się same. Prompt ustawia tylko zadanie i kierunek — reszta żyje w repo.

---

```
Pracujesz nad Portalem Leaders of Teams — marketplace'em B2B i społecznością dla
Liderów zespołów, PUBLICZNIE ŻYWĄ na leadersofteams.pl.
Repo: /docker/portal-staging. Wdrożenia ręczne, nigdy CI.

## Zacznij od tego (w tej kolejności)

1. CLAUDE.md — zasady nienaruszalne i kryterium akceptacji zmiany.
2. docs/MINY.md — pułapki, które w tym repo już kosztowały czas.
3. docs/HANDOFF-OPUS.md — stan, mechanizmy i sprostowania.
4. docs/SPRINTY-S18-S21.md — kierunek (S15–S19 jest już zamknięte/przenumerowane).
5. `git log --oneline -15` i `git status`.

Skille projektowe (.claude/skills/, mapa w docs/SKILLE.md) włączają się same.
Przy wdrożeniu, migracji, bramkach, danych demo, zrzutach i funkcjach społecznych
KORZYSTAJ Z NICH zamiast odtwarzać procedurę z pamięci.

## Trzy zasady, które w tym repo łamano najczęściej

1. „Backend gotowy" ≠ „funkcja działa". Reset hasła prowadził w 404 przez tydzień
   przy zielonych testach backendu. Jeśli funkcja ma ścieżkę użytkownika — PRZEJDŹ JĄ.
2. Trasa API bez wejścia w UI to funkcja, której nie ma. Zdarzyło się TRZY RAZY:
   POST /groups (4 sprinty), eksport i usunięcie konta (RODO), lista ulubionych.
3. Dokumentacja bywa za kodem. Zanim uznasz coś za zrobione ALBO za brakujące —
   potwierdź w kodzie. Dotyczy też list „✅".

## Zadanie na tę sesję: S18 „Prawda o Portalu"

Sprint higieniczny, zero nowych funkcji — chodzi o to, żeby to, co Portal twierdzi,
było prawdą. Kolejność moja, zmień ją, jeśli po przeczytaniu kodu uznasz inaczej:

1. ANALITYKA KŁAMIE. Healthcheck kontenera `web` uderza w `/` co 15 s i jest liczony
   jako odsłona: 3857 „wejść" na dobę przy 2–3 na każdej innej stronie. Przepnij
   healthcheck na osobną ścieżkę spoza białej listy w shared/analytics.ts.
2. Moduł `analytics` nie ma ANI JEDNEGO testu (jedyny taki). Dopisz.
3. RODO bez ścieżki użytkownika: GET /me/export i DELETE /me działają od D6, ale nie
   mają żadnego wejścia w UI. Zrób /panel/konto — pobranie danych i usunięcie konta
   z realnym potwierdzeniem. To obowiązek prawny (R-10), nie funkcja.
4. GET /me/favorites bez strony — gwiazdka w /uslugi działa, ale ulubionych nie da się
   nigdzie zobaczyć. Wzorzec gotowy w /panel/zapisane.
5. STRAŻNIK: test porównujący trasy API z wywołaniami w apps/web, z jawną listą
   wyjątków. Ta mina wystąpiła trzy razy — ma nie wrócić czwarty.
6. docs/RISKS.md: dwa różne ryzyka mają numer R-16 (dane demo i jakość kursów).

## Stan, który warto znać przed startem

- Produkcja: 10 kont (9 demo + kuchar21ski@gmail.com „Macix" — NIE moje, NIE demo),
  14 zleceń, 6 usług, 2,3 MB bazy, TTFB 57–101 ms. Serwer się nudzi.
- Bramki po S17: 182 testy API, 16 e2e. Spadek liczby = sygnał, nie sukces.
- Branch feat/s12-widziec-i-reagowac, wypchnięty; PR do main tworzy właściciel.

## Czego oczekuje właściciel

Działania z osądem, nie pytań o zakres. Decyduj sam, zapisuj uzasadnienie w kodzie
i w commicie, jedź dalej. Pytaj tylko o to, czego nie da się rozstrzygnąć z kodu —
np. czy dane demo zostają na produkcji (to decyzja na wejściu do S19, nie do S18).
Konta testowe na produkcji są dozwolone — sprzątaj je po sobie.
Zastany błąd: napraw i powiedz wprost, że był zastany.

Sekrety, których brakuje, są po jego stronie — zrób wszystko, co da się bez nich,
a na koniec wypisz jednym akapitem, czego potrzebujesz.
```

---

## Dlaczego S18 jest higieniczny, a nie „rozwojowy"

Bo pomiary z 14.08 mówią, że Portal ma komplet funkcji i **zero realnego ruchu**, ale
trzy rzeczy, które twierdzi, nie są prawdą: analityka liczy własny healthcheck, RODO
istnieje tylko w backendzie, a część tras nie ma wejścia w interfejsie. Każda z nich
uderzy dokładnie w dniu, w którym przyjdą pierwsi ludzie. Pełne uzasadnienie i kolejne
sprinty: [SPRINTY-S18-S21.md](SPRINTY-S18-S21.md).
