# Makiety V17 PRO Portalu

- `wspolne.css`, `wspolne.js` — rama z LoT App (kopia 19.11); w `wspolne.js` menu Portalu (`MENU_LIDER`, `DOL_LIDER`; gość = `data-rola="gosc"`).
- `fixtura-portal.js` — WYGENEROWANE: `node audyt/harness/v17-fixtura-portal.mjs`. Dane wyłącznie fikcyjne.
- Ekran: `<ekran>.html` z `<body data-ekran="Panel">`, `<link rel="stylesheet" href="wspolne.css">`, `<script src="fixtura-portal.js">`, `<script src="wspolne.js">`.
- Zrzuty: `node audyt/harness/v17-makiety-zrzuty.mjs docs/redesign-propozycje/v17/<ekran>.html <ekran> [stany…]` → `audyt/zrzuty/v17-<ekran>-*.png`.
- Makiety ładują fonty z Google Fonts i Phosphor z unpkg — WOLNO tylko tutaj (pliki lokalne). W kodzie Portalu: `next/font` + `@phosphor-icons/react` (ADR-009).

## Poprawki z kodu
| Data | Ekran | Co w makiecie było nie tak | Poprawka | Zgłoszone Maciejowi |
|---|---|---|---|---|

## Poprawki z kodu — P1 „Rynek” (25.11, za `?wyglad=v17` / ciasteczkiem `lot_wyglad=v17`)

Kod `/zlecenia`, `/zlecenia/[id]`, `/uslugi`, `/uslugi/[slug]` odtwarza makietę. Różnice poniżej wynikają z **braku pola w bazie** albo z **prawdy o produkcie** i są świadome:

| Miejsce | Makieta | Kod | Powód |
|---|---|---|---|
| Wiersz zlecenia | miasto, „wykonanie do”, „zbiera do” | brak | model `Order` nie ma miasta ani terminów |
| Szczegóły zlecenia | „Zakres”, miejsce, „zbiera oferty do” | opis jednym blokiem, budżet, branża, poziom, status | j.w. |
| Filtr „Poziom oferenta” | trzy opcje, pierwsza zaznaczona | trzy opcje, **żadna** zaznaczona z góry | zaznaczenie „Bez wymagań” z góry ukrywałoby zlecenia z wymogiem, a makietowa lista je pokazuje; reset przez „Wyczyść filtry” |
| Tabela ofert — gość i Lider spoza firmy | tabela (widok firmy) | w miejscu tabeli: liczba ofert + „Zaloguj się jako firma, by porównać oferty” (gość) albo „Treść ofert widzi tylko firma” (zalogowany) | API ujawnia treść ofert wyłącznie firmie zlecającej; nie odsłaniamy więcej niż dziś |
| Tabela ofert — firma | punkty oferenta, „ostatnia: …” | poziom i średnia ocen z `GET /leaders/:id` | lista ofert nie niesie punktów ani ostatniej oceny |
| Pakiet usługi | „Zleć pakiet X · cena” | „Zapytaj o pakiet X · cena”; formularz zapytania rozwija się dopiero po kliknięciu; gość → logowanie z powrotem (`?next=`) | w Portalu nie ma zamówienia pakietu — jest zapytanie, które Lider zamienia w zlecenie; „Zleć” obiecywałoby zakup |
| Pakiet usługi | „Wizyty” | brak | brak pola w bazie |
| Usługa — tagi | brak w makiecie | usunięte z widoku v17 | makieta nie ma tagów |
| Okładki kategorii | HVAC, PV, elektryka… | własna ikona dla każdej z 10 kategorii produkcji (AI, UX, e-commerce, finanse, HR, IT, marketing, logistyka, sprzedaż, projekty) | słownik branż Portalu jest szerszy niż makiety; zapasowy piorun tylko dla nieznanych |
| Usługa — „Oceny po zleceniach” | „Pokaż więcej · 3 z 31” jako przycisk | tekst „3 z N” bez przycisku | nie ma jeszcze strony pełnej listy ocen |
| Ulubione (gwiazdka) | brak w makiecie | pominięte w karcie v17 | lista jest publiczna (bez cookies), więc stan „zapisana” byłby nieprawdziwy |
| Szczegóły zlecenia — wiersze tabeli danych | Budżet, Wykonanie do, Miejsce, Zbiera oferty do, Poziom oferenta | Budżet, Branża, Poziom oferenta, Status | Zlecenie nie ma miejsca ani terminów w bazie; „Branża” i „Status” to realne pola |
| Szczegóły zlecenia — „Anuluj zlecenie” | brak | przycisk drugorzędny w nagłówku, obok wiersza firmy (tylko firma zlecająca; oraz „Opublikuj”, „Potwierdź wykonanie”, „Zgłoś spór” wg statusu) | istniejąca funkcja (anulowanie przez firmę) — usunięcie byłoby regresją |
| Tabela ofert — „Zapytaj Lidera →” | brak | drugorzędny link pod treścią oferty (liczba wiadomości, gdy są) | istniejąca funkcja (wątek wiadomości firma ↔ oferent, PL1) — usunięcie byłoby regresją |
| Tabela ofert — oferent bez poziomu (L0) | makieta pokazuje wyłącznie oferentów z poziomem | te same szare szczebelki i „Nowy w Portalu”, „0 pkt” | stan, którego makieta nie ma (realnie większość oferentów to nowi); punkty z publicznej Osi światła przez handle |
| Filtry Budżet i Poziom oferenta — liczniki | liczniki | liczniki z API (`budgetCounts`, `levelCounts`, osiem `count()` na zapytanie, liczone z pozostałych filtrów) | jak liczniki branż; przedziały budżetu nakładają się (zlecenie z widełkami 4–8 tys. zł liczy się w dwóch) |
| Liczniki list | „8 z 31” | „N z M” z `total` API | zgodnie z makietą (dodane pole `total`) |
