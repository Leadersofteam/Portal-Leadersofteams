# Kierunek „Instrument w przestrzeni" — scena 3D w ekosystemie LOT

> **KOPIA** — kanon stoi w repo `leadersofteams.com` (`docs/KIERUNEK-3D.md`).
> Decyzja właściciela z 2026-10-20: nowy kierunek dla całego ekosystemu, na wzór
> `aim24.pl` i `aim-motion-podglad.vercel.app`. Zmieniając zasady, zmień wszystkie
> trzy kopie; ścieżki plików w tabelach niżej odnoszą się do właściwego repo.
>
> Skill wykonawczy: **`lot-scena-3d`** (w każdym z trzech repo, dopasowany do jego bramek).

---

## 1. Jedno zdanie

**Scena 3D w LOT nie jest dekoracją, tylko danymi produktu narysowanymi punktami.**
Każdy kształt na scenie jest wykresem, który strona i tak pokazuje liczbami obok:
lead w stanie z lejka, słupki leadów wg etapu, puls zespołu, poziomy Drabinki.

To jest rozwinięcie kierunku „Instrument" (BRANDBOOK §1), a nie jego odwołanie.
Sprint 8 usunął `NeuralNetworkBackground`, bo był ruchem bez informacji. Ten kierunek
przywraca ruch pod jednym warunkiem: **punkt musi coś znaczyć.** Jeśli nie da się
napisać legendy do sceny, to scena nie powinna istnieć.

## 2. Analiza wzorców — jak to jest zrobione

Pomiar 2026-10-20: kod źródłowy obu stron, zrzuty w przewijaniu 1440 × 900.

### 2a. `aim-motion-podglad.vercel.app` — scena sterowana przewijaniem

Jeden plik HTML (110 kB) i jeden moduł JS. Mechanika:

