# ADR-004: Ledger punktowy Drabinki Lidera i guardraile anty-MLM/antyfraudowe

**Status:** Zaakceptowany
**Data:** 2026-07-04

> To jest najważniejszy ADR projektu. Brief (sekcja 6) stawia twardy wymóg produktowy: Drabinka Lidera **nie może** działać jak gamifikacja typu MLM (Hustlers University / The Real World), gdzie awans napędza rekrutacja i zaangażowanie w aplikacji zamiast realnej wartości. Ten wymóg egzekwujemy **architektonicznie** — konstrukcją schematu danych i przepływów — a nie zapisem w regulaminie.

## Decyzja 1: Append-only ledger

Punkty istnieją wyłącznie jako niemutowalne wpisy w tabeli `PointEvent`:

- Wpis nigdy nie jest edytowany ani usuwany; korekta = nowy wpis z ujemną wartością wskazujący na wpis korygowany (`reversalOfId`).
- Saldo punktów i poziom użytkownika to **projekcja** (tabela `LadderState`) przeliczana przez worker po każdym zdarzeniu — nigdy nie jest źródłem prawdy, zawsze da się ją odtworzyć z ledgera.
- Każdy wpis ma pełne pochodzenie: typ, źródłowy obiekt (`sourceType` + `sourceId` — konkretne zlecenie/odpowiedź), przyznającego (kto ocenił/zaakceptował), timestamp, status.

## Decyzja 2: Zamknięta lista typów zdarzeń — anty-MLM w schemacie

`PointEventType` to **enum w bazie i w kodzie domeny**. Kompletna lista na start:

| Typ                         | Źródło wartości                                                      | Kto uznaje                 |
| --------------------------- | -------------------------------------------------------------------- | -------------------------- |
| `ORDER_COMPLETED_RATED`     | zrealizowane zlecenie z oceną                                        | Firma (zleceniodawca)      |
| `ORDER_REPEAT_CLIENT_BONUS` | kolejne zlecenie od tej samej Firmy (mniejsza waga, patrz Decyzja 4) | Firma                      |
| `ANSWER_ACCEPTED`           | odpowiedź zaakceptowana przez autora pytania                         | inny Lider                 |
| `ANSWER_UPVOTED_QUALIFIED`  | głosy w górę od użytkowników spełniających próg wiarygodności        | inni Liderzy               |
| `MENTORSHIP_SESSION_RATED`  | sesja mentoringowa oceniona przez mentee (faza ≥ 2)                  | inny Lider                 |
| `ADJUSTMENT_MODERATION`     | korekta moderacyjna (może być ujemna)                                | moderator, z uzasadnieniem |

Właściwości tej konstrukcji:

1. **Nie istnieje typ zdarzenia za zaproszenie, rekrutację, polecenie, "aktywność", logowanie, streak ani konsumpcję treści.** Dodanie takiego typu wymaga migracji schematu + zmiany enuma w kodzie + przejścia przez ten ADR — nie da się tego zrobić konfiguracją ani po cichu.
2. **Każdy punkt wymaga uznania przez innego człowieka** (Firma ocenia zlecenie, Lider akceptuje/głosuje na odpowiedź). System sam z siebie nie generuje punktów. To jest wprost mechanika z briefu: "dwa źródła uznaniowe przez innych ludzi".
3. **Dwie ścieżki mają równą wagę**: definicje progów poziomów (`LevelDefinition`) wymagają do awansu punktów, ale mechanika wag jest skalibrowana tak, by pełnoetatowy wkład w każdą ze ścieżek dawał porównywalne tempo awansu; dodatkowo od poziomu 4 w górę wymagany jest **minimalny wkład z obu ścieżek** (np. ≥ 20% punktów z każdej), żeby najwyższe poziomy oznaczały i praktyka, i mentora. Wagi trzymane w wersjonowanej konfiguracji (`LevelDefinition.rulesetVersion`) — każda zmiana reguł jest audytowalna i nie działa wstecz.

## Decyzja 3: Cykl życia punktu — okno karencji

```
zdarzenie źródłowe → PointEvent(status=PENDING) → [okno karencji 7 dni] → CONFIRMED → przeliczenie LadderState
                                    │
                                    ├─ reklamacja / spór → HOLD → rozstrzygnięcie moderatora
                                    └─ sygnał antyfraudowy → HOLD → kolejka moderacyjna
```

