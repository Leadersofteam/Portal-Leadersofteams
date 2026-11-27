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

## Reszta paczki P1 (26.11, `p1b.{js,css}`) — zaakceptowana 27.11

| Ekran (trasa) | Plik | Stany `?stan=` |
|---|---|---|
| `/zlecenia/nowe` | `zlecenie-nowe.html` | `z-lidera` `budzet` `bledy` `gosc` `bez-firmy` `ladowanie` |
| `/uslugi/nowa` | `usluga-nowa.html` | `start` `bez-profilu` `publikacja-nieudana` `ladowanie` |
| `/uslugi/[slug]/edytuj` | `usluga-edycja.html` | `szkic` `archiwum` `ladowanie` `blad` |
| `/zlecenia/branza/[slug]` | `branza-zlecen.html` | `pusty` |
| `/uslugi/branza/[slug]` | `branza-uslug.html` | `pusty` |
| `/oferty/[id]` | `oferta.html` | `wyslana` `pusty` `zamknieta` `ladowanie` `blad` |
| `/zapytania/[id]` | `zapytanie.html` | `lider` `przeksztalcone` `zamkniete` `ladowanie` `blad` |
| `/porownanie/[slug]` | `porownanie.html` | — (Fixly i Useme: ten sam układ, teksty z `lib/porownania.ts`) |
| `/firmy/[id]` | `firma.html` | `pusty` `ladowanie` `blad` |
| `/firma/nowa` | `firma-nowa.html` | `bledy` `gosc` |
| `/dla-firm` | `dla-firm.html` | `pusty` (bez usług i Liderów — sekcje znikają) |

Zrzuty: `audyt/zrzuty/v17-p1b-*` (`--duzy` w `v17-makiety-zrzuty.mjs` dodaje 3440×1440).
Układ dużego ekranu: wspólny `szerokie.css` (niżej).

### Miejsca wymagające nowych danych (żadne nie wymaga migracji bazy)

| Miejsce | Czego brakuje | Dane w bazie? |
|---|---|---|
| `/oferty/[id]`: poziom Lidera w karcie „Oferent” | `getOfferThread` nie zwraca poziomu | tak (Drabinka) |
| `/firmy/[id]`: opis firmy | API profilu nie zwraca `Company.description` | tak |
| `/uslugi/[slug]/edytuj`: edycja szkicu | **zastany błąd**: odczyt po slug daje 404 dla szkicu, a panel pokazuje „Edytuj” | tak |
| Huby branż: „Pokaż więcej · N z M” | front pomija `nextCursor` i `total` | tak |
| Huby branż: licznik ofert, data, znak NIP w wierszu | API zwraca, stary widok nie pokazuje | tak |
| `/zapytania/[id]`: chip pakietu z ceną | dziś surowy tekst `[pakiet: BASIC]` w treści; chip to parsowanie na froncie | tak (prefiks + pakiety) |

### Nowe zachowania w interfejsie (kod, bez nowych danych)

- Kreator zlecenia w 2 krokach formularza (gość: 1 krok, jak dziś) i podgląd wiersza; zapis nadal jako szkic.
- Błędy przy polach zamiast samego „Nieprawidłowe dane wejściowe” (budżet „do” < „od”, suma kontrolna NIP).
- `/uslugi/nowa`: po nieudanej publikacji „Opublikuj ponownie” publikuje zapisany szkic (**zastany błąd**: ponowne kliknięcie tworzy duplikat).
- `/firma/nowa` dla gościa: komunikat z logowaniem zamiast formularza, który kończy się błędem.
- `/dla-firm`, krok 2: usunięta obietnica „liczba zrealizowanych zleceń” przy ofercie (tabela ofert jej nie pokazuje).
- Dopisane zdania pomocnicze (np. skutki „Przekształć w zlecenie” i „Zamknij wątek”, „Rozmowa punktów nie daje”).
- `/firmy/[id]`: poprawna odmiana liczb; „NIP — suma kontrolna OK” (nigdy „zweryfikowana”).

