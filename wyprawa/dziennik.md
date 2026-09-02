# Dziennik wyprawy — Portal, oczami Konrada

> Zapis na bieżąco, w trakcie klikania. Wpisy chronologiczne. Obserwacje,
> które są BŁĘDEM, idą też do `zgloszenia.jsonl` (prefiks `W-`); tutaj ląduje
> wszystko — łącznie z tarciem niebędącym błędem („zawahałem się", „szukałem").
>
> Szablon wpisu:
>
> ## <etap> (<czas>, <viewport>)
>
> - **Co robiłem:**
> - **Co było mylące / gdzie się zawahałem:**
> - **Czego nie znalazłem:**
> - **Tarcie niebędące błędem:**
> - **Co zaskoczyło pozytywnie:**
> - **Rekomendacja:**

## Dzień 0 — rejestracja → profil → usługa → pierwszy cykl → Q&A (22.08, 390 px)

- **Co robiłem:** rejestracja 5 person przez bramkę anty-bot (API, PoW liczony w Node);
  kreator Lidera; publikacja usługi; pełny cykl zlecenia z „Kwiatkowscy Wnętrza"
  w całości w UI; pytanie+odpowiedź+akceptacja w grupie „Zarządzanie projektami".
- **Co było mylące / gdzie się zawahałem:**
  - Kreator, krok 2: komunikat walidacji jest zbiorczy — „Wybierz branżę i napisz jedno
    zdanie…", choć branża BYŁA wybrana. Kazał mi sprawdzać coś, co już zrobiłem.
  - Po wysłaniu pytania w grupie zostaję na liście pytań bez wyraźnego „jesteś tu,
    twoje pytanie na górze" (do potwierdzenia ręcznie — mój automat mógł nie kliknąć).
- **Czego nie znalazłem:** ekranu „Twoja oferta czeka" po złożeniu oferty — trzeba
  wrócić na zlecenie, żeby zobaczyć status (jest /panel/oferty, ale nic mnie tam nie
  zaprowadziło po akcji).
- **Tarcie niebędące błędem:** formularz usługi wymaga pakietu z zakresem min. 10 znaków
  — słusznie, ale pole „Zakres" jest pod ceną/terminem i łatwo je przewinąć na 390 px.