- Punkty w statusie `PENDING`/`HOLD` są widoczne dla użytkownika (transparentność), ale nie liczą się do awansu.
- Awans na poziom następuje wyłącznie z punktów `CONFIRMED` — to zamyka wektor "szybkie fikcyjne zlecenie → natychmiastowy awans → nagroda w app zanim ktokolwiek zauważy".

## Decyzja 4: Guardraile antyfraudowe

Zaprojektowane przeciw konkretnym wektorom nadużyć (brief, sekcja 7, pyt. 7):

**Wektor: sztuczne zlecenia między znajomymi / własnymi firmami**

- **Malejące zwroty od tego samego kontrahenta**: n-te punktowane zlecenie od tej samej Firmy dla tego samego Lidera ma wagę `max(0.1, 0.5^(n-1))` w oknie kroczącym 12 miesięcy. Podbijanie poziomu jedną zaprzyjaźnioną firmą staje się wykładniczo nieopłacalne, a naturalna stała współpraca wciąż jest doceniana.
- **Detekcja wzajemności**: worker antyfraudowy utrzymuje graf relacji Firma↔Lider i flaguje: pary o anomalnie wysokiej wzajemnej aktywności, cykle (A zleca B, B zleca A przez inną firmę), Firmy zlecające wyłącznie jednemu Liderowi od rejestracji, wspólne sygnały techniczne kont (heurystyki rejestracyjne). Flaga ⇒ `HOLD` + `ModerationCase`; człowiek rozstrzyga.
- **Próg dojrzałości konta Firmy**: oceny od Firmy młodszej niż 14 dni lub bez uzupełnionego profilu wchodzą z obniżoną wagą do czasu zbudowania historii.

**Wektor: fałszywe oceny / kupione głosy w Q&A**

- Głos w górę liczy się do `ANSWER_UPVOTED_QUALIFIED` tylko od użytkownika spełniającego próg wiarygodności (konto ≥ 14 dni + własna minimalna historia aktywności) — świeże konta mogą głosować (UX), ale ich głosy nie generują punktów.
- Malejące zwroty również tutaj: punkty za akceptacje/głosy od tego samego użytkownika podlegają tej samej krzywej wygaszania.
- Limity szybkości naliczania: dzienne/tygodniowe czapki punktów z Q&A — chronią przed farmami i jednocześnie realizują wymóg briefu "progres tygodniowy/miesięczny, nie dopaminowy".

**Wektor: degeneracja w mechaniki engagement (wymóg anty-MLM wprost)**

- Brak punktów za obecność: żadnych streaków, dziennych logowań, "spal albo strać". Poziom raz zdobyty **nie wygasa** z powodu nieaktywności.
- Brak dark patterns w warstwie produktowej: zero fałszywych liczników, zero sztucznego niedoboru; publiczne rankingi wyłącznie opt-in/opt-out zgodnie z briefem.
- **Pełna transparentność**: ekran "Moje punkty" pokazuje każdy wpis ledgera (za co, ile, od kogo, status, dlaczego waga obniżona) oraz dokładny dystans do następnego progu. Reguły punktacji są publicznie opublikowane na stronie portalu.

## Decyzja 5: Audytowalność

- Logika naliczania mieszka wyłącznie w module `ladder` (ADR-002) — jeden punkt audytu.
- Testy własnościowe (property-based) inwariantów: „suma projekcji = suma ledgera", „żaden typ zdarzenia spoza enuma", „awans tylko z CONFIRMED", „malejące zwroty monotoniczne".
- Zmiany `rulesetVersion` wymagają wpisu w CHANGELOG reguł widocznym publicznie.

## Konsekwencje

- (+) Wymóg anty-MLM jest niemożliwy do obejścia bez jawnej, audytowalnej zmiany schematu i tego dokumentu.
- (+) Każdy punkt ma człowieka-poręczyciela i obiekt źródłowy — spory są rozstrzygalne na danych.
- (−) Okno karencji opóźnia gratyfikację o 7 dni — akceptowalne w rytmie B2B (i zgodne z briefem: progres tygodniowy/miesięczny).
- (−) Kalibracja wag dwóch ścieżek wymaga iteracji po realnych danych — stąd wersjonowany ruleset i wagi w konfiguracji, nie w kodzie.
