# Brief kontekstowy: Platforma leadersofteams.pl (marketplace + społeczność Liderów)

**Dla:** Claude Fable 5 (projekt architektury i implementacja)
**Od:** Maciej Kucharski, założyciel Leaders of Teams (LoT)
**Cel dokumentu:** przekazać pełny kontekst biznesowy i produktowy, żeby architektura była projektowana pod rzeczywisty zamysł, a nie generyczny marketplace.

**Status:** Projekt strategiczny wysokiego priorytetu dla ekosystemu LoT. Budowany od zera.

---

## 0. Repozytorium i skala

- **Repozytorium GitHub (od zera, puste):** https://github.com/Leadersofteam/Portal-Leadersofteams
- **Skala docelowa: 10 000 użytkowników na pojedynczym VPS.** To jest twardy wymóg niefunkcjonalny — architektura nie może zakładać infrastruktury wielo-regionowej ani drogiego klastra od dnia 1, ale musi być zaprojektowana tak, by 10 000 aktywnych użytkowników (obie strony: Liderzy + Firmy) działało płynnie na jednej, dobrze skonfigurowanej maszynie (lub małym klastrze 2–3 VPS-ów z rozdzieloną rolą: app / baza / cache), z jasną ścieżką do dalszego skalowania w górę bez przepisywania całości od zera.

---

## 1. Kontekst ekosystemu Leaders of Teams

Leaders of Teams (LoT) to polska agencja tech B2B założona w 2020 roku przez Maciej Kucharskiego, działająca jako wielobrandowy ekosystem (m.in. LOT APP V2, HydroSpark, Zodiamo, Transforme). Misja LoT: walka z asymetrią wiedzy między agencjami a klientami, transparentność, model prowizyjny jako sygnał zaufania. Zespoły LoT (ludzcy i AI: Claude, Bielik, Jules, Claude Code) są traktowane jako partnerzy na równych zasadach — to deklaracja marki.

Istniejące systemy w ekosystemie:
- **app.leadersofteams.com** — właściwy produkt SaaS: wielodostępowe (multi-tenant) CRM/ERP. Stack: TypeScript monorepo, Node.js/Express, React 19, Prisma, MySQL/PostgreSQL, Docker Compose + Traefik na VPS Hostinger (srv1418832.hstgr.cloud). Sprint 37–38, 3 piloci gotowi do produkcji.
- **leadersofteams.com** — międzynarodowa strona agencyjna.
- **leadersofteams.pl** — DOTYCHCZAS WordPress (BrightHub + Elementor), 11 podstron z gotowym polskim copy pozycjonującym LoT jako agencję AI/automatyzacji. **Ta strona zostaje całkowicie usunięta i zastąpiona nowym projektem.**

## 2. Decyzja: nowy projekt na domenie leadersofteams.pl

Cały WordPress (pliki, baza) zostaje usunięty. W jego miejsce powstaje **od zera, na VPS**, nowa platforma łącząca:
- **model Fiverr/Oferteo** (marketplace usług/zleceń między Firmami a Liderami),
- **model społecznościowy/networkingowy** (wymiana doświadczeń, mentoring, budowanie zespołów),
- **system gamifikacji "Drabinka Lidera"** powiązany z dostępem do właściwego produktu SaaS (app.leadersofteams.com).

Brak wymogu kompatybilności wstecznej z WordPressem — to czysty start.

## 3. Wizja produktu

### 3.1 Kim jest "Lider"

- **Rejestracja jest otwarta dla każdego** — nie ma bramki wejściowej ani weryfikacji na starcie.
- **"Lider" to status/tytuł, a nie sama rejestracja** — zdobywa się go dopiero poprzez awans w Drabince Lidera. Rozróżnienie: użytkownik zarejestrowany ≠ Lider.
- Lider definiowany jest przez **konkretną branżę/kompetencję** (np. IT, marketing, sprzedaż, zarządzanie projektami) — to nie jest uniwersalny tytuł dla dowolnego zawodu, tylko rola związana z przywództwem/zarządzaniem w konkretnych dziedzinach.

### 3.2 Ścieżka nowego / aspirującego Lidera

- Nowi użytkownicy **zaczynają od mniejszych, testowych zleceń**.
- Duże/wartościowe projekty odblokowują się dopiero na wyższych poziomach Drabinki.
- To jest mechanizm zaufania stopniowanego — analogiczny do ratingu na platformach freelance, ale sformalizowany w postaci poziomów.

### 3.3 Drabinka Lidera (7 poziomów — ustalone wcześniej)

