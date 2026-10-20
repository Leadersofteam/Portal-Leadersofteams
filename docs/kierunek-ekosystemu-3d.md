# Kierunek ekosystemu: Formacja w przestrzeni

> Decyzja właściciela z 2026-10-20: „Obieramy nowy kierunek dla całego ekosystemu
> Leaders of Teams” — inspiracja stronami 3D (aim24.pl, aim-motion-podglad.vercel.app),
> z zastrzeżeniem: **ma pasować do naszej marki**, a **ptaki prowadzi Feniks**.
> Ten dokument jest wspólny dla czterech repozytoriów sieci (ten sam tekst w każdym).
> Kontrakt techniczny: skill `lot-scena-3d`.

## 1. Teza w jednym zdaniu

Cztery adresy marki dostają **jeden wspólny ruchomy znak** — punkty, z których każdy
jest człowiekiem: rozproszeni → klucz prowadzony przez Feniksa → siedem bramek drogi
→ wszyscy razem jako Feniks, czyli **Team z samych Liderów**. Do tej pory sieć łączył
wyłącznie wiersz czterech adresów w stopce; od dziś łączy ją też obraz.

## 2. Co wzięliśmy z referencji, a co odrzuciliśmy

Przeanalizowane 2026-10-20 (kod pobrany i rozłożony, zrzuty w 1440/390 px na całej
długości przewijania):

|                | aim24.pl                                                                                     | AIM Motion (podgląd)                                                  | my                                                     |
| -------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| Silnik         | three.js w chunku 650 kB (GLTF + Draco, szkło `transmission`), shader „lawy” w surowym WebGL | three.js z unpkg + importmap, `EffectComposer` z bloomem, Lenis z CDN | **surowy WebGL, ~14,7 kB gzip, jeden plik**            |
| Historia       | orbita kart portfolio                                                                        | kula → galaktyka → mózg (siatka z obcego bucketu)                     | rozproszenie → klucz z Feniksem → bramki → Feniks      |
| Treść          | SPA, pusty `<div id="root">` dla robota                                                      | treść w `fixed` warstwach przełączanych `opacity`                     | treść w dokumencie, ruchoma wyłącznie dekoracja        |
| Start          | ekran ładowania                                                                              | ekran ładowania z procentami                                          | treść natychmiast; scena po pierwszym geście lub 5,5 s |
| Obce hosty     | Google Fonts, analityka                                                                      | unpkg, Google Fonts, getlayers.ai                                     | **zero**                                               |
| Redukcja ruchu | —                                                                                            | statyczna klatka sceny                                                | scena w ogóle się nie pobiera; zostaje plakat SVG      |

Technika, którą przejęliśmy wprost: **przewijanie jako zegar sceny** z wygładzaniem,
klatki kluczowe przez `smoothstep`, tiery jakości po szerokości ekranu, bramka liczby
klatek na telefonie, zatrzymanie pętli poza kadrem, kamera za kursorem tylko na
precyzyjnym wskaźniku. Kształty są nasze, nie ich: orb, galaktyka i mózg z cząsteczek
to wizualny default agencji AI (`leadersofteam.pl` CLAUDE.md §8.1).

## 3. Jak to brzmi w marce

- **Bielik to nasz ptak, Feniks to nasza opowieść.** Bielik zostaje faktem
  technologicznym („budujemy na Bieliku”, §9.4). Feniks jest metaforą: odrodzenie —
  polskie firmy znikające z mapy wracają jako Teamy (§7: „Rodzinne firmy znikają
  z mapy” → „Odwracamy ten układ”).
- **Feniks jest przerysowany z prawdziwej ryciny**, nie wymyślony: heraldyczny
  Feniks Arthura Charlesa Fox-Daviesa (1909, domena publiczna), odtworzony
  punktami — każdy punkt to człowiek, razem tworzą rycinę.
- **Feniks prowadzi od pierwszej sekundy** i jest tym samym zestawem punktów przez
  całą stronę: przywódca klucza → siódma bramka (L7, własny Team) → serce wielkiego
  Feniksa. Nie pojawia się znikąd.
- **Kolor niesie znaczenie** (§8.3): ciało Feniksa w fiolecie marki, ogień w akcencie
  wzrostu (bursztyn `growth`) — jedynym odcieniu, który na `.pl` już znaczył „w górę”.
- **Uczciwość (§1):** scena nie pokazuje liczb, statusów ani obietnic, których nie ma
  w tekście; poziomy w budowie byłyby rysowane przerywaną, bladą bramką.

## 4. Stan na 2026-10-20 — cztery właściwości

| Właściwość               | Repo                           | Co dostała                                                                                                                                            | Status                                                       |
| ------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `leadersofteam.pl`       | `leadersofteam`                | hero: rozproszenie → klucz z Feniksem → 7 bramek (kurtyna, manifest zasuwa scenę); akt „Ruch”: trasa zrywa się i staje Feniksem nad „Stań się Teamem” | **wdrożone w PR**, 7 nowych testów, zapadka JS `/` bez zmian |
| `leadersofteams.com`     | `leaders-of-teams-nowa-strona` | sekcja „Dwie drogi”: rozproszenie → klucz → Feniks nad drzwiami do sieci, motyw ciemny (mieszanie addytywne)                                          | **wdrożone w PR**, nowa bramka `check:scene`                 |
| `leadersofteams.pl`      | `portal-leadersofteams`        | — (skill i ten dokument)                                                                                                                              | **propozycja**, niżej                                        |
| `app.leadersofteams.com` | `leaders-of-teams-app`         | — (skill i ten dokument)                                                                                                                              | **propozycja**, niżej                                        |

### Propozycje dla portalu i aplikacji — świadomie nie wdrożone

- **Portal** jest narzędziem z zasadą anty-engagement (ADR-010: bez liczników, bez
  „efektów” w feedzie). Jedyne miejsce, gdzie scena ma sens bez łamania ADR, to
  **publiczny `/drabinka`**: siedem bramek z danymi poziomów z portalu (to portal
  publikuje progi), a Feniks wyłącznie przy L7. Wymaga: kopii pliku, okna
  `.formation-window`, bramki sumy kontrolnej jak `check:scene` na `.com`.
  Portal ma wdrożenia ręczne — decyzja i wdrożenie po stronie właściciela.
- **Aplikacja** ma jedno kryterium akceptacji: „handlowiec przestaje robić X”. Scena
  go nie spełnia w środku aplikacji — i nie powinna tam wchodzić. Kandydat:
  **wyłącznie publiczny landing** (`/`, niezalogowany), sekcja rejestracji, motyw
  jasny i ciemny. Uwaga z repo aplikacji: CSP — plik jest same-origin, więc nie
  wymaga zmian w `script-src`.

## 5. Zasady, które obowiązują każdą przyszłą scenę w sieci

1. Jeden plik, jedna wersja, ten sam skrót SHA-256 w każdym repo (skill §8).
2. Treść najpierw: plakat w HTML, scena po geście; nic nie blokuje LCP ani TBT.
3. Reduced motion = scena się nie pobiera. Brak GPU = scena odmawia.
4. Żaden punkt nie ląduje pod zdaniem: kurtyna tylko tam, gdzie kompozycja ma
   pustą przestrzeń; w pozostałych miejscach okno z własną wysokością.
5. Nowy kształt musi znaczyć coś w historii z §1 tego dokumentu. Jeśli nie umiesz
   powiedzieć, kim są te punkty — nie dodawaj go.
