# V17 PRO — język „Światło” (makieta 20.11.2026)

Druga próba P0 po uwadze Macieja do makiety P0′: „No napewno nie wygląda to jak V17 PRO a bardziej jak V7. Musimy doprowadzić
design do perfekcji, inspiruj się od najlepszych.” Tę makietę przygotował Lider (Opus), a nie sesja robocza.

## Co było nie tak w P0′ (diagnoza ze zrzutów)

1. Wszystkie wpisy wyglądały tak samo: tekst + szara karta. Zlecenie, pytanie, realizacja i usługa nie różniły się niczym.
2. Zamiast twarzy były inicjały w kółku, a firmy miały jedną wspólną ikonę budynku. Przez to „kto dał światło” nie miało twarzy.
3. Typografia nie miała skali: wszystko 14–16 px, nagłówki ledwo większe od tekstu.
4. Drabinka była listą tekstu, w której „bez nowych uprawnień” powtarzało się 5 razy.
5. Okładki realizacji to lawendowe prostokąty z ikoną, które wyglądały jak zaślepki.

## Zasady „Światła” (od najlepszych: Linear, Vercel, GitHub, X, Fiverr)

| Zasada | Skąd | Jak w Portalu |
|---|---|---|
| Jeden znak rozpoznawczy, użyty wszędzie | Apple Fitness (pierścienie) | **Pierścień Drabinki**: 7 łuków wokół awatara; pełne łuki to zdobyte szczeble, częściowy łuk to droga do następnego |
| Poziom czytelny bez legendy | paski zasięgu, Fiverr | **Szczebelki**: 7 rosnących słupków i nazwa szczebla w kolorze `--level-n` |
| Każdy typ treści ma własną formę | Linear (issue ≠ PR), Oferteo | zlecenie = fakty + licznik ofert; realizacja = **promień** firma → Lider z „+pkt”; pytanie = tytuł jako treść; usługa = okładka + cena „od” |
| Ciepło tylko dla zapracowanego | SIEC-LOT §4.2 | bursztyn wyłącznie przy +pkt, „dojrzewa” i L7 |
| Powierzchnie warstwami, nie ramkami | Linear / Vercel | `--surface`/`-2`/`-3`, linie 1 px o niskim kontraście, cień z wewnętrznym światłem |
| Typografia ze skalą | Vercel / Stripe | Bricolage 800 w liczbach i tytułach (−0,035em), Inter z cv11/ss01, cyfry tabelaryczne |
| Grafika własna, zero zdjęć z sieci | ADR-009 | okładki rysowane w SVG według branży; awatar to gradient z nazwy (w kodzie: zdjęcie z uploadu, a gradient jako zastępstwo) |

## Nowe tokeny do `globals.css` przy kodzie

`--surface-2`, `--surface-3`, `--line`, `--line-2`, `--warm`/`--warm-rgb`, `--t-zlecenie|pytanie|realizacja|usluga`.
Istniejące `--level-*`, `--primary-*` i `--text-*` zostają bez zmian (jasne wartości z globals).

## Granice

- ADR-010: brak liczników wyświetleń i polubień w strumieniu; „Pokaż więcej 8 z 87”; kolejność chronologiczna.
- ADR-004: tabela „Czego Drabinka nie liczy” stoi na widoku.
- Wszystkie liczby Drabinki pochodzą z `rules.ts`: progi, 100/80/40/0, ×0,5ⁿ (minimum ×0,1) w 365 dniach, ×0,5 dla firmy młodszej niż 14 dni, 50/10, 300 na 7 dni, 20% od L4, karencja 7 dni.
- Nie ma DM: na profilu są „Zaproponuj zlecenie”, „Obserwuj” i „Udostępnij”.

## CDN tylko w makiecie

Pliki HTML ładują Bricolage i Inter z Google Fonts, a Phosphor Web z unpkg. **W kodzie aplikacji jest to zabronione (ADR-009).** Tam używamy `next/font` (fonty self-hosted) i `@phosphor-icons/react` (duotone, decyzja z 19.11).

## Poprawki z kodu (25.11, P0 za flagą `?wyglad=v17`)

Kod ekranów `/feed`, `/profil/[handle]`, `/drabinka` odtwarza makietę 1:1 (styl wygenerowany z `pro.css`). Poniższe różnice
wynikają z **brakującego pola w API** albo z decyzji o prywatności i są **znane** — sędzia zgodności ma je traktować jako
świadome odstępstwa, nie jako niezgodność:

| Miejsce | Makieta | Kod | Powód |
|---|---|---|---|
| Wiersz zlecenia | Budżet / Termin / Miasto / Branża | Budżet / Branża (pierwsze słowo, jak w makiecie) | model `Order` nie ma terminu ani miasta |
| Wiersz zlecenia | awatary oferentów, „zbiera do 28.11” | licznik ofert (`offersCount`) | API nie niesie oferentów ani terminu zbierania |
| Wiersz zlecenia | „Firma zweryfikowana · 14 zleceń · średnia ocen 4,8” | „Firma zweryfikowana” (NIP) albo „Firma bez potwierdzonego NIP” | lista zleceń niesie tylko `companyVerified` |
| Pytanie | chip branży, awatary odpowiadających | nazwa grupy, liczba odpowiedzi | wątek nie ma branży ani listy odpowiadających w liście |
| Akcje wpisu | Odpowiedz / Zapisz / Udostępnij | Odpowiedz / Udostępnij | zakładki są tylko dla wpisów portalowych |
| Profil | „Przypięte realizacje”, zakładka „Odpowiedzi”, „uznane odpowiedzi” w liczbach, miasto | „Realizacje”, brak zakładki i licznika, brak miasta | brak przypinania, liczników i miasta w API |
| Powiadomienia | badge „3” | bez badge | brak źródła licznika w tym widoku |
| Strumień — stan pusty | przycisk „Wybierz branże”, tekst o wyborze branż | „Zobacz zlecenia” + „Zadaj pierwsze pytanie”, tekst bez wątku o wyborze branż | w Portalu nie ma wyboru/subskrypcji branż do strumienia |
| Drabinka — wezwania | „12 pytań z twoich branż czeka”, „9 otwartych zleceń w twojej branży” | „N pytań czeka na odpowiedź”, „N otwartych zleceń” (z listy publicznej, „+” gdy >50) | wątki nie mają branży, więc licznik nie jest per branża |
| Profil własny — menu | podświetlone „Liderzy” w stanie pustym | podświetlone „Profil” (własny profil) | kod logiczniejszy; pozycja „Profil” prowadzi do własnego profilu |
| Prawa kolumna feedu (stany pusty/błąd) | „Zlecenia w twojej branży”, „Tematy” | te karty tylko gdy API zwróci dane | karta znika zamiast pokazywać puste |
| Punkty (feed, profil, Drabinka) | „+pkt” po wagach | **jak w makiecie**: faktyczne punkty po wagach, publiczne (decyzja Macieja 25.11); „dojrzewa za N dni” dla zdarzeń w karencji; „waga ×0,5” przy obniżonej wadze | API: `GET /profiles/:handle/ladder-events`, `points`/`weight`/`maturesAt` na `/realizations` i `/leaders/:id/reviews`; bez cofniętych, wstrzymanych przez antyfraud i korekt moderacji |
| „Kto dał ci światło” | awatar i imię osoby | monogram i nazwa firmy albo osoby, tytuł zlecenia/pytania | źródła są publiczne przy ocenie i odpowiedzi |
| Profil — linki „Wszystkie 41” / „Wszystkie 37” | link do pełnej listy realizacji i ocen | brak linku; Oś światła kończy się „Pokaż więcej · N z M” (tekst) | nie ma jeszcze stron pełnych list |
| Okładki realizacji i usług | wzór zależny od branży HVAC/PV/elektryka… | wzór dla rozpoznanych branż, dla pozostałych neutralny „obwód” | makieta znała tylko branże instalacyjne; słownik branż Portalu jest szerszy |

## Poprawki z kodu (26.11, P1 „Rynek” — zgodność z makietą)

| Miejsce | Makieta | Kod | Powód |
|---|---|---|---|
| Oferent w porównaniu ofert, „O Liderze” na usłudze | miasto („Sopot”, „Instalacje HVAC · Sopot”) | branża (oferent) i nagłówek profilu (usługa) | profil nie ma pola „miasto” (dodanie = migracja, osobna zgoda) |
| „Ostatnie światło” — punkt z wagą < 1 | „druga ocena od tej firmy w roku, waga ×0,5” | „ocena N/5 po zleceniu „X” · waga ×0,5” | publiczna Oś światła nie niesie powodu wagi (bywa też młoda firma) — nie zgadujemy |
| Liczby 4-cyfrowe | P1 `fmt4`: „1 150 zł”; P0: „1500 pkt” | P1 przez `nf4`, P0 bez zmian (`nf`) | każdy ekran jak w swojej makiecie |


## Braki wobec starego wyglądu — makieta `braki.html` (26.11, zaakceptowana 26.11)

Stany `?stan=dane|pisanie|offline|wiecej|pusty`; zrzuty `audyt/zrzuty/v17-braki-*.png`. Ładowanie i błąd jak w `feed.html`.

| Brak w V17 | W makiecie |
|---|---|
| **Zwykłe wpisy nie są pobierane do strumienia** (błąd na prodzie od 25.11) | wiersz „Wpis”, filtr „Wpisy” |
| Zakres „Cała społeczność / Obserwowani” | dwie zakładki nad kompozytorem |
| Docenienie (bez licznika, ADR-010), komentarze, zapis, „Podaj dalej” | pasek akcji wpisu; czas = odnośnik do wpisu |
| Zdjęcia i cytat we wpisie i w kompozytorze | siatka zdjęć, karta cytatu, miniatury, licznik znaków |
| Awans w strumieniu | wiersz „Awans na szczebel …” |
| Kompozytor na telefonie (dziś ukryty) | pełny ekran z FAB |
| Podgląd offline | baner i zapisane publiczne wpisy |
| Konto: Panel, Zapisane, Moje punkty, Grupy, Droga, Dla firm, motyw, wylogowanie | menu z karty konta (desktop) i awatara (telefon) |

Poza makietą, do sprawdzenia przy kodzie: odnośniki z Drabinki do `/droga` i `/panel/punkty`, zgłoszenie/edycja/usunięcie
wpisu (zostają na `/wpisy/[id]`), fokus i Esc w menu i kompozytorze.
Zmiana wobec `pro.css`: w ciemnym motywie przycisk główny na `--primary-600` (kontrast AA).

### Tło (Maciej 26.11)

„Wolałbym inny kolor tła np. jaśniejsze z lekką siecią liderów przezroczystą. Reszta jest dobra” — `tlo.{js,css}`.
Zastępuje w tym punkcie zasadę z 20.11 („tło czyste, bez siatki liderów”). Obowiązuje po akceptacji tła; wtedy dla wszystkich
ekranów V17 (także P0 i P1).
