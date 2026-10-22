# Sieć Leaders of Teams — cztery marki, jedna opowieść

<!-- SIEC_VERSION: 2 · 2026-10-22 -->

> **Karta sieci.** Ten sam plik leży w czterech repozytoriach, bajt w bajt:
> `Leadersofteam` (kanon — strona „O firmie”), `Portal-Leadersofteams`,
> `Leaders-of-Teams-APP`, `Leaders-of-Teams-Nowa-Strona`. Zmiana w jednym =
> zmiana we wszystkich czterech + podbicie `SIEC_VERSION`. Kontrola z katalogu,
> w którym leżą klony:
> `grep -h "SIEC_VERSION" */docs/SIEC-LOT.md && md5sum */docs/SIEC-LOT.md`
> Plik jest sformatowany prettierem (portal sprawdza formatowanie `.md` w CI) —
> edytuj w portalu, `npx prettier --write docs/SIEC-LOT.md`, potem kopiuj.
>
> Decyzja właściciela 2026-10-21: _„Określ plan i obierz kierunek dla każdej
> z osobna — inny, ale tak, aby miały wspólne mianowniki, wspierały się
> i uzupełniały w sieci Leaders of Teams. Oddzielne marki, wspólna sieć.”_
> I diagnoza, od której to się zaczęło: _„strony wyglądają dobrze, ale czegoś im
> brakuje — tej nowoczesnej technologii przewijania 3D i opowiadania historii
> w płynnych przejściach.”_
>
> Gotowy prompt na sesję wykonawczą: **`docs/PROMPT-SIEC-3D.md`** (też we wszystkich czterech).

---

## 1. Diagnoza — czego brakuje, zmierzone, nie odczute

Każda z czterech stron ma dziś scenę 3D. Żadna nie ma **opowieści przewijanej**.

| Strona                   | Co jest (2026-10-21)                                            | Czego brakuje                                                                                |
| ------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `leadersofteam.pl`       | Feniks w hero (kurtyna) i w akcie „Ruch” (okno)                 | między nimi trzy akty bez sceny; historia urywa się po hero i wraca dopiero na końcu         |
| `leadersofteams.pl`      | drabinka w hero, światło wspina się przy pierwszym przewinięciu | scena kończy się z hero; reguły Drabinki — najmocniejszy wyróżnik portalu — są tylko tekstem |
| `app.leadersofteams.com` | `StoryZone`: 3 rozdziały (pętla dnia → lejek → puls zespołu)    | najbliżej celu; brakuje łuku całego dnia i finału                                            |
| `leadersofteams.com`     | orbita leadów w hero; `ScrollAssembly` na `/jak-to-dziala`      | strona główna po hero to sekcje bez ruchu; orbita nie prowadzi do żadnej historii            |

**Dwie dziury w samej sieci, znalezione przy pisaniu tej karty (zmierzone w kodzie
`main` 2026-10-21) — naprawić przed sceną, bo opowieść, która kończy się „idź do
sąsiada”, nie działa bez drzwi do sąsiada:**

1. **Portal nie linkuje do żadnego z trzech pozostałych adresów.**
   `apps/web/components/ui/footer.tsx` ma wyłącznie trasy własne; w `apps/web`
   nie ma ani `leadersofteam.pl`, ani `app.leadersofteams.com`. Pętla z §2 jest
   przerwana dokładnie w miejscu, w którym Lider dochodzi do L5 i ma przejść do
   aplikacji. Linki wychodzące nie są wywołaniem HTTP, więc ADR-009 ich nie dotyczy.
2. **`.com` podpisuje adresy inaczej niż reszta sieci.** `src/config/network.ts`:
   `Agencja` (reszta: `O firmie`) i `International` (reszta: `International / EN`).
   Oba wiersze powstały tego samego dnia (2026-08-27) w dwóch sesjach; `.pl`
   odrzucił „Agencja” z uzasadnieniem w swoim `CLAUDE.md` §6 (teza „Polska nie
   potrzebuje kolejnej korporacji/agencji”), aplikacja poszła za `.pl`. Trzy do
   jednego, z powodem zapisanym — poprawić `.com` (etykiety + `docs/DOMAIN-STRATEGY.md`
   §4a + opis `t.footer.network.agency`, który dziś mówi „cennik usług”).

