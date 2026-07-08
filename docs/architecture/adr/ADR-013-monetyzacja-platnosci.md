# ADR-013: Monetyzacja i płatności (rewizja ADR-006 i ADR-009)

**Status:** Zaproponowany (kierunek zaakceptowany przez właściciela 2026-07-08)
**Data:** 2026-07-08
**Decydenci:** Maciej Kucharski (decyzja: kursy płatne + prowizja platformy), Opus 4.8 (projekt)
**Rewiduje:** [ADR-006 (brak płatności w MVP)](ADR-006-platnosci-w-mvp.md) · [ADR-009 (0 zł)](ADR-009-zero-kosztow-zewnetrznych.md)
**Powiązane:** [ADR-011 (Polecenia)](ADR-011-program-polecen.md) · [ADR-012 (Academy)](ADR-012-academy-kursy.md) · [ADR-004](ADR-004-ledger-punktowy-i-antyfraud.md) · [RISKS R-15](../../RISKS.md)

## Kontekst

Do tej pory: ADR-006 — MVP nie procesuje pieniędzy (lead-gen); ADR-009 — polityka „0 zł" (żadnych
płatnych usług). Właściciel zdecydował wprowadzić **sprzedaż kursów (Academy, ADR-012) z prowizją
platformy** oraz — na tej samej infrastrukturze — **wypłaty za polecenia (ADR-011)**. To wymaga
realnego przepływu pieniędzy i integracji z operatorem płatności (PSP), a więc rewizji ADR-006 i ADR-009.

## Decyzja 1: Wyjątek od „0 zł" — koszt pokrywa przepływ transakcyjny, nie „użycie aplikacji"

ADR-009 zabrania płatnych usług, których koszt to „użycie aplikacji". Prowizje PSP są innej natury:
**płaci je przepływ transakcyjny** (procent od sprzedaży, która i tak przynosi przychód), a nie samo
działanie portalu. Utrzymujemy „0 zł" dla całej infrastruktury (baza, cache, kolejki, e-mail, backupy,
monitoring — bez zmian), a płatności są **jedynym, świadomym wyjątkiem**, uzasadnionym przychodowo.

## Decyzja 2: Operator płatności — split payout, bez custodialnego escrow na start

- **PSP: Przelewy24** jako główny (PL-first — niższe tarcie dla polskiego B2B, BLIK/przelewy),
  **Stripe** jako alternatywa/międzynarodowa. Oba OSS-friendly po stronie integracji (webhooki).
- **Model marketplace/split payout** (Przelewy24 Marketplace / Stripe Connect): środki trafiają do
  autora kursu pomniejszone o prowizję platformy, a **platforma nie trzyma środków jako powiernik**.
- **Świadomie BEZ własnego escrow custodialnego** na start — trzymanie cudzych środków to obowiązki
  KNF/AML/KYC i potencjalny wpis do rejestru pośredników płatniczych (R-15). Escrow od zleceń pozostaje
  na roadmapie jako późniejsze wzmocnienie (wzmacnia też antyfraud — ADR-006), gdy uzasadni to wolumen.

## Decyzja 3: Prowizja malejąca z poziomem Drabinki — jedyny dozwolony spój płaszczyzn

Take-rate platformy od sprzedaży kursu **maleje z poziomem Drabinki** autora (np. wyższy poziom → niższa
prowizja). To realizuje regułę spajającą z modelu Trzech Płaszczyzn ([strategia §4](../../strategy/DIFFERENTIATION-AND-GROWTH.md)):

> **Meryt (Płaszczyzna A) może obniżać koszt zarabiania (B). Nigdy odwrotnie — pieniądz nie kupuje statusu.**

Kierunek przepływu jest jednostronny i bezpieczny: poziom (zdobyty pracą i mentoringiem) czyni sprzedaż
tańszą (nagroda Płaszczyzny C/B), ale **zakupy, sprzedaż i polecenia nie dają ani jednego punktu
Drabinki**. Konkretne wartości take-rate na poziom — kamień decyzyjny właściciela (Decyzja 6).

## Decyzja 4: Moduł `billing` — jedyny punkt integracji PSP (granice ADR-002)

- Cała logika płatności, webhooków PSP, rozliczeń i wypłat mieszka w module `billing` (publiczne API
  `index.ts`). Inne moduły (`academy`, `referral`) komunikują się z nim przez zdarzenia/publiczne API,
  nigdy bezpośrednio z PSP.
- **Idempotencja i outbox**: webhooki PSP są at-least-once — konsumenci idempotentni (klucz = id
  zdarzenia PSP), stan płatności zmieniany atomowo z wpisem do outboxa (wzorzec ADR-007), jak reszta
  systemu.
- **Encje (schemat-forward)**: `Payment` (payerUserId, subjectType `COURSE`/`ORDER`, subjectId, gross,
  platformFee, net, `pspRef`, status), `Payout` (payeeUserId, amount, status, pspRef), `LedgerEntry`
  księgowy (osobny od `PointEvent` — to księga PIENIĘŻNA, nie punktowa). **Nie mylić z ledgerem punktowym
  Drabinki** — to dwie rozłączne księgi.
- Zdarzenia: `billing.payment_confirmed`, `billing.payment_refunded`, `billing.payout_sent` — konsumują
  `academy`, `referral`, `notifications`. **Nigdy `ladder`.**

## Decyzja 5: Granica z Drabinką i zgodność prawna

- **`billing.*` nie jest konsumowane przez `ladder`** (ADR-002 §5) — egzekwowane w `subscriptions.test.ts`.
  Pieniądz nie dotyka Drabinki w żadnym punkcie.
- **Zgodność (adres prawny właściciela)**: VAT/OSS na treści cyfrowe i faktury; 14-dniowe prawo
  odstąpienia od zakupu kursów (konsument) — spina się z karencją/clawbackiem nagród afiliacyjnych
  (ADR-011); regulamin sprzedaży i polityka zwrotów jako wsad prawny przed uruchomieniem płatności.
- **PCI**: dane kart nie przechodzą przez nasz backend — pełny redirect/elementy hostowane przez PSP
  (SAQ-A), zero przechowywania danych kartowych.

## Decyzja 6: Kamienie decyzyjne właściciela (kalibracja)

1. Wartości take-rate platformy na każdy poziom Drabinki (krzywa malejąca).
2. Kwota/procent i sufit nagrody afiliacyjnej + długość okna karencji (ADR-011).
3. Wybór PSP produkcyjnego (Przelewy24 vs Stripe) i model wypłat (harmonogram, próg minimalnej wypłaty).
4. Polityka zwrotów kursów i obsługa reklamacji (SLA moderacji, R-16).

## Konsekwencje

- (+) Realne linie przychodu: prowizja od kursów (start), później prowizja/escrow od zleceń, premium dla Firm.
- (+) Prowizja malejąca z poziomem nagradza meryt, nie łamiąc anty-MLM (jednostronny spój płaszczyzn).
- (+) Split payout minimalizuje obciążenie regulacyjne (brak custodii) i ryzyko PCI (SAQ-A).
- (−) Wejście w płatności to nowy obszar regulacyjny (VAT, konsument, AML po stronie PSP) — R-15,
  wymaga wsadu prawnego przed launchem monetyzacji.
- (−) Rewizja „0 zł": pojawia się koszt zmienny (prowizja PSP), ale tylko na transakcjach przynoszących
  przychód; infrastruktura pozostaje 0 zł.
- Implementacja po Fazie 1/2 (najpierw dojrzały produkt i realni użytkownicy) — kolejność w ROADMAP.