- **Co zaskoczyło pozytywnie:**
  - Formularz zlecenia: „powstaje jako szkic — opublikujesz po sprawdzeniu treści" —
    dokładnie mówi, co się stanie. Publikacja usługi: create+publish jednym submitem,
    zero zbędnych kroków.
  - Przy ocenie współpracy UI TŁUMACZY publikację symultaniczną („druga strona zobaczy
    Twoją ocenę dopiero, gdy sama oceni — to chroni przed ocenami odwetowymi"). Wzorowe.
  - Cały cykl zlecenia (utwórz→opublikuj→oferta→akcept→start→oddaj→potwierdź→2 opinie)
    na JEDNEJ stronie /zlecenia/[id] — przyciski pojawiają się wg stanu i roli.
- **Pomiar:** cykl w UI = ~9 ekranów, 0 błędów konsoli, 0 spraw moderacyjnych;
  punkty: 50 (zlecenie, ×0,5 bo firma <14 dni — wyjaśnienie wagi WIDOCZNE w księdze)
  - 50 (akceptacja) = 100 PENDING „Karencja (7 dni)".
- **Rekomendacja:** po złożeniu oferty — toast/link „Śledź w Moich ofertach";
  komunikat kroku 2 kreatora rozbić per pole.

## Dzień 7 — awans L1 + kompresja czasu (23.08)

- **Co robiłem:** dojrzały punkty (worker + narzędzie czasu), awans na Adepta;
  kolejne cykle od firma2/firma3; wpis „dzień 7".
- **Co zaskoczyło pozytywnie:** powiadomienie „Awans w Drabince Lidera — poziom 1"
  - panel /panel/punkty pokazuje rozbicie zaliczone/karencja i zapowiedź nagrody
    („Na poziomie 5 czeka nagroda: dostęp do aplikacji LOT"). Księga z wyjaśnieniem
    wagi (×0,5 młoda firma) — pełna transparentność, dokładnie jak obiecuje /drabinka.
- **Ściana szerokości (CECHA, nie błąd):** malejące zwroty per kontrahent + próg
  „firma ≥14 dni" + wymóg 20% z każdej ścieżki od L4 sprawiają, że z wąskim kręgiem
  kont nie da się dojść wysoko. To dokładnie anty-MLM w działaniu — świetne dla
  produktu, warte podkreślenia w komunikacji.

## Faza App — prowadzenie zespołu (23.08, 390 px, dark)

- **Co robiłem:** rejestracja w App, kreator właściciela (pełne 4 kroki — S18
  potwierdzone: Team✓/Profil/Pipeline/Zaproszenia), zespół „Jaworowski Consulting",
  5 leadów, pipeline 60 500 zł.
- **Co zaskoczyło pozytywnie:** CRM na 390 px czyta się znakomicie — karty kciukiem,
  pipeline na pierwszym ekranie, ciemny motyw. Program designu D1–D5 widać w praktyce.
- **Tarcie / rekomendacja:** po utworzeniu leada „następny krok" nie jest widoczny
  od razu na karcie — trzeba wejść w szczegóły (zapisane jako obserwacja do App).
- **Zgłoszenie W-01 (naprawione w tej sesji):** kreator Portalu, krok 2 — komunikat
  walidacji był zbiorczy („wybierz branżę I napisz…") mimo wybranej branży. Rozbity
  per pole.

## Audyt PM — dwa zgłoszenia właściciela (27.08, 390 px)

- **Co robiłem:** jako zalogowany Konrad wszedłem na `/` (tak, jak klika się logo);
  obejrzałem panel w poszukiwaniu przełącznika motywu.
- **Potwierdzone zgłoszenie 1:** zalogowany na `/` zostaje na landingu sprzedażowym,
  a stopka pokazuje mu „Załóż konto | Zaloguj się" — sesja przy tym ŻYJE
  (`/panel` wita „Cześć, Konrad Jaworowski"). Wygląda jak wylogowanie, choć nim nie jest.
  Zrzut: `zrzuty/audyt-pm-2708-zalogowany-na-glownej-390.png`.
- **Potwierdzone zgłoszenie 2:** żadnego przełącznika motywu w całym UI
  (panel, stopka — zero trafień „jasny/ciemny/motyw"), `<html>` bez `data-theme`,
  tło `rgb(10 11 18)` na twardo. Portal jest dark-only.
- **Plan naprawy:** sprint P1 (redirect `/`→`/panel` w middleware + stopka świadoma
  sesji) i P2 (pełny motyw jasny) — plan sesji PM 27.08.
- **DOMKNIĘTE (dopisek 01.09):** oba zgłoszenia naprawione i wdrożone tego samego
  dnia — `0b61242` (P1: `/`→`/panel`, stopka zna sesję) i `a222a30` (P2: motyw jasny,
  przełącznik Ciemny/Jasny/Systemowy w stopce). Zweryfikowane na prodzie 01.09
  (przełącznik widoczny na każdym zrzucie wyprawy).

## Dzień genialnego Lidera — realne interakcje (01.09, 390 px)

Zgoda właściciela z tej sesji: persony MOGĄ dotykać realnych treści (uchylona
zasada „Macix nietykalny" w zakresie treści publicznych; bez pętli wzajemności).

- **Co robiłem (Konrad):** oferta na PIERWSZE realne zlecenie Portalu — „Marketing"
  HydroSpark (Macix, 10 dni bez ofert): pakiet startowy 1200 zł / 14 dni, uczciwie
  dopasowany do widełek 500–1500 zł. `offers` → SUBMITTED, outbox `offer_submitted`
  → powiadomienie in-app dla firmy. Licznik ofert 0→1.
- **Wizytówka:** bio profilu Lidera (było puste) + 2 pozycje portfolio z realnych
  zleceń wyprawy; publiczny profil `/liderzy/…` wygląda teraz wiarygodnie
  (3 zlecenia, 5/5, portfolio). 2 wpisy w feedzie (rytm follow-upów; lekcja małego
  budżetu). Cykl Q&A w grupie Sprzedaż: pytanie Michała → odpowiedź Konrada →
  akceptacja. Punkt: **25 pkt PENDING** (×0,5 od tego samego uznającego — anty-fraud
  działa dokładnie wg projektu). Obaj dołączyli do grupy przez UI (join → ACTIVE).
- **Worker potwierdzony bojowo:** 2×50 pkt z 23.08 dojrzały same ~30.08 —
  saldo 200 CONFIRMED bez ręcznego dojrzewania. Pytanie z 23.08 rozstrzygnięte.
- **Co myliło / zgłoszenia:** W-02 „Zgłoś" na zleceniu czyta się jak „aplikuj"
  (mobile, nad formularzem oferty); W-03 profil Lidera nie linkuje jego usług
  (ślepa uliczka firma→oferent→usługa); W-04 po publikacji wpisu autor go nie
  widzi (domyślna zakładka „Obserwowani" bez własnych wpisów = pusty stan);
  W-05 pusty stan pytań zachęca „Zadaj pierwsze" nie-członka bez ścieżki dołączenia.
- **Tarcie niebędące błędem:** przy load>90 na VPS (równoległy build App) submit
  odpowiedzi padł na sieci — UI pokazał generyczne „Coś poszło nie tak.", ale
  ZACHOWAŁ treść w polu (dobrze); retry przeszedł. Duże formularze przeżywają
  błąd sieci — to się chwali.
- **Pozytywne zaskoczenie:** stopka z przełącznikiem motywu na każdej stronie
  (P2 z 27.08 żyje na prodzie); wątek po akceptacji dostaje badge „Rozwiązane"
  i podpowiedź o punktach — pętla Drabinki jest czytelna od strony pytającego.
- **Rekomendacja:** oferta czeka po stronie Macixa — dalszy ciąg (rozmowa,
  akceptacja) powinien poprowadzić człowiek; sprawdzić za 48 h, czy Macix
  zareagował (powiadomienie 11+ nieprzeczytanych — patrz W-obserwacja: badge
  powiadomień u Konrada pokazuje 11, u Michała 2 — warto kiedyś przejść pełny
  przebieg czytania powiadomień).

## Obserwacja produktowa (01.09, sesja rozwojowa)

- **Brak kanału rozmowy przy ofercie na zlecenie:** firma może ofertę wyłącznie
  przyjąć („Wybierz tę ofertę") albo zignorować — nie ma jak dopytać oferenta,
  a Lider nie ma jak doprecyzować. Przy usługach ten kanał ISTNIEJE (zapytanie
  → wiadomości → konwersja na zlecenie). Asymetria uderza dokładnie w pierwszą
  realną transakcję: Macix dostał ofertę z pytaniami, na które nie ma gdzie
  odpowiedzieć. Do decyzji właściciela (ADR-010 ogranicza komunikatory — ale
  wątek przy ofercie to lustro inquiry, nie DM).

## Naprawy z wyprawy wdrożone (02.09)

W-02..W-05 naprawione, przeszły komplet bramek (217 testów API, 23 e2e — suita
urosła z 15) i są NA PRODUKCJI, zweryfikowane przeglądarką Konrada na 390 px:
oś „Obserwowani" pokazuje własne wpisy (koniec znikających postów), profil
Lidera ma sekcję „Usługi Lidera" z kartą usługi, zlecenie mówi „Zgłoś
nadużycie", a nie-członek grupy dostaje na stronie pytań kartę z przyciskiem
dołączenia. Zrzuty: weryfikacja-w0*-390.png. Deploy: staging → prod, backup
portal-20260902-085022, healthz ok, worker żyje, zero migracji.
