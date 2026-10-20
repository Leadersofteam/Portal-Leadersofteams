---
name: lot-scena-3d
description: Formacja 3D — wspólna scena WebGL całej sieci Leaders of Teams (leadersofteam.pl, leadersofteams.com, docelowo portal i landing aplikacji). Historia (rozproszeni ludzie → klucz prowadzony przez Feniksa → siedem bramek → Feniks z Liderów), kontrakt pliku `public/scene/formation-v1.js`, wzorce sceny (kurtyna, okno), bramki startu, wydajność, testy, synchronizacja między repozytoriami i lekcje z analizy stron 3D (aim24.pl, AIM Motion). Użyj PRZED każdą pracą nad sceną 3D, WebGL, cząsteczkami, Feniksem, kluczem ptaków, przejściami przewijanymi, „efektem wow", scrollytellingiem albo gdy ktoś prosi o stronę „jak aim24". Triggery - "3D", "WebGL", "scena", "Feniks", "klucz", "ptaki", "formacja", "cząsteczki", "particles", "scroll 3D", "scrollytelling", "przejścia", "efekt wow", "aim24", "three.js".
---

# Formacja 3D — jedna scena, cztery adresy

Jeden plik, bajt w bajt ten sam w każdym repozytorium, które go wysyła:
`public/scene/formation-v1.js` — surowy WebGL, **zero bibliotek, zero obcych hostów,
zero literałów koloru**, ~10 kB gzip. Nie przepisuj go w jednym repo. Zmiana = nowy
plik `formation-v2.js` + nowy skrót SHA-256 we **wszystkich** strażnikach, w PR-ach,
które wchodzą razem (patrz „Synchronizacja").

## 1. Historia — dlaczego w ogóle są tu punkty

Każdy punkt to człowiek. Historia jest jedna i idzie przez całą sieć (CLAUDE.md
`leadersofteam.pl` §7: Diagnoza → Ścieżka → Arsenał → Ruch):

| Kształt   | Znaczenie                                                                                                        | Gdzie gra                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `scatter` | rozproszeni, zdolni ludzie pracujący na cudze — blade punkty                                                     | intro hero (`.pl`), wejście sekcji (`.com`)                           |
| `skein`   | **Feniks prowadzi klucz** — sieć leci razem; 14 ptaków w V za Feniksem                                           | hero `.pl` po intro                                                   |
| `route`   | siedem bramek na krzywej wzrostu (`y = t^1.35`), trasa przez nie; poziom nie-`live` rysowany przerywanie i blado | wyjście hero `.pl`, start ostatniego aktu                             |
| `phoenix` | wszyscy stają się Feniksem — **Team z samych Liderów**                                                           | nad „Stań się Teamem” (`.pl`), nad „Płatna? Nie dla Liderów” (`.com`) |

Punkty zachowują tożsamość między kształtami: pierwsze ~16 % indeksów to **rdzeń
Feniksa** — przywódca klucza → siódma bramka → serce i głowa wielkiego Feniksa. Dzięki
temu przejście czyta się jak jeden ruch, nie jak przenikanie obrazków.

Feniks na `.pl`: ciało i głowa w akcencie (`--color-violet-gfx`), ogon i grzebień
w ogniu (`--color-growth-gfx` — jedyny odcień, który na tej stronie już znaczy
„wzrost”; drugi akcent na ekranie, §8.3 pozwala na dwa). Na `.com`:
`--color-accent` + `--color-highlight`, mieszanie addytywne na ciemnym tle.

**Granica §1 (nie kłamiemy):** scena jest dekoracją (`aria-hidden`). Nie niesie
liczb, statusów ani obietnic, których nie ma w tekście. Statusy poziomów idą
z danych (`LEVELS`), nie z ręki.

## 2. Przejścia — lot, nie przenikanie

- Każdy punkt ma `order` w kształcie docelowym i rusza z własnym opóźnieniem:
  `pf = smoothstep(d·0.5, d·0.5+0.5, f)`. Skein: najpierw Feniks, potem ptaki od
  czoła. Route: najpierw niższe bramki, Feniks ostatni na L7. Phoenix: od serca na
  końce skrzydeł i ogona.
- Lot po łuku: `p = mix(A,B,pf) + curl·sin(π·pf)·arc` — żaden kształt nie przechodzi
  przez „szarą chmurę”. `arc` jest w `VIEWS[kształt]`.
- Kamera interpoluje `VIEWS` (dystans, odchylenie, wzniesienie, `lift`, `pull`)
  krzywą `easeInOut` tego samego `f`.
- Przewijanie wygładzane `lerp` zależnym od `dt` (spójne przy 30/45/60 fps).
- Życie w spoczynku: skrzydła klucza (szybko), fala wzdłuż V, wolny takt skrzydeł
  Feniksa wędrujący ku końcówkom, migotanie ognia. Nic nie stoi jak zdjęcie.

## 3. API

```js
import { mountFormation } from "/scene/formation-v1.js";
mountFormation(canvas, {
  surface: "light" | "dark",            // blend: ink na papierze / światło na atramencie
  inkVar, accentVar, fireVar,           // NAZWY zmiennych CSS strony — nie hexy
  climb: 1.35, live: [true × 7],        // z danych strony
  story: ["scatter","skein","route"],   // do 4 kształtów
  intro: true,                          // story[0]→story[1] na zegarze (2,8 s)
  drive: "exit" | "enter",              // przewijanie: scena wychodzi / wchodzi
  frame: { desktop:[x,y], tablet:[x,y], mobile:[x,y] }, // przesunięcie kadru
  fade: 0.5,                            // ile scena „cofa się” przy wyjściu
}) // → { destroy() } | null
```

Rodzic płótna to **scena** (stage): na nią idzie `data-formation-live` po pierwszej
klatce i to ją obserwuje `IntersectionObserver` (rysujemy tylko widoczną scenę).

## 4. Dwa wzorce sceny

**Kurtyna (hero):** sekcja z `clip-path: inset(0)`, płótno `position: fixed; inset: 0`.
Scena stoi w oknie przeglądarki, strona przewija się nad nią, następna sekcja
zasuwa ją jak kurtyna. Zero przypinania, zero dodatkowej wysokości.
⚠️ Żaden przodek płótna nie może mieć `transform`, `perspective`, `filter`,
`will-change: transform` — każdy z nich staje się blokiem zawierającym dla `fixed`
(na `.pl` dlatego płótno stoi **przed** `TiltScene`, nie w środku).

**Okno (sekcja niżej):** blok w przepływie z własną wysokością
(`.formation-window`), płótno `absolute`. Kształt nigdy nie ląduje pod zdaniem,
bo okno nie ma tekstu. Używaj, gdy w układzie nie ma pustej przestrzeni.

Plakat (`.formation-poster`) — statyczny SVG tego samego kształtu — jest zawsze
w HTML i znika (opacity) dopiero po pierwszej klatce sceny. **Płótno nie ma
własnego `opacity: 0`** — puste płótno jest przezroczyste, a scena sama wygasza
punkty na starcie (strażnik „nic w `<main>` na opacity 0” w testach ruchu).

## 5. Bramki startu — w tej kolejności

1. brak `getContext` → nic; 2. `prefers-reduced-motion: reduce` → plakat, scena
   **nigdy się nie pobiera**; 3. Save-Data → plakat; 4. czekamy na **pierwszy gest**
   (pointermove/pointerdown/touchstart/wheel/keydown/scroll) albo **5,5 s po `load`**;
2. `requestIdleCallback`; 6. w scenie: `failIfMajorPerformanceCaveat` + nazwa
   sterownika (`SwiftShader|llvmpipe|softpipe|software`) → `null`, plakat zostaje.

Dlaczego 4 i 6 (zmierzone, Lighthouse mobile, `/` na `.pl`, ten sam kontener):

| wariant                                                | perf   | TBT    |
| ------------------------------------------------------ | ------ | ------ |
| bez sceny                                              | 93     | 187 ms |
| sam kontekst WebGL                                     | 90     | 238 ms |
| scena na load+idle, render programowy                  | 82     | 533 ms |
| scena odmawia renderu programowego, start na load+idle | 90     | 283 ms |
| **+ start na gest / 5,5 s (wdrożone)**                 | **93** | 232 ms |

Utworzenie kontekstu WebGL to długie zadanie nawet wtedy, gdy scena potem odmawia.
`globalThis.FORMATION_ALLOW_SOFTWARE = true` (ustawiane wyłącznie przez testy
i skrypty zrzutów **przed** załadowaniem strony) zdejmuje bramkę 6 w CI bez GPU.

## 6. Wydajność

- Tiery po szerokości: 8000 / 5200 / 3200 punktów, DPR ≤ 1,75 / 1,5 / 1,25,
  60 / 45 / 30 fps (bramka klatek, nie `setInterval`).
- `gl_PointSize` przycięty (punkt przy obiektywie nie staje się kleksem),
  mgła po głębokości, `depth:false`, `antialias:false`, `powerPreference:"low-power"`.
- Pętla stoi, gdy scena poza kadrem albo karta ukryta; ResizeObserver; obsługa
  `webglcontextlost` (plakat wraca).
- Kształty generowane raz, deterministycznie (`rng(0x1e7)`) — ten sam klucz przy
  każdym wejściu, stabilne zrzuty.
- Plik poza bundlem: `.pl` — skrypt w SSR obok płótna (zapadka JS z §12 nietknięta,
  `/` = 106 820 B przed i po); `.com` (SPA) — `useEffect`, bo skrypt z
  `dangerouslySetInnerHTML` nie uruchomi się po nawigacji klienckiej.
- Cache: plik wersjonowany w nazwie → `immutable` na rok (`.pl`: `next.config.ts`,
  `.com`: `.htaccess` łapie `*.js`).

## 7. Weryfikacja — „zrobione” znaczy zmierzone

```bash
# .pl
npm run validate && npm run typecheck && npm run build && npm run assemble \
  && npm run drift && npm run budget && npx playwright test   # tests/formation.spec.ts
CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  npm run lighthouse -- --origin http://127.0.0.1:<port> --routes / --runs 3
# .com
npm run check:all            # check:scene pilnuje sumy, hostów, kolorów, wagi
```

Zrzuty sceny w CI bez GPU: Chromium z `--use-gl=angle --use-angle=swiftshader
--enable-unsafe-swiftshader`, `addInitScript(() => globalThis.FORMATION_ALLOW_SOFTWARE = true)`,
potem **ruch myszy** (bramka gestu), dopiero potem przewijanie. Szerokości
360 / 768 / 1280 / 1920. Oceniaj: czy kształt nie ląduje pod zdaniem, czy L7 nie jest
ucięte, czy przejście nie przechodzi przez szarą chmurę.

Testy (`.pl`, `tests/formation.spec.ts`): SSR niesie płótno + plakat i nie niesie
sceny; scena pobierana dopiero po `load` i geście, z tego samego originu; bez GPU
plakat zostaje; reduced motion → zero żądań `/scene/`; plik `immutable`, bez
importów, URL-i i hexów; jedna scena na dwa płótna; nic przed gestem lub 5,5 s.
Każdy z tych testów był sprawdzony na czerwono.

## 8. Synchronizacja między repozytoriami

Kanoniczne źródło: `leadersofteam.pl` (`Leadersofteam/leadersofteam`). Kopie:
`leaders-of-teams-nowa-strona` (`.com`). Skrót SHA-256 jest wpisany w
`scripts/check-js-budget.mjs` (`.pl`) i `scripts/check-scene.mjs` (`.com`).

Zmiana sceny: (1) skopiuj do `formation-v2.js` i zmień tam; (2) przepnij wywołania;
(3) nowe skróty i wagi w obu strażnikach; (4) PR-y w obu repo z odnośnikiem do
siebie nawzajem. Stary plik zostaje do czasu, aż brzeg CDN (`.pl` §5) przestanie
podawać stare dokumenty.

## 9. Czego się nauczyliśmy z aim24.pl i AIM Motion (2026-10-20)

**Bierzemy (technika):** scena jako zegar przewijania z wygładzaniem; klatki
kluczowe interpolowane przez `smoothstep`; tiery jakości po szerokości (liczba
punktów, DPR, fps); bramka klatek zamiast pełnego rAF na telefonie; jedna scena
wielu kształtów zamiast wielu animacji; ruch kamery za kursorem tylko na precyzyjnym
wskaźniku; pętla zatrzymana poza kadrem; statyczna klatka/plakat przy redukcji ruchu.

**Odrzucamy (z powodem):**

- three.js z unpkg + importmap, Lenis z CDN, Google Fonts, siatka „mózgu” z obcego
  bucketu → §4.2 (zero obcych hostów), zapadka JS. Orbita na aim24 ładuje 650 kB
  surowego JS; nasza scena 10 kB gzip.
- Ekran ładowania z procentami przed treścią → opóźnia LCP; u nas treść jest
  pierwsza, scena dochodzi po geście.
- Treść w `position: fixed` warstwach przełączanych `opacity`/`inert` → treść
  znika z przepływu, roboty i czytniki widzą co innego niż człowiek. U nas tekst
  zostaje w dokumencie, ruchoma jest tylko dekoracja.
- Odsłanianie liter przez `filter: blur()` → drogie na każdej klatce, nieczytelne
  w trakcie; zakazane przez §8.6 (tylko `transform` i `opacity`).
- Orb / galaktyka / mózg z cząstek → wizualny default każdej agencji AI (§8.1).
  Nasze kształty są **naszą historią**: klucz, bramki, Feniks.
- Formularz z `preventDefault()` bez wysyłki → atrapa (§0.2, §1).
- Baner zgód zasłaniający połowę ekranu na każdej podstronie → §11.

## 10. Pułapki, które już kosztowały czas

- `pkill -f "<wzorzec>"` w tym samym poleceniu, które zawiera wzorzec, zabija
  własną powłokę (exit 144). Zatrzymanie serwera: `pkill -f "[a]rtifact/deploy/server.js"`
  w **osobnym** wywołaniu.
- `IntersectionObserver` na płótnie `fixed` zawsze widzi przecięcie — obserwuj
  scenę (rodzica).
- Powtórzony kształt w nieużywanym slocie trzeba **użyć ponownie**, nie wygenerować
  drugi raz — inaczej atrybuty skrzydeł/ognia opisują inne stado niż pozycje.
- Scena niżej na stronie rysowała klatkę poza kadrem, bo `visible` startowało jako
  `true`. Start z `false`; obserwator zawsze raportuje raz po `observe`.
- Chromium nie zawsze oznacza SwiftShader jako „major performance caveat” — stąd
  druga bramka po nazwie sterownika.
- Nowy kształt = nowy wpis w `SHAPES` **i** `VIEWS` (kamera, łuk). Bez `VIEWS`
  kamera dostanie `undefined`.