Wzorzec, do którego właściciel odsyła (aim24.pl, AIM Motion), robi jedną rzecz,
której my nie robimy: **całe przewijanie strony jest jedną osią czasu jednej sceny.**
Kształt przelewa się z rozdziału w rozdział, a tekst prowadzi. U nas scena jest
ozdobnikiem pierwszego ekranu. Tę różnicę zamykamy — na naszych warunkach (§3).

## 2. Cztery marki, cztery pytania

Sieć jest jedną drogą człowieka. Każdy adres odpowiada na **inne pytanie** tej drogi
i kończy swoją opowieść tam, gdzie zaczyna się opowieść sąsiada.

|                              | `leadersofteam.pl`                       | `leadersofteams.pl`                              | `app.leadersofteams.com`                | `leadersofteams.com`                              |
| ---------------------------- | ---------------------------------------- | ------------------------------------------------ | --------------------------------------- | ------------------------------------------------- |
| Etykieta w stopce (kontrakt) | `O firmie`                               | `Sieć Liderów`                                   | `LOT App`                               | `International / EN`                              |
| Pytanie                      | **Dlaczego?** misja, manifest            | **Jak zapracować?** status od drugiego człowieka | **Gdzie pracuje zespół?** dzień zespołu | **Co to za produkt?** dla świata                  |
| Odbiorca                     | ambitny człowiek · polska firma          | Lider (bezpłatnie)                               | zespół sprzedaży (płatnie, od L5)       | zespół sprzedaży poza Polską, kupujący            |
| Opowieść przewijana          | **Lot Feniksa**                          | **Światło z cudzych rąk**                        | **Dzień zespołu**                       | **Droga leada**                                   |
| Bohater sceny (punkt)        | człowiek                                 | Ty na Drabince                                   | lead i handlowiec                       | lead                                              |
| Silnik                       | `formation-v1.js` (własny, surowy WebGL) | `particleField.ts`                               | `particleField.ts`                      | `particleField.ts` (kanon)                        |
| Tło                          | jasny papier, „Karta lotu”               | ciemny                                           | jasny interfejs, ciemna `StoryZone`     | ciemny „Instrument”                               |
| Finał przekazuje do          | portalu (Drabinka) i do leadu firmy      | aplikacji (L5, L7)                               | rejestracji i 14 dni za darmo           | rejestracji w aplikacji + „Leader track” na `.pl` |

To jest **pętla**, nie lejek: `.pl` (dlaczego) → portal (jak zapracować) → aplikacja
(gdzie pracować) → `.com` (to samo dla świata) → `.pl` („See the Leader track”).
Wejść można w każdym miejscu; każda strona wie, kto jest przed nią i kto po niej.

## 3. Wspólne mianowniki — co jest takie samo na czterech stronach

Marki są różne: inny znak, inny akcent, inne tło, inny bohater. Wspólna jest
**gramatyka**. Po niej czytelnik pozna sieć, zanim przeczyta nazwę.

### 3.1 Gramatyka opowieści przewijanej (obowiązuje wszystkie cztery)

1. **Przewijanie jest zegarem, nie przyciskiem.** Natywny scroll, bez Lenisa i bez
   przejmowania kółka. Miękkość daje lerp sceny zależny od czasu.
2. **Rozdział = jedna formacja = jedno zdanie.** Kształt stoi, gdy tekst mówi
   (`hold` ≈ 0,22 odcinka), przelewa się w pauzie między rozdziałami.
3. **Etap wynika z treści, nie z piksela.** Rozdziały oznaczają się
   `data-story-stage`; etap to interpolacja między środkami bloków. Zmiana copy
   nie rozjeżdża sceny.
