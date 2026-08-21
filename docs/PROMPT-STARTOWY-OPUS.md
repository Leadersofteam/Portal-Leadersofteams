# Prompt startowy — Portal Leaders of Teams (sesja S19+)

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
4. docs/SPRINTY-S18-S21.md — kierunek (S18 domknięty 15.08).
5. `git log --oneline -15` i `git status`.

Skille projektowe (.claude/skills/, mapa w docs/SKILLE.md) włączają się same.
Przy wdrożeniu, migracji, bramkach, danych demo, zrzutach i funkcjach społecznych
KORZYSTAJ Z NICH zamiast odtwarzać procedurę z pamięci.

## Trzy zasady, które w tym repo łamano najczęściej

1. „Backend gotowy" ≠ „funkcja działa". Reset hasła prowadził w 404 przez tydzień
   przy zielonych testach backendu. Jeśli funkcja ma ścieżkę użytkownika — PRZEJDŹ JĄ.
2. Trasa API bez wejścia w UI to funkcja, której nie ma. Zdarzyło się SZEŚĆ razy.
   Od S18 pilnuje tego test `shared/web-contract.test.ts` — jeśli dokładasz trasę,
   dokładasz wejście albo wyjątek z uzasadnieniem.
3. Dokumentacja bywa za kodem. Zanim uznasz coś za zrobione ALBO za brakujące —
   potwierdź w kodzie. Dotyczy też list „✅".

## ⚠️ Ta sesja ZACZYNA SIĘ od dwóch pytań do mnie

S19 „Pierwszych dwudziestu" nie da się rozstrzygnąć z kodu. Zapytaj mnie na wejściu:
1. Czy dane demo zostają na produkcji, gdy przyjdą realni Liderzy? (R-17; obie ścieżki
   gotowe: `seed-demo.ts --purge` albo zostawienie). Na produkcji jest już konto
   kuchar21ski@gmail.com „Macix" — jeśli to nie ja, pytanie nie jest hipotetyczne.
2. Kogo zapraszamy jako pierwszych?

Do czasu odpowiedzi rób punkty 3–5 z S19, które od niej nie zależą.

## Zadanie na tę sesję: S19 w docs/SPRINTY-S18-S21.md

> **Korekta 21.08:** PD2 „Pierwsza mila" WYKONANY i wdrożony na produkcję (twardy test
> „szablon czy produkt" zdany — baner w HANDOFF). Tor designu wg harmonogramu ekosystemu
> przechodzi teraz do **D2 w App** (`/docker/leaders-of-teams-app`, brief w tamtejszym
> `docs/SESJA-NASTEPNA.md`); w Portalu następny jest PD3 „Marketplace i profile" (po D2).
> Tor funkcjonalny S19 bez zmian — czeka na decyzje właściciela niżej.

Zaproszenie Lidera bez cienia MLM (ścieżkę DOPISZ do antimlm.integration.test.ts —
inaczej strażnik zazieleni się przez pominięcie), ślad zaufania w /szukaj,
pierwsze 60 sekund oczami obcej osoby, mail powitalny + digest opt-in.

## Stan, który warto znać przed startem

- Produkcja: 9 kont demo + kuchar21ski@gmail.com („Macix", NIE moje, NIE demo).
  Licząc realnych użytkowników ODFILTRUJ `@demo.leadersofteams.pl` ORAZ
  `deleted-*@deleted.invalid` — anonimizacja RODO zostawia wiersz w miejscu.
- Bramki po S18: 203 testy API, 17 e2e. Spadek liczby = sygnał, nie sukces.
- Analityka od 15.08 mówi prawdę (sonda nie jest już odsłoną) — pierwszy realny
  pomiar ruchu będzie miał sens, wcześniejsze liczby `/` są bezwartościowe.
- Branch feat/s12-widziec-i-reagowac, wypchnięty; PR do main tworzy właściciel.

## Czego oczekuje właściciel

Działania z osądem, nie pytań o zakres. Decyduj sam, zapisuj uzasadnienie w kodzie
i w commicie, jedź dalej. Pytaj tylko o to, czego nie da się rozstrzygnąć z kodu.
Konta testowe na produkcji są dozwolone — sprzątaj je po sobie.
Zastany błąd: napraw i powiedz wprost, że był zastany.

Sekrety, których brakuje, są po jego stronie — zrób wszystko, co da się bez nich,
a na koniec wypisz jednym akapitem, czego potrzebujesz.
```

---

## Czego nauczył S18 (warto mieć z tyłu głowy w S19)

Sprint higieniczny znalazł **cztery zastane błędy, których nie było w planie** — wszystkie
tej samej klasy: kod deklarował coś, a rzeczywistość milczała. Dwie martwe trasy API,
`public/robots.txt` przesłaniający generowany `app/robots.ts` (przez co `Sitemap:` nigdy
nie trafił do crawlerów) i przezroczyste tło WSZYSTKICH głównych przycisków Portalu.
Żadnego z nich nie złapał test — złapał je **pomiar i zrzut ekranu**.

Drugi wniosek dotyczy testów: istniejący test analityki przechodził, bo użyto w nim
27-znakowej atrapy uchwytu, a realne uchwyty mają po kilkanaście znaków. **Atrapa dobrana
pod implementację potrafi zazielenić test na dane, które w produkcji nie występują.**