| Warstwa            | Jak                                                                                                                                                                                                                                                                                         | Koszt / uwaga                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Biblioteka         | three.js 0.185 przez `importmap` z **unpkg** + `EffectComposer` + `UnrealBloomPass`                                                                                                                                                                                                         | ~150 kB gzip, zewnętrzny CDN w runtime (IP odwiedzającego do unpkg) |
| Płynne przewijanie | **Lenis** (`smoothWheel`)                                                                                                                                                                                                                                                                   | przejmuje kółko — przewijanie przestaje być natywne                 |
| Sceny              | 3 chmury punktów (`THREE.Points` + `ShaderMaterial`): **kula** 23 000 pkt (szum simplex w vertex shaderze, otwór „bore" na osi kamery), **galaktyka** (ramiona spirali liczone w shaderze z hasha pozycji — CPU nie liczy nic), **mózg** 130 000 pkt próbkowanych z siatki GLTF z synapsami | wszystko na GPU; CPU podaje tylko uniformy                          |
| Oś czasu           | `computeScrollTarget()` — tor 4 × 2 ekrany, z niego jedna liczba `progress` 0…4; `KEYFRAMES` z wartościami per etap, `sampleScene()` interpoluje                                                                                                                                            | jedna liczba steruje całą reżyserią                                 |
| Wygładzanie        | `progress += d * (1 − (1 − lerp)^(dt·60))` — lerp **niezależny od liczby klatek**                                                                                                                                                                                                           | to jest źródło „miękkości"                                          |
| Tekst              | trzy `section.fixed-overlay` nad kanwą, krycie liczone z `progress`; wejścia liter i słów przez `opacity: 0` + `filter: blur(12px)`                                                                                                                                                         | tekst jest **niewidoczny w HTML-u**, póki skrypt go nie odsłoni     |
| Kursor             | „olej": wybrzuszenie i fala w world-space, irydescencja                                                                                                                                                                                                                                     | wyłączony na tabletach i telefonach                                 |
| Poziomy jakości    | `TIERS` po szerokości: liczba punktów, DPR 0,75–2, **limit kl./s 60/45/30**, bloom on/off                                                                                                                                                                                                   | telefon dostaje ~28% punktów i 30 kl./s                             |
| Redukcja ruchu     | scena rysuje się **raz** i staje; `document.hidden` pauzuje pętlę                                                                                                                                                                                                                           | —                                                                   |
| Loader             | kurtyna z gwiazdami, min. 900 ms + 260 ms przytrzymania                                                                                                                                                                                                                                     | opóźnia pierwszą treść o ponad sekundę z założenia                  |

### 2b. `aim24.pl` — produkcyjna strona studia

React SPA (363 kB JS), framer-motion, `IntersectionObserver`, font Kanit z Google Fonts,
pusty `<div id="root">` w HTML-u (bez pre-renderu), baner cookies zasłaniający ~40%
pierwszego ekranu na każdym kadrze. Siła: duża typografia, siatka realizacji jako
dowód, formularz wyceny z kwalifikacją (branża, termin). Słabość dla nas: treść
nie istnieje bez JS — dla bota asystenta AI ta strona jest pusta.

## 3. Co bierzemy, czego nie bierzemy

| Z wzorca                                                     | Decyzja                                            | Powód                                                                                                                                                                         |
| ------------------------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chmury punktów + shader + morfowanie formacji na GPU         | **Bierzemy**                                       | to jest cały efekt; reszta to opakowanie                                                                                                                                      |
| three.js z CDN                                               | **Nie** — własny silnik ~6 kB (`particleField.ts`) | z three.js używane są wyłącznie `Points`, `ShaderMaterial`, kamera. `check:bundle` (.com), ADR-009 (Portal: zero zewnętrznych dostawców), „click = 0 zł" + self-hosting (App) |
| Jedna liczba `progress` steruje sceną, lerp zależny od czasu | **Bierzemy**                                       | `setStage()` + `tier.lerp` w silniku                                                                                                                                          |
| Poziomy jakości (punkty, DPR, limit kl./s, kursor)           | **Bierzemy**                                       | `resolveTier()` — dodatkowo po `hardwareConcurrency` i `deviceMemory`, nie tylko po szerokości                                                                                |
| Pauza poza kadrem i w ukrytej karcie                         | **Bierzemy, mocniej**                              | AIM pauzuje tylko `document.hidden`; my także `IntersectionObserver` — scena pod foldem nie kosztuje nic                                                                      |
| Lenis                                                        | **Nie**                                            | przejmuje przewijanie: łamie `position: sticky`, klawiaturę i oczekiwanie użytkownika. Miękkość dostajemy z lerpu sceny, a strona przewija się natywnie                       |
| Tekst na warstwach `fixed` sterowanych kryciem               | **Nie**                                            | tekst stoi w zwykłym przepływie dokumentu. Kanwa jest `absolute` (hero) albo `sticky` w jednej sekcji (rozdziały)                                                             |
| Wejścia `opacity: 0` + `filter: blur()`                      | **Nie**                                            | pre-render zapisuje stan początkowy inline → treść niewidoczna dla czytnika bez JS (CLAUDE.md §4, `check:prerender`). `filter` przelicza się co klatkę (BRANDBOOK §4)         |
| Bloom (post-processing)                                      | **Nie**                                            | drugi przebieg renderu na pełnym ekranie. Ten sam „blask" daje mieszanie addytywne punktów z ostrym rdzeniem i cienką aureolą                                                 |
| Loader z kurtyną                                             | **Nie**                                            | treść jest od pierwszej klatki. Scena zlatuje się w 1,7 s _obok_ gotowej strony, zamiast zasłaniać ją na 1,2 s                                                                |
| Kolory jako literały w JS                                    | **Nie**                                            | paleta to nazwy zmiennych CSS ról (`--color-*`, `--heat-*`, `--level-*`), czytane w runtime — przemalowanie serwisu przemalowuje scenę                                        |
| Duża typografia, siatka dowodów (aim24)                      | **Bierzemy kierunek**                              | już mamy: `.display`, `CaseStudyPreview`                                                                                                                                      |

## 4. Silnik — `particleField.ts`

Jeden plik, czysty WebGL 1, jedno wywołanie `drawArrays` na klatkę.

- **Model:** każdy punkt ma do 4 pozycji (formacji) i rolę koloru w każdej. JS podaje
  jedną liczbę `stage`, shader interpoluje pozycję i barwę — **każdy punkt z własnym
  opóźnieniem** (okno 55% odcinka), z lekkim łukiem lotu.
- **API:** `mountField(canvas, spec, { reducedMotion, onReady, onLost })` → `{ setStage, setPointer, setShift, destroy }` albo `null`.
- **Formacja dostaje `prev`** — pozycję tego samego punktu w poprzedniej formacji, więc
  przejście może zachować kierunek punktu (zebranie zamiast przetasowania).
- **Odmowa = stan poprawny:** brak WebGL, błąd shadera, `failIfMajorPerformanceCaveat`,
  utrata kontekstu. Strona bez sceny jest kompletna.
- **Kopie:** `.com` `src/components/scene/` (kanon) · App `apps/web/components/scene/` ·
  Portal `apps/web/components/scene/`. Różnią się wyłącznie akapitem nagłówka
  i formatowaniem prettiera danego repo. Zmiana = wszystkie trzy + podbicie
  `FIELD_VERSION` (dziś **2**). Kontrola: `grep -rn "FIELD_VERSION =" */*/components/scene */src/components/scene`.

## 5. Płynność narracji — zasady (nie gust)

Właściciel 2026-10-20: _„Przejścia muszą być płynne, aby skutecznie opowiadały i budowały
historię i przekaz."_ Z tego wynikają reguły, każda z mechanizmem w kodzie:

1. **Kształt stoi, gdy tekst mówi; przelewa się w pauzie.** `spec.hold` (domyślnie 0,22):
   pierwsze i ostatnie 22% każdego odcinka toru trzyma formację nieruchomo, przejście
   dzieje się w środku smoothstepem. Bez tego kształt jest „gotowy" w jednym punkcie
   toru i czytelnik nigdy nie widzi wykresu w spoczynku. Zmierzone filmem klatek
   (skill `lot-scena-3d`, krok 5): pętla stoi 0–300 px, słupki 600–1050 px, puls
   zespołu od 1350 px.
2. **Etap wynika z treści, nie z piksela.** Rozdziały oznaczają się `data-story-stage`;
   etap to interpolacja między **środkami bloków** w oknie. Zmiana copy, która wydłuża
   rozdział, nie rozjeżdża sceny z tekstem.
3. **Przewijanie nigdy nie jest przejmowane.** Natywny scroll + lerp sceny zależny od czasu
   (`tier.lerp`). Szarpnięcie kółkiem daje płynny dojazd sceny, a nie skok.
4. **Obraz i liczba w jednym rytmie.** Odczyt obok kształtu (paski w App) dorasta
   do wartości (`scaleX`, 750 ms, `whileInView`) w tym samym momencie, w którym punkty
   układają się w ten kształt — oko łączy je bez legendy.
5. **Łuk lotu jest mały.** 0,22 jednostki. Przy 0,45 chmura w połowie przejścia rozlewała
   się na pół ekranu i czytała się jak eksplozja, nie przesunięcie.
6. **Wejście jest ruchem jednorazowym, który coś wprowadza** (BRANDBOOK §4, trzecia legalna
   odpowiedź): punkty zlatują się do formacji w 1,7 s po zamontowaniu. Potem tylko
   spokojny dryf i obrót — ruch ciągły ma powód (orbita krąży, wahadło pokazuje głębię
   wykresu), więc `repeat` nie jest dekoracją.
7. **Wykres się nie kręci w kółko.** Formacje-wykresy używają `spinMode: 'swing'`
   (±0,45 rad) — pełny obrót ustawiłby słupki jeden za drugim.
8. **Kanwa wchodzi kryciem dopiero po pierwszej narysowanej klatce** (`onReady`), nigdy
   pusta — i nigdy nie ma jej w pre-renderze.

## 6. Kontrakt wydajności i dostępności

- Kanwa `aria-hidden`, poza drzewem dostępności; treść, którą niesie scena, stoi obok
  jako tekst/liczby.
- `prefers-reduced-motion: reduce` → bez wejścia, bez dryfu, bez kursora; klatka rysowana
  tylko po zmianie etapu (stany skokowe, jak drabinka `ScrollAssembly`).
- Nasłuch przewijania pasywny i za bramką rAF; geometria mierzona w `ResizeObserver`,
  handler czyta wyłącznie `scrollY` (CLAUDE.md §4, `check:perf`).
- Pętla rAF staje poza kadrem (`IntersectionObserver`) i w ukrytej karcie.
- **Kanwa nie leży pod akapitem.** axe liczy kontrast z koloru tła w arkuszu, nie z kanwy,
  więc punkt przelatujący przez tekst obniża realny kontrast niewidocznie dla bramki.
  Środki: maska liniowa od strony kolumny tekstu (.com), nieprzezroczysta karta pod
  treścią rozdziału na telefonie (App), przygaszenie kanwy do 50% na telefonie (App).
- Sticky z ujemnym marginesem wyjeżdża poza rodzica o cały ekran — rodzic dostaje
  `overflow: clip` (nie `hidden`, które zabiłoby sticky). Patrz miny w App.

**Zmierzone 2026-10-20 (.com):** `check:all` 16/16 ze sceną, w tym `check:perf (2)`
(CPU ÷4, p95 ≤ 20 ms) i `check:wcag` (45 tras × 2 viewporty). **Headless Chromium z SwiftShaderem
NIE odmawia przy `failIfMajorPerformanceCaveat`**, więc bramki zmierzyły stronę ze sceną
na renderowaniu programowym — nie mają taryfy ulgowej.

Po restarcie kontenera (nowa maszyna, 4 rdzenie) `check:perf (2)` zrobiło się czerwone —
więc zrobiłem A/B naprzemiennie, `main` w osobnym worktree, ten sam skrypt i port:

| przebieg    | `/` (scena) | `/lot-app/` | `/services/web-development/` | `/about/` | `/contact/` |
| ----------- | ----------- | ----------- | ---------------------------- | --------- | ----------- |
| gałąź #1    | ✗ 33,4      | ✗ 33,3      | ✓ 16,8                       | ✓ 16,7    | ✓ 16,7      |
| **main #1** | **✗ 33,4**  | **✗ 33,3**  | ✓ 16,8                       | ✓ 16,8    | ✓ 16,8      |
| gałąź #2    | ✗ 33,4      | ✗ 33,4      | ✗ 33,3                       | ✓ 16,7    | ✓ 16,8      |
| **main #2** | **✗ 33,4**  | **✗ 33,3**  | **✗ 33,4**                   | ✓ 16,8    | ✓ 16,7      |

p95 w ms, CPU ÷4, zero długich zadań wszędzie. **`main` bez sceny pada tak samo** — na tej
maszynie bramka jest czerwona z powodu środowiska (33,3 ms = co druga klatka), a scena nie
dokłada do p95 nic mierzalnego. W poprzednim kontenerze ta sama gałąź przeszła 16/16.
Wniosek procesowy: czerwone `check:perf (2)` czyta się wyłącznie obok pomiaru `main`
z tej samej maszyny (skill `lot-scena-3d`, krok 4).

**Rozstrzygnięcie w CI (PR #175, runner GitHuba, 2026-10-20):** `check:perf (2)` zielone —
`/` ze sceną p95 **16,8 ms**, `/lot-app/` 16,8, `/services/web-development/` 16,8, `/about/` 16,7,
`/contact/` 16,8, zero długich zadań. Do tego `check:visual` 45 tras × 2 viewporty bez błędów
konsoli, `check:a11y` (w tym „nic nie rusza się samo przy redukcji ruchu"), `check:forms`
i `check:wcag` 2 × 45 tras. Czerwień z kontenera sesji była maszyną, co potwierdza A/B.

## 7. Sceny per właściwość

| Właściwość                         | Scena                                            | Formacje                                                                          | Co znaczy punkt                                                                                                                                                                             |
| ---------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `leadersofteams.com` — hero        | **Orbita leadów** wokół `AppSurface`             | orbita (pasma = etapy) → zebrane przy krawędzi karty; utracone odpadają           | lead; kolor = `state-*` z lejka, legenda pod kartą                                                                                                                                          |
| `app.leadersofteams.com` — landing | **Dane układają się same** w ciemnej `StoryZone` | pętla dnia (5 węzłów) → leady wg etapu 43/12/4/3 → puls zespołu (4 paski + deale) | proporcje = `demoData.ts`, te same liczby co odczyt obok; kolor = `--heat-*` (bursztyn tylko dla wygranej)                                                                                  |
| `leadersofteams.pl` — hero Portalu | **Drabinka w przestrzeni**                       | 7 szczebli → światło wspina się 1–3 szczeble wyżej                                | poziom; kolor = `--level-1…7`                                                                                                                                                               |
| `leadersofteam.pl`                 | —                                                | —                                                                                 | nieruszone 2026-10-20. Na koncie jest repo `Leadersofteam/Leadersofteam` (najpewniej ta właściwość — do potwierdzenia); nie było w zakresie sesji. Zasady z tego dokumentu obowiązują i tam |

## 8. Otwarte i niezweryfikowane

- **Pomiar na prawdziwym GPU i Safari/iOS** — wszystkie pomiary z tej sesji to headless
  Chromium + SwiftShader. Telefon z iOS nie był oglądany.
- **Bateria telefonu** — tier niski to 30 kl./s i 35% punktów; nie mierzone.
- **Produkcja** — nic z tego nie jest wdrożone; .com wdraża się z `main` (merge PR),
  App i Portal ręcznie przez właściciela.