## Poprawki z kodu (27.11, reszta paczki P1 — za opt-inem `?wyglad=v17`)

11 ekranów zakodowanych (`app/v17/…`, styl `v17-rynek-reszta.css` z regułami 3440). Bez flagi dzisiejsze ekrany.
Odstępstwa **czekają na akceptację Macieja**:

| Ekran | Makieta | Kod | Powód |
|---|---|---|---|
| ekrany P1 już wdrożone (`/zlecenia`, zlecenie, wpis zlecenia w strumieniu) — widać po wdrożeniu **bez flagi** | „Zweryfikowana” / „Firma zweryfikowana” | „NIP — suma kontrolna OK” | zastany błąd: sprawdzamy tylko sumę kontrolną, nie rejestr |
| ekrany z `[id]`/`[slug]` | stan ładowania (szkielet) | brak | `loading.tsx` przy segmencie dynamicznym daje 200 zamiast 404 |
| stany błędu | link wstecz i komunikat per ekran | wspólny `ErrorEkranu` (h1, komunikat, „Wróć do strumienia”) | jeden komponent V17 |
| dla firm, branże, porównanie | rama gościa | HTML z serwera jak dla gościa; zalogowanemu rama przełącza się w przeglądarce | ISR bez ciasteczek |
| branże | 6/8 pozycji | porcje po 24, „Pokaż więcej” z kursorem i licznikiem; błąd dociągania tekstem | prawdziwe dane |
| branże usług, dla firm | okładki rysowane, karta bez zakładki | zdjęcie usługi, gdy jest; „Zapisz usługę” | funkcja dzisiejszego ekranu |
| dla firm | częściowy łuk przy awatarze | pierścień z poziomu bez postępu, „Bez ocen” | `/leaders` nie zwraca punktów |
| dla firm, porównanie | — | bez dzisiejszych nadtytułów i sekcji „Jak to działa”, „Kogo spotkasz”; teksty wg makiety (zmiana treści SEO) | makieta |
| formularze | błędy tylko w stanie `bledy` | walidacja przy każdym polu, fokus na pierwszym błędzie, błąd API w tym samym pasku | API nie niesie błędów per pole |
| nowe zlecenie | — | informacja o przywróconym szkicu sprzed rejestracji | funkcja dzisiejszego ekranu |
| nowe zlecenie (gość) | „Zaloguj się” | klik zapisuje szkic | zastany błąd: obietnica „szkic zostanie” bez zapisu (tylko nowy ekran) |
| nowe zlecenie | podgląd ze znakiem NIP, budżet z krokiem 2 | „Bez NIP” bez numeru; budżet po wpisaniu obu kwot; rama z pierwszą firmą konta | prawdziwe dane |
| nowe zlecenie | poziomy 4–7 ukryte | widoczne też, gdy któryś wybrany | wybór nie może być niewidoczny |
| usługa | Szkic / Opublikowana / Zarchiwizowana | także „Wstrzymana” | status istnieje |
| usługa | — | po zapisie szkicu powrót do „Moich usług”; „Wgrywanie…”, błąd zdjęcia, nazwy grup pakietów dla czytnika | zastany błąd (stary ekran idzie na 404) i dostępność |
| oferta, zapytanie | wiadomości firmy pod nazwą firmy | tak samo — imię osoby po stronie firmy (dziś widoczne) znika | 1:1 z makietą |
| oferta, zapytanie | — | „Wysyłanie…”, błąd pod polem i w karcie „Co dalej” | zachowanie dzisiejsze |
| oferta | `wyslana`, „Propozycja/Czas” zawsze, „Porównaj i wybierz” poza `zamknieta` | ramka sukcesu tylko po wysłaniu; wiersz bez wartości znika; przycisk tylko dla firmy przy otwartej ofercie; tekst dla pustej zamkniętej rozmowy | prawdziwe stany |
| zapytanie | chip pakietu z ceną; nazwa firmy | cena z bieżącego pakietu (z chwili pytania nie jest zapisana); nazwa z publicznego profilu firmy | brak danych w API |
| firma | „ocen wystawionych Liderom”; autor bez linku; kolor z branży | dopisana średnia; link do profilu autora; kolor z nazwy; akapity zachowane | funkcja dzisiejsza, firma nie ma branży |
| firma | ręczny monogram „DK” | dwa pierwsze wyrazy nazwy („MD”) | skrót z prawdziwej nazwy |
| dla firm | sekcje usług i Liderów zawsze (poza stanem `pusty`) | znikają bez danych; strona ISR odświeża się co 5 min, Liderzy od L1 | jak dziś |
| jasny motyw (wszystkie ekrany V17) | błędy w jasnoczerwonym z ciemnego motywu | `--danger` w jasnym #b91c1c | kontrast AA |
| formularze | — | po błędzie z serwera fokus przeskakuje na pasek błędu; długi przycisk w bocznej karcie łamie się przy 721–1000 px | przycisk jest daleko pod paskiem |
| gość 721–1180 px | ikona w nawigacji | ikona jest linkiem do logowania | inaczej nie ma jak się zalogować |
| porównanie | karty z `h3` | `h2` o tym wyglądzie; wersaliki z `lib/porownania.ts` zamienione w widoku | poziom nagłówków |
| gość (telefon) | pasek: logo, szukaj, „Zaloguj się” | tak samo; menu konta gościa ukryte na tych ekranach | makieta |

