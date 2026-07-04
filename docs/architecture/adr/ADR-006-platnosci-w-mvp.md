# ADR-006: Płatności — poza MVP (model lead-gen z formalnym cyklem życia zlecenia)

**Status:** Zaakceptowany (rekomendacja architektoniczna; brief zostawił decyzję otwartą)
**Data:** 2026-07-04

## Kontekst

Brief (sekcja 5 i 7, pyt. 5): właściciel nie rozstrzygnął, czy MVP obsługuje płatności (Stripe/Przelewy24), działa jako lead-gen bez przepływu pieniędzy, czy escrow. Jednocześnie system punktowy wymaga wiarygodnego sygnału "zlecenie zrealizowane" (ADR-004).

## Decyzja

**MVP nie procesuje pieniędzy.** Platforma działa jako marketplace kontaktowy (model Oferteo) z **formalnym, egzekwowanym cyklem życia zlecenia**:

```
DRAFT → PUBLISHED → (oferty Liderów) → AWARDED → IN_PROGRESS → DELIVERED
      → CONFIRMED (obustronne potwierdzenie) → RATED (ocena Firmy) → [punkty PENDING, ADR-004]
                     └→ DISPUTED → rozstrzygnięcie moderatora
```

- Rozliczenie następuje poza platformą (przelew, faktura — jak strony ustalą). Portal rejestruje **deklarowaną wartość zlecenia** (widełki) — potrzebną do progów punktowych i przyszłej prowizji.
- Punkty nalicza dopiero `RATED` po `CONFIRMED` przez **obie strony** — sygnał realizacji jest podwójnie uznaniowy nawet bez przepływu pieniędzy.
- Model danych od dnia 1 zawiera pola pod przyszłe płatności (`Order.declaredBudget`, `Order.settlementStatus`, encja przygotowana pod `Payment` w fazie 3+) — włączenie prowizji/escrow nie zmieni schematu domeny, tylko go rozszerzy.

## Uzasadnienie

1. **Szybkość wejścia na rynek**: integracja PSP (Przelewy24/Stripe) + escrow to tygodnie pracy oraz obowiązki regulacyjne (AML, KYC, pośrednictwo płatnicze — potencjalnie wpis do rejestru KNF przy modelu escrow). To realnie opóźnia start o miesiące przy zerowej pewności product-market fit.
2. **Cold-start marketplace'u**: na starcie najtrudniejsze jest zbudowanie podaży i popytu, nie monetyzacja. Prowizja od pierwszego dnia to tarcie hamujące oba końce rynku.
3. **System punktowy nie potrzebuje płatności**: wiarygodność "zrealizowanego zlecenia" zapewnia obustronne potwierdzenie + ocena + guardraile z ADR-004. (Płatność przez platformę wzmocniłaby ten sygnał — dlatego escrow pozostaje na roadmapie jako wzmocnienie antyfraudu, nie tylko monetyzacja.)
4. **Odwracalność**: to najłatwiej odwracalna z dużych decyzji — dodanie płatności w fazie 3 jest addytywne.

## Konsekwencje

- (+) Start szybszy o zakres pełnej integracji płatniczej; zero zakresu PCI/AML w MVP.
- (−) Brak przychodu transakcyjnego w MVP — monetyzacja wymaga osobnej decyzji biznesowej (prowizja od fazy 3, plany premium, lub inne) — poza zakresem tego ADR.
- (−) Sygnał realizacji zlecenia jest deklaratywny (choć obustronny) — ryzyko zmów adresuje ADR-004; wprowadzenie escrow w przyszłości dodatkowo je domknie.
- Decyzja do rewizji po 3 miesiącach od launchu na danych o wolumenie zleceń.