4. **Punkty zachowują tożsamość.** Ten sam punkt przechodzi przez wszystkie
   formacje (zebranie, nie przetasowanie), każdy z własnym opóźnieniem po łuku.
5. **Jeden bohater.** Każda scena ma jeden wyróżniony punkt — jasny rdzeń, cienka
   aureola — za którym idzie oko przez cały tor. To jest wspólny znak sieci:
   na każdej stronie śledzisz **jednego człowieka albo jeden lead**, nie tłum.
6. **Tekst w przepływie dokumentu**, w pre-renderze, zaznaczalny, czytany przez
   czytnik i robota. Nigdy `opacity: 0` ani `filter: blur()` jako stan początkowy.
7. **Punkt znaczy coś.** Jeśli nie da się napisać legendy do formacji, formacja nie
   powstaje. Orb, galaktyka, mózg i „sieć neuronowa” są zakazane w całej sieci.
8. **Odmowa jest stanem poprawnym.** Bez WebGL, przy renderze programowym, przy
   redukcji ruchu: plakat SVG albo sekcja z tymi samymi liczbami i tekstem.
   Redukcja ruchu = stany skokowe albo brak sceny, nigdy „krótsza animacja”.
9. **Koszt poza startem strony.** Scena nie wchodzi do First Load JS / bundla
   startowego, startuje po LCP, pauzuje poza kadrem i w ukrytej karcie. Każde
   repo trzyma zapadkę bajtów sceny w swojej bramce.
10. **Kanwa nigdy nie leży pod akapitem.** Scena ma własną kolumnę (desktop)
    albo pas nad treścią (telefon).
11. **Jedna scena na stronę** (decyzja 2026-10-21). Ta sama scena może grać na
    kilku trasach jednej domeny; druga scena na tej samej domenie nie wchodzi.
12. **Zero obcych hostów, zero CDN, zero płatnych dostawców** — scena, fonty,
    tekstury, modele: wszystko z własnego originu.