## Duży ekran 3440×1440 (`szerokie.css`, 27.11) — czeka na akceptację

Maciej: „Pamiętaj o mobile first ale też większych ekranach czyli 3440x1440” oraz „Tak, zrób makietę” (zgoda na makietę, nie na kod).
Jeden plik dla wszystkich ekranów V17, w całości w `@media (min-width: 2400px)`; poniżej progu nic się nie zmienia
(sprawdzone porównaniem zrzutów 390/1512 przed i po — różnice tylko z szumu renderowania, w powtórce bajt w bajt).

- Cała rama ×1,4 i jedna szerokość (280 + 36/40 + treść = 2076 px CSS) — nawigacja nie skacze między ekranami.
- Strumień 660 px, prawa kolumna w dwóch podkolumnach; lista zleceń w 2 kolumnach; zlecenie: opis obok porównania ofert;
  usługa: okładka · opis i Lider · pakiety; usługi w 4 kolumnach; profil: realizacje w 3; Drabinka: wymogi w 3.
- W makietach 7 wdrożonych ekranów tło sieci ładuje się tylko od progu (`media` + `matchMedia`).

Zrzuty: `audyt/zrzuty/v17-szerokie-*-jasny-3440.png` i `v17-p1b-*-jasny-3440.png`.
Niezweryfikowane: ciemny 3440, szerokości 2400–3439, `zoom` razem z menu i oknami w kodzie.

## P6 landing + P5 auth i stany — makieta (26.11, czeka na akceptację)

Zdanie ekranu: **gość przestaje zgadywać, skąd w Portalu bierze się status — widzi to w pierwszym ekranie, zanim założy konto.**

Pliki: `publiczne.{js,css}`, `publiczne-tresc.js` (tekst prawny wycięty automatycznie z `apps/web`), tło `tlo.{js,css}`.
Zrzuty: `audyt/zrzuty/v17-p6-*.png`, `v17-p5-*.png` (390 i 1512 w obu motywach, pierwszy ekran 3440×1440 w jasnym — opcja `--ultra` harnessu; w repo widoki domyślne,
ze stanów tylko telefon w jasnym).
Mobile first; duży ekran od **2400 px** (Maciej 26.11, próg wspólny z paczką Rynek). Wszystkie ekrany: `zoom: 1.3`.
Wyjątek — strona główna: własne rozmiary (kadr 2240 px zamiast 1560 px po zoomie, nagłówek 100 px, scena 3D 720 px,
Liderzy w 3 kolumnach, FAQ obok nagłówka).

