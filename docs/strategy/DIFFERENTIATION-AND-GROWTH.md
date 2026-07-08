# Strategia wyróżnika i wzrostu Leaders of Teams

**Status:** Kierunek zaakceptowany przez właściciela · **Data:** 2026-07-08
**Powiązane:** [brief §6](../../brief-leadersofteams-platforma.md) · [ADR-004 (Drabinka/anty-MLM)](../architecture/adr/ADR-004-ledger-punktowy-i-antyfraud.md) · [ADR-011 (Polecenia)](../architecture/adr/ADR-011-program-polecen.md) · [ADR-012 (Academy)](../architecture/adr/ADR-012-academy-kursy.md) · [ADR-013 (Monetyzacja)](../architecture/adr/ADR-013-monetyzacja-platnosci.md) · [RISKS R-02](../RISKS.md)

Ten dokument jest **nadrzędny produktowo**: opisuje, czym LoT różni się od konkurencji, jak
przyciąga ludzi i jak łączy naukę, pracę, status, nagrody i zarabianie — **bez stawania się MLM**.
Decyzje techniczne wynikające z tego kierunku są spisane w ADR-011/012/013.

---

## 1. Dla kogo i po co

Dwie grupy, jedna sieć:

- **Aspirujący liderzy** — chcą się uczyć, zdobyć pierwsze zlecenia, zbudować reputację i awansować.
- **Liderzy budujący zespoły** — chcą uczyć, sprzedawać kursy, rekrutować do przedsięwzięć i zarabiać.

LoT jednoczy ludzi wokół jednej obietnicy: **realna wartość, którą dostarczasz innym, zamienia się w
realną władzę ekonomiczną** — większe zlecenia, dostęp do narzędzi (app.leadersofteams.com), prawo
zbudowania zespołu i niższą prowizję. Nie w próżny status, nie w piramidę.

## 2. Teza wyróżnika (fosa)

> **LoT to jedyne miejsce, gdzie reputacja jest ekonomicznie realna, a statusu nie da się kupić ani
> wyrekrutować — tylko zapracować.**

Droga jest **zintegrowana pionowo** — nikt inny nie łączy wszystkich etapów w jednym produkcie:

```
Ucz się          →  Udowodnij        →  Wspinaj się      →  Ucz/Mentoruj     →  Odblokuj          →  Buduj
(Academy: kursy)    (małe zlecenia)     (Drabinka —         (Q&A/mentoring —    (darmowy SaaS +      (własny zespół,
                                         merytokracja)       druga ścieżka       prawo zespołu)        rekrutacja ról)
                                                             punktowa)
```

Każdy etap zasila kolejny: kursy przyciągają aspirujących → mali zaczynają od testowych zleceń →
oceniona praca i uznany mentoring windują poziom → wysoki poziom odblokowuje narzędzia i zespół →
zespół tworzy nowe zlecenia i miejsca dla kolejnych. To zamknięta pętla wartości, nie lejek rekrutacji.

## 3. Krajobraz konkurencji i nasza luka

| Wzorzec                      | Co ma                                   | Czego mu brakuje (nasza luka)                                          |
| ---------------------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| Fiverr / Upwork              | transakcje, oceny                       | brak drabiny rozwoju, brak nauki, wyścig cenowy na dno                 |
| Oferteo                      | prosty przepływ zleceń (PL)             | brak społeczności, rozwoju, statusu                                    |
| Udemy / Teachable            | kursy                                   | twórca solo; kurs nie prowadzi do pracy ani przywództwa                |
| LinkedIn                     | networking, profil                      | metryki próżności; brak bramki merytorycznej i drogi do zarobku        |
| „Hustlers University" (Tate) | gejmifikowany status, energia wspólnoty | **status = MLM**: punkty za rekrutację i zaangażowanie, nie za wartość |