Dwie równoważne ścieżki punktowania:
1. **Realizacja zleceń przez platformę** (praca płatna, jak w marketplace).
2. **Wkład w społeczność** — z naciskiem na **mentoring/odpowiadanie na pytania innych w module forum-like** jako najcenniejszy typ aktywności społecznościowej (wyżej niż same artykuły/case studies czy udział w webinarach).

Obie ścieżki mają **równą wagę** w awansie — platforma nie faworyzuje czystego transakcjonizmu kosztem społeczności ani odwrotnie.

### 3.4 Strona Firm

- **Rejestracja i publikacja zleceń bez weryfikacji** — każda firma może od razu po rejestracji zacząć zlecać pracę.
- To świadoma decyzja na rzecz szybkości i otwartości rynku na start; nie ma etapu onboardingu/zatwierdzania.

### 3.5 Zespoły między Liderami (nie z Firmami)

- **Priorytet drugorzędny.** Na start platforma działa jako marketplace 1:1 (Lider ↔ Firma).
- Tworzenie zespołów projektowych *między Liderami* na samej platformie leadersofteams.pl to **faza późniejsza**, nie MVP.
- (Odrębna sprawa: "założenie zespołu" jako nagroda za poziom — patrz punkt 4 — to insta jest MVP-istotne, ale dotyczy app.leadersofteams.com, nie zespołów wewnątrz marketplace'u).

## 4. Integracja z app.leadersofteams.com — mechanizm "level unlock"

To jest kluczowy element różnicujący ten projekt od zwykłego marketplace'u: **osiągnięcie odpowiedniego poziomu w Drabince odblokowuje darmowy dostęp do app.leadersofteams.com i możliwość założenia własnego zespołu.**

Ustalone:
- **Dwie osobne bazy danych, dwa osobne konta** (nie jedno wspólne konto/SSO w sensie technicznym).
- **Logowanie do app.leadersofteams.com ma być możliwe "przez leadersofteams.pl"** — czyli leadersofteams.pl pełni funkcję dostawcy tożsamości (identity provider) dla reszty ekosystemu, podobnie jak "Zaloguj się przez Google".
- **leadersofteams.pl jest źródłem prawdy** o poziomie użytkownika i uprawnieniach. app.leadersofteams.com jest konsumentem tej informacji — to tam znajduje się "nagroda", nie logika przyznawania poziomu.
- Konkretnie, **"założenie własnego zespołu" oznacza:** własny profil firmowy wewnątrz app.leadersofteams.com + możliwość zapraszania innych Liderów z platformy do tego zespołu.

Nierozstrzygnięte — do zaprojektowania przez Fable 5:
- Dokładny mechanizm techniczny przekazywania informacji o awansie (webhook, cykliczna synchronizacja, wspólny klucz API, czy inny wzorzec — właściciel nie ma preferencji technicznej, potrzebuje rekomendacji architektonicznej).
- Obsługa rozjazdów danych (co się dzieje, jeśli informacja o awansie nie dotrze do app.leadersofteams.com).
- Dokładny protokół logowania "przez leadersofteams.pl" (czy to ma być pełny OAuth2/OIDC, czy uproszczony wzorzec dopasowany do skali dwóch własnych aplikacji, a nie zewnętrznych integratorów).

## 5. Decyzje techniczne i ograniczenia

- **Cały projekt budowany od podstaw na VPS** (nie na hostingu współdzielonym, nie WordPress).
- Precedens technologiczny z reszty ekosystemu LoT (do rozważenia, nie narzucony sztywno): React 19, Node.js, Prisma ORM, PostgreSQL, Docker Compose + Traefik. Istniejący VPS Hostinger (srv1418832.hstgr.cloud) już hostuje app.leadersofteams.com w tym stacku — możliwe dołożenie nowego kontenera do istniejącego docker-compose, ale to decyzja architektoniczna do potwierdzenia przez Fable 5 (osobny VPS vs współdzielony).
- Płatności za zlecenia w MVP: **nierozstrzygnięte** — właściciel nie zdecydował jeszcze, czy MVP obsługuje płatności (Stripe/Przelewy24), działa jako czysty lead-gen bez przepływu pieniędzy przez platformę, czy model escrow. To wymaga osobnej decyzji biznesowej przed lub w trakcie projektowania architektury.
- Zakres MVP (co dokładnie wchodzi w pierwszą wersję: sam marketplace, sama Drabinka, czy od razu integracja z app.leadersofteams.com) — **nierozstrzygnięte przez właściciela**, zostawione do rekomendacji architektonicznej.

## 6. Analiza rynku: co kopiujemy, czego unikamy

Platforma czerpie mechaniki z trzech znanych wzorców, ale **żaden z nich nie może zostać skopiowany wprost** — musi powstać coś unikalnego, spójnego z misją LoT (walka z asymetrią wiedzy, transparentność, anty-eksploatacja).

**Z Fiverr/Upwork bierzemy:** model usług/zleceń, profile z portfolio, system ocen i opinii, wyszukiwarkę dopasowującą popyt i podaż.

**Z Oferteo bierzemy:** prosty przepływ "zleceniodawca publikuje potrzebę → wykonawcy odpowiadają ofertą" — dobrze dopasowany do polskiego rynku usług B2B.

**Z serwisów społecznościowych/networkingowych bierzemy:** profile budujące reputację, mentoring, wymianę wiedzy, forum-like moduł pytań i odpowiedzi.

**Czego świadomie unikamy — punkt krytyczny różnicujący projekt:**

Modele typu "Hustlers University" / "The Real World" (Andrew Tate) pokazują, jak *gamifikacja statusu* może zdegenerować się w strukturę przypominającą MLM: punkty i poziomy przyznawane są tam głównie za **rekrutację nowych członków i utrzymanie zaangażowania w aplikacji**, a nie za rzeczywistą, weryfikowalną wartość dostarczoną innym. To tworzy piramidę motywacyjną, gdzie awans zależy od "sprzedawania systemu dalej", a nie od kompetencji.

**Drabinka Lidera w LoT musi być fundamentalnie inna:**
- Punkty pochodzą wyłącznie z **dwóch źródeł uznaniowych przez innych ludzi**: zrealizowanych zleceń ocenionych przez Firmy, oraz realnego mentoringu/pomocy ocenianego przez innych Liderów. **Zero punktów za zapraszanie nowych użytkowników, zero prowizji za "downline", zero struktury poziomej opartej na rekrutacji.**
- Nagroda za awans (dostęp do app.leadersofteams.com + możliwość założenia zespołu) to **realne narzędzie pracy o wymiernej wartości rynkowej**, nie sztuczny status czy odznaka bez pokrycia.
- Transparentność mechaniki: użytkownik zawsze widzi dokładnie, za co dostał punkty i ile brakuje do progu — zgodnie z zasadami etycznej gamifikacji (opt-out z rankingów publicznych, brak dark patterns typu sztuczne liczniki czasu, fałszywy niedobór, presja społeczna).
- Brak mechanik "infinite engagement" (nieskończony scroll, wymuszone codzienne logowanie pod groźbą utraty statusu) — progres ma sens tygodniowy/miesięczny, dopasowany do rytmu pracy B2B, nie do rytmu mediów społecznościowych.

To jest jedno z najważniejszych ryzyk reputacyjnych projektu: platforma poświęcona liderom i transparentności nie może w praktyce działać jak zakamuflowany system MLM. Fable 5 powinien to traktować jako twardy wymóg produktowy, nie tylko sugestię.

## 7. Otwarte pytania dla Fable 5 (do zaadresowania w projekcie architektury)

1. Jaki wzorzec synchronizacji poziomów między leadersofteams.pl a app.leadersofteams.com jest optymalny przy dwóch osobnych bazach danych i umiarkowanej skali (nie tysiące integracji zewnętrznych, tylko dwie własne aplikacje)?
2. Jaki protokół logowania "przez leadersofteams.pl" ma sens (pełny OAuth2/OIDC vs uproszczony, dedykowany mechanizm)?
3. Czy nowa platforma powinna dzielić VPS/infrastrukturę z app.leadersofteams.com, czy działać na osobnym środowisku?
4. Rekomendacja dot. kolejności budowy MVP (marketplace solo → integracja później, czy pełny flow od dnia 1).
5. Rekomendacja dot. płatności — czy warto włączyć obsługę płatności już w MVP, biorąc pod uwagę ryzyko regulacyjne/PCI oraz szybkość wejścia na rynek.
6. Konkretna architektura pod 10 000 użytkowników na VPS: podział na warstwy (app/DB/cache/queue), czy modular monolith czy wydzielone serwisy od początku, strategia cachowania (Redis), indeksy i partycjonowanie w PostgreSQL, obsługa ruchu w czasie realnym (np. powiadomienia, moduł forum/mentoring) — WebSockets vs polling, oraz plan CI/CD z repo GitHub do wdrożenia na VPS.
7. Konkretny mechanizm antycypujący nadużycia systemu punktowego (np. sztuczne zlecenia między znajomymi w celu podbicia poziomu, fałszywe oceny) — potrzebne są guardraile antyfraudowe adekwatne do modelu opisanego w sekcji 6.

---

*Dokument przygotowany na podstawie serii pytań doprecyzowujących wizję produktu, zebranych przez Claude (Sonnet 5) w rozmowie z właścicielem LoT.*