13. **Tor dłuższy niż silnik — okno przesuwne, nie drugi silnik.** `particleField.ts`
    trzyma dziś **4 formacje** na punkt (atrybuty `aP0…aP3`), a plany z §4 mają
    5–7 rozdziałów. W każdej chwili shader potrzebuje tylko formacji bieżącej
    i sąsiednich, więc rozwiązaniem jest podmiana bufora nieaktywnego slotu przy
    zmianie rozdziału (`bufferSubData`), nie więcej atrybutów. Zmiana silnika =
    wszystkie trzy kopie + `FIELD_VERSION` 4 (`docs/KIERUNEK-3D.md` §4; wersję 3
    zajęła 2026-10-22 odmowa renderu programowego, `.com` #180).
    `formation-v1.js` na `.pl` — pojemność sprawdzić w kroku A, przed scenariuszem.

### 3.2 Wspólny język koloru

- **Fiolet = sieć.** Stała marki na wszystkich czterech adresach, każdy w swoich
  tokenach (`--violet-*` na `.pl`, `--color-accent` na `.com`, `--level-4/5`
  w portalu, `primary-*` w aplikacji).
- **Ciepły akcent = zapracowane.** Bursztyn / złoto / oranż — w każdej marce jej
  własny token — **wyłącznie** w momencie, który ktoś zapracował: siódma bramka
  i ogień Feniksa (`.pl`), L7 (`--level-7`, portal), wygrana i prowizja
  (aplikacja), lead wygrany (`.com`). Ciepły punkt na scenie, który niczego nie
  znaczy, to błąd marki.

### 3.3 Wspólny finał

Ostatni rozdział każdej opowieści **wskazuje sąsiada w sieci** (tabela §2) —
formacja otwiera się w stronę drzwi, a pod nią stoi zwykły link z tekstem. Pod
całą stroną: wiersz czterech adresów w stopce (etykiety z §2 są kontraktem;
`NETWORK` na `.pl`, `src/config/network.ts` na `.com`, `apps/web/config/ecosystem.ts`
w aplikacji; **w portalu go nie ma** — §1). Przejścia **między** domenami są narracyjne,
nie techniczne: przeglądarka nie animuje nawigacji między originami.

### 3.4 Wspólna prawda

Scena nie pokazuje liczby, statusu ani obietnicy, której nie ma w tekście obok.
Dane przykładowe są podpisane jako przykład. Liczników ludzi nie ma, dopóki
liczba nie jest prawdziwa. Każde repo ma tę zasadę w swoim `CLAUDE.md` — tu jest
wspólna, bo scena 3D to najłatwiejsze miejsce, żeby ją złamać niechcący.

## 4. Kierunek i plan — każda strona osobno

Każdy plan ma te same trzy kroki, bo tak pracuje się z ruchem, którego nie da się
ocenić z kodu:

- **A · Scenariusz.** Tabela rozdziałów: zdanie → formacja → co znaczy punkt →
  co stoi obok tekstem. Plus film klatek makiety (formacje bez stylu) w 390 i 1440.
  **Właściciel akceptuje scenariusz, zanim powstanie styl.**
- **B · Tor.** Jedna przyklejona scena przez wszystkie rozdziały, przejścia,
  plakat, stany skokowe przy redukcji ruchu.
- **C · Pomiar.** Film klatek na całym torze, bramki repo, budżet, Lighthouse
  przed/po na tej samej maszynie, test na prawdziwym GPU (DevTools → Performance)
  i — jeśli się da — na telefonie z iOS.

### 4.1 `leadersofteam.pl` — **Lot Feniksa** (O firmie · dlaczego)

Kierunek: z dwóch okien zrobić **jeden lot przez cztery akty**. Scena żyje na osi
nici (`THREAD_X` = 71%, ta sama, po której idą trasa hero, manifest i szwy aktów).

| Rozdział | Akt      | Formacja                                        | Znaczenie                                                                                      |
| -------- | -------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 0        | hero     | rozproszenie                                    | zdolni ludzie, każdy osobno                                                                    |
| 1        | Diagnoza | punkty dryfują ku krawędzi kadru i bledną       | „cudze” — aluzja, bez adwersarza (§7)                                                          |
| 2        | Ścieżka  | Feniks prowadzi klucz; 7 bramek na `y = t^1.35` | bramka zapala się, gdy jej poziom stoi na środku osi poziomów — obraz i wiersz w jednym rytmie |
| 3        | Arsenał  | klucz rozdziela się na dwa strumienie           | portal (bezpłatny) i aplikacja (płatna) — dwa produkty, nie jeden (§9.2)                       |
| 4        | Ruch     | wszyscy stają się Feniksem                      | Team z samych Liderów                                                                          |
| 5        | drzwi    | Feniks otwiera skrzydła nad dwoma wejściami     | „Zostań Liderem” → `leadersofteams.pl/drabinka`, „Stań się Teamem” → formularz                 |

Nowe względem dziś: rozdziały 1–3 i 5, ciągłość zamiast dwóch okien, synchronizacja
bramek z osią poziomów. Ograniczenia: zapadka JS `/` = 106 820 B się nie rusza
(scena poza First Load), plik sceny dostaje nową nazwę (`formation-v2.js`), sufit
wagi sceny do ustalenia pomiarem i wpisu w `npm run budget`, `tests/overlap.spec.ts`
i `tests/formation.spec.ts` przechodzą. Skill: `lot-formacja-feniks`.

### 4.2 `leadersofteams.pl` — **Światło z cudzych rąk** (Sieć Liderów · jak zapracować)

Kierunek: Drabinka opowiada swoje reguły ruchem. **Prawo wizualne tej sceny:
twój punkt nigdy nie świeci sam** — każde rozjaśnienie przychodzi od innego punktu.
To jest ADR-004 narysowany, nie tylko przetestowany.

| Rozdział | Formacja                                                                          | Znaczenie (z `/drabinka`, nie z pamięci)                   |
| -------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 0        | 7 szczebli, Ty na L1 (Adept)                                                      | start                                                      |
| 1        | punkt firmy przylatuje z boku, ocena wraca światłem                               | zlecenie ocenione przez firmę                              |
| 2        | twoje światło schodzi do kogoś niżej i wraca, gdy jego pytanie zostaje rozwiązane | mentoring uznany w Q&A                                     |
| 3        | punkty zaproszeń, logowań i aktywności przelatują **bez światła**                 | czego Drabinka nie nagradza — zero za rekrutację           |
| 4        | dwa strumienie naraz                                                              | od L4 wkład z obu ścieżek                                  |
| 5        | L5 → brama; L7 — złoto, wokół ciebie zbiera się zespół                            | dostęp do aplikacji LOT, własny zespół → link do aplikacji |

Gdzie: hero strony głównej zostaje, pełny tor na `/drabinka` (ta sama scena, inna
trasa — §3.1 pkt 11). Ograniczenia: ADR-009 (scena bez sieci, zero zewnętrznych
dostawców), ADR-010 (tor jest skończony: siedem poziomów, bez nieskończonego
przewijania i bez liczników), ADR-004 (żadna formacja nie może wyglądać jak drzewo
poleceń ani piramida — rozdział 3 pokazuje rekrutację wyłącznie jako to, co
**nie** daje światła). Progi punktowe tylko z danych portalu. Skill: `portal-scena-3d`.

### 4.3 `app.leadersofteams.com` — **Dzień zespołu** (LOT App · gdzie pracuje zespół)

Kierunek: `StoryZone` rośnie z trzech rozdziałów do łuku całego dnia. Każdy
rozdział niesie zdanie „handlowiec przestaje robić X” (kryterium akceptacji repo)
i tylko funkcje, które działają w aplikacji.

| Rozdział | Formacja                                             | Zdanie                                       |
| -------- | ---------------------------------------------------- | -------------------------------------------- |
| 0        | plan dnia: kroki ułożone w kolejkę                   | przestaje szukać, do kogo dziś zadzwonić     |
| 1        | lead pulsuje, linia do handlowca (Power Dialer)      | przestaje wybierać numery ręcznie            |
| 2        | leady wg etapu (dzisiejszy rozdział „lejek”)         | przestaje pytać, gdzie stoi sprzedaż         |
| 3        | wycena składa się z pozycji                          | przestaje liczyć ofertę w arkuszu            |
| 4        | wygrana: lead staje się złotym punktem, prowizja     | przestaje liczyć prowizje na koniec miesiąca |
| 5        | puls zespołu (dzisiejszy rozdział „menedżer”)        | menedżer przestaje zbierać raporty           |
| 6        | zespół z punktów portalu — L7 prowadzi własny zespół | przekazanie z portalu → 14 dni za darmo      |

Liczby tylko z `demoData.ts`, podpisane jako przykład. Ograniczenia: wdrożenie
ręczne, gałąź bez merge, PR otwiera właściciel; jasny motyw domyślny, a strefa
sceny ciemna; zrzuty 1512 i 390, oba motywy. Skille: `lot-design`, `lot-zrzuty`,
`lot-scena-3d`.

### 4.4 `leadersofteams.com` — **Droga leada** (International / EN · co to za produkt)

Kierunek: orbita z hero przestaje być ozdobnikiem i staje się pierwszym ujęciem
opowieści o jednym leadzie, w dwóch językach.

| Rozdział | Sekcja             | Formacja                                                         | Znaczenie                                              |
| -------- | ------------------ | ---------------------------------------------------------------- | ------------------------------------------------------ |
| 0        | Hero               | orbita, pasma = etapy                                            | wszystkie leady zespołu                                |
| 1        | Problem            | leady wypadają z orbity bez śladu                                | lead ginie, bo nikt nie zapisał następnego kroku       |
| 2        | How it works       | kamera idzie za jednym leadem: nowy → kontakt → oferta → wygrana | ten sam lead przez lejek (`ROLE` z `formations.ts`)    |
| 3        | Proof / Case study | wiele orbit w rzędzie — zespół                                   | menedżer widzi cały zespół                             |
| 4        | Doors / CTA        | lead wygrany odlatuje ku drzwiom                                 | trial w aplikacji; „Leader track” → `leadersofteam.pl` |

`/jak-to-dziala` zachowuje `ScrollAssembly` — mówi tą samą gramatyką i nie
dostaje drugiej sceny. Ograniczenia: `npm run check:all` (w tym `check:perf (2)`
i `check:wcag` na 2 × wszystkie trasy), parzystość i18n, pre-render bez
`opacity:0`, porównanie A/B z `main` na tej samej maszynie przy każdym czerwonym
`check:perf`. Kanon silnika: `docs/KIERUNEK-3D.md`. Skill: `lot-scena-3d`.

## 5. Kolejność i zależności

0. **Drzwi sieci (§1, dwie dziury)** — wiersz czterech adresów w portalu i etykiety
   na `.com`. Mała zmiana, bez niej żaden finał z §3.3 nie ma dokąd prowadzić.
1. **`leadersofteam.pl`** — pierwsza, bo jej silnik ma już tożsamość punktów
   przez cały tor, a strona niesie opowieść całej sieci (dlaczego).
2. **`leadersofteams.com`** — druga; jedyna z deployem z `main` przez CI, więc
   najszybciej daje dowód z produkcji.
3. **`leadersofteams.pl` (portal)** — trzecia; wymaga przejścia z prawem ADR-004
   przez `portal-anty-mlm` i wdrożenia ręcznego.
4. **`app.leadersofteams.com`** — czwarta; ręczne wdrożenie, PR po stronie właściciela.

Kolejność dotyczy jednej sesji. Cztery sesje równoległe — po jednej na repo — mogą
iść naraz; uzgadniają się przez `send_message` i przez ten plik (zmiana karty =
wszystkie cztery kopie).

## 6. Inspiracje — jak je czytać

Metoda z 2026-10-20 zostaje: pobrać kod, rozłożyć, zrzuty na całej długości
przewijania w 390 i 1440, **wziąć technikę, odrzucić ciężar** (loadery, obce CDN,
treść w warstwach `fixed`, przejęte przewijanie).

- Przeanalizowane: `aim24.pl`, `aim-motion-podglad.vercel.app` (wnioski: `docs/KIERUNEK-3D.md`
  w repo `.com`, `docs/formacja-feniksa.md` w repo `.pl`).
- Do analizy tą samą metodą przy następnym kroku: strony studiów znanych z opowieści
  przewijanej 3D (np. `igloo.inc`, `lusion.co`, `activetheory.net`) i strony
  produktowe z sekwencjami sterowanymi przewijaniem (np. `apple.com`). Każda analiza
  kończy się tabelą „bierzemy / nie bierzemy / dlaczego” w dokumencie sceny danego repo.
- Technika natywna do zmierzenia, zanim sięgnie się po JS: CSS
  `animation-timeline: scroll() / view()` dla warstwy DOM (zero bajtów JS;
  `leadersofteam.pl` używa jej już w szwach aktów) i View Transitions dla przejść
  między trasami **tej samej** domeny.

## 7. Rytuał rozwoju — każda sesja zostawia sieć mądrzejszą

1. Lekcja, która kosztowała czas → sekcja „Pułapki” w skillu sceny danego repo,
   w tej samej zmianie co kod.
2. Nowa zasada wspólna dla czterech stron → ten plik, cztery kopie, `SIEC_VERSION + 1`.
3. Inspiracja przeanalizowana → tabela „bierzemy / nie bierzemy” w dokumencie sceny.
4. Decyzja właściciela → `CLAUDE.md` danego repo z datą, a jeśli dotyczy sieci — tutaj.
