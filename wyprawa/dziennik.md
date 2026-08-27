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