| Plik (trasa) | Stany `?stan=` |
|---|---|
| `landing.html` (`/`) | dane, `zalogowany` (`/?widok=landing`), `bez-liderow`, `menu`, `menu-zalogowany`, `utworz` |
| `start.html` (`/start`) | krok 1, `2`, `2-blad`, `2-zapis`, `3`, `3-firma` |
| `dokument.html` (`/regulamin`, `?strona=prywatnosc`) | dane, `prywatnosc` |
| `wypis.html` (`/wypis-digest`) | gotowe, `ladowanie`, `blad` |
| `logowanie.html` | dane, `blad`, `wysylanie` |
| `rejestracja.html` | dane, `firma` (`?cel=firma&dalej=zlecenie`), `blad`, `wysylanie` |
| `haslo.html` (`/nie-pamietam-hasla`, `/reset-hasla`) | prośba, `wysylanie`, `wyslano`, `nowe`, `rozne`, `bez-tokenu`, `ustawione` |
| `stan.html` (404, błąd, ładowanie) | 404, `blad`, `ladowanie` |
| `/offline` | już zaakceptowane w `braki.html?stan=offline` |

### Co zostaje w kodzie bez zmian (makieta tego nie rusza)

- Przekierowanie zalogowanego `/` → `/panel` (307, `middleware.ts`) i furtka `/?widok=landing`.
- Bramka człowieka: własny proof-of-work liczony w tle (`lib/humancheck.ts`) i pole-pułapka — niewidoczne, bez widżetu.
- `?next=` po logowaniu, `?cel=firma&dalej=zlecenie` przy rejestracji, kreator `/start` (zapis `/me/onboarding`).
- Scena 3D: `components/ui/ladder-scene.tsx` (WebGL, SVG `LadderArt` jako stan bez WebGL). W makiecie nieruchomy odpowiednik na canvas 2D.
- Social proof: sekcja Liderów znika, gdy pusto; JSON-LD; prerender (`publicApi`, ISR); `noindex` na `/start` i `/wypis-digest`.
- Stopka: cztery kolumny, `lib/ecosystem.ts` (etykiety i kolejność), przełącznik Ciemny / Jasny / Systemowy.
- Ładowanie: `loading.tsx` wyłącznie obok `page.tsx` listy (mina z MINY.md) — nigdy nad `[id]`/`[slug]`.
- Weryfikacja e-mail (`/weryfikacja`) należy do P3.

### Różnice wobec dzisiejszych ekranów (do akceptacji razem z makietą)

1. Landing: przy scenie karta „Przykład” (firma → Lider, +100 pkt po ocenie 5/5) — statyczna, podpisana jako przykład.
2. Landing „Dla Liderów”: schodki pokazują też progi punktowe (z `rules.ts`).
3. Rejestracja: nowa linia „Zakładając konto, akceptujesz Regulamin i Politykę prywatności”. **Zastany brak:** regulamin §2 mówi
   o akceptacji, a formularz nie miał do niego żadnego odnośnika.
4. Regulamin i prywatność: zakładki między dokumentami i spis treści.
5. Boczna kolumna z latarnią → drabina; logowanie dostaje własne zdanie („Twoje szczeble czekają…”).
6. Stany sukcesu i błędu (reset, wypis) dostają ikonę; „Pierwszy szczebel… wystarcza na Adepta” bez zmian w treści.
7. Ekrany publiczne mają górny pasek (jak dziś), nie trzykolumnową ramę zalogowanego.
8. Landing: „Dołącz jako Lider” w sekcji dla Liderów jest obrysowy (jedno wypełnione wezwanie w treści: „Dodaj zlecenie”).
9. Pasek poniżej 1100 px: logo, menu i pełne pole szukania w drugim wierszu; w menu gościa „Zaloguj się” i „Dołącz” jako przyciski.