**Pozycjonowanie LoT: etyczna, merytoryczna alternatywa — „anty-Tate".** Ta sama energia rozwoju i
wspólnoty, ale status jest niekupowalny i naprawdę coś znaczy. To ostry, zawłaszczalny brand i wprost
odpowiedź na największe ryzyko reputacyjne projektu (R-02: „to wygląda jak MLM").

## 4. Rdzeń etyczny: model Trzech Płaszczyzn

Aby połączyć naukę, zarabianie i polecenia bez piramidy, LoT rozdziela **trzy płaszczyzny, które
nigdy nie wymieniają się między sobą**:

### Płaszczyzna A — Status / Drabinka (merytokracja) — NIENARUSZALNA

Zdobywana **wyłącznie** przez uznaną przez drugiego człowieka wartość: ocenione płatne zlecenia +
zaakceptowany mentoring (Q&A). **Nigdy** za wydane pieniądze, kupione/ukończone kursy czy zaproszonych
ludzi. Odblokowuje większe zlecenia, dostęp do app.leadersofteams.com, prawo założenia zespołu i
**niższą prowizję platformy**. Egzekwowana konstrukcją: zamknięty enum `PointEventType`, ledger
append-only, `ladder` subskrybuje wyłącznie `marketplace.*`/`community.*` ([ADR-004](../architecture/adr/ADR-004-ledger-punktowy-i-antyfraud.md)).

### Płaszczyzna B — Pieniądz

Realna gotówka za realną wartość: sprzedaż własnych kursów (Academy), realizacja zleceń, w przyszłości
wyniki zespołu. **Polecenia żyją tutaj** — jako afiliacja jednopoziomowa, nie MLM ([ADR-011](../architecture/adr/ADR-011-program-polecen.md)).
Monetyzacja i płatności: [ADR-013](../architecture/adr/ADR-013-monetyzacja-platnosci.md).

### Płaszczyzna C — Nagrody / Uznanie

Odznaki umiejętności, poziomy „Verified", wyróżnienie w wyszukiwarce, lepsze warunki. Bramkowane
**wyłącznie Płaszczyzną A** (merytem). Nigdy kupowane, nigdy z poleceń.

**Reguła spajająca (jedyny dozwolony kierunek przepływu):** meryt (A) może obniżać koszt zarabiania
(B) — wyższy poziom = niższa prowizja. Nigdy odwrotnie: pieniądz i polecenia **nie kupują** statusu.

## 5. Diagnostyka MLM — i dlaczego LoT nim nie jest

Co NAPRAWDĘ czyni system MLM-em (a nie samo słowo „poziomy" czy „polecenia"):

| Cecha MLM                                         | Jak LoT tego unika                                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1. Wynagrodzenie za samą rekrutację               | Zero wypłat za rejestrację/zaproszenie. Płaci dopiero **realna transakcja** zaproszonego (ADR-011) |
| 2. Wielopoziomowe nadpłaty od „downline"          | **Głębokość = 1, twardo w schemacie.** Brak drzewa, brak override od rekrutów rekruta              |
| 3. Dochód z rekrutacji, nie ze sprzedaży wartości | Dochód z pracy, kursów i **jednorazowej** afiliacji od pierwszej transakcji — realnej wartości     |
| 4. Pay-to-play / kupowanie wejścia                | Rejestracja i zapraszanie darmowe; zarobek wymaga, by zaproszony sam z siebie kupił/zrealizował    |
| 5. Ranga zależna od wielkości struktury           | Ranga (poziom) **wyłącznie** z ocenionej pracy i mentoringu; zaproszenia = 0 punktów               |

To dowód **konstrukcyjny**, nie deklaracja w regulaminie: żeby zamienić LoT w MLM, trzeba by jawnie
zmienić schemat bazy i przejść przez rewizję ADR-004 — nie da się tego zrobić konfiguracją ani po cichu.

## 6. Wzrost bez piramidy

- **Program Poleceń (afiliacja 1-poziomowa)** — jednorazowa, ograniczona nagroda pieniężna, gdy
  zaproszony dokona pierwszej realnej transakcji. Klasyczna, legalna afiliacja twórców — nie piramida
  (ADR-011).
- **Academy jako magnes i lek na cold-start** — kursy (płatne i darmowe) przyciągają aspirujących
  liderów i dają im pierwszy powód, by wejść, zanim marketplace ma płynność (mityguje R-06). Ukończenie
  kursu daje **odznakę umiejętności** (Płaszczyzna C), nie punkty Drabinki (ADR-012).
- **Nagrody merytoryczne jako „pull"** — jawna tabela odblokowań na każdy poziom (od małych zleceń, przez
  wyróżniony profil i odznakę „Verified", po niższą prowizję, darmowy dostęp do app i prawo zespołu).
  Ekran „Moje punkty" pokazuje dokładny dystans do następnego odblokowania (już zbudowane).

## 7. Zdania komunikacyjne launchu (adresują R-02 wprost)

- **Nagłówek:** „Status, którego nie da się kupić ani wyrekrutować — tylko zapracować."
- **Rozwinięcie:** „W LoT zarabiasz na realnej wartości: swojej pracy, swoich kursach i jednorazowo na
  poleceniu, które zamieniło się w realną transakcję. Nigdy na czyimś »downline«. Twój poziom rośnie
  wyłącznie wtedy, gdy inny człowiek doceni to, co dla niego zrobiłeś."
- **Dla sceptyka:** „Zasady punktacji są publiczne, a każdy punkt w Twojej księdze pokazuje, za co i od
  kogo. Zaproszenia dają 0 punktów — sprawdź w kodzie."

## 8. Co pozostaje nienaruszalne

Cały ten kierunek dokłada **nowe płaszczyzny obok Drabinki, nigdy w niej**. Drabinka (ADR-004) zostaje
bez zmian: zamknięty enum źródeł punktów, ledger append-only, `ladder` konsumuje wyłącznie
`marketplace.*`/`community.*`. Nowe moduły (`academy`, `referral`, `billing`) nie mają żadnej krawędzi
zdarzeń do `ladder` — egzekwowane testem subskrypcji, dokładnie jak dla `groups`/`teams`.
