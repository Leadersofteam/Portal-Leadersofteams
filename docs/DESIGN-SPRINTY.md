# Program designu Portalu — „pierwsze wrażenie przed pierwszymi dwudziestoma"

> Utworzony 2026-08-19 na polecenie właściciela. Zasada nadrzędna: **mobile-first
> (390 px, kciukiem)** i **koniec z wyglądem generycznym** — przy pełnym poszanowaniu
> ADR-009 (0 zł, zero zewnętrznych dostawców) i ADR-010 (anty-engagement).
> Proces i bramki jakości: skill **`portal-design`**.

## Po co i KIEDY

Wąskim gardłem Portalu są ludzie, nie funkcje (CLAUDE.md). Ten program nie jest „kolejną
funkcją" — jest przygotowaniem **pierwszego wrażenia** zanim właściciel zaprosi pierwszych
dwudziestu (S19). Sekwencja: PD1–PD2 mogą iść PRZED zaproszeniami (landing, rejestracja,
feed — to zobaczy każdy zaproszony w pierwszej minucie); PD3–PD4 mogą iść równolegle do
życia Portalu. Decyzje S19 (dane demo, lista osób) pozostają nietknięte i nadrzędne.

## Stan zastany (zmierzony 19.08) — fundament jest lepszy niż w App

- Własne tokeny ciemnego motywu w `app/globals.css` (bg/surface/text/border w odcieniu
  indigo) + **gotowa sygnatura**: poziomy Drabinki „im wyżej, tym cieplejsze światło"
  (`--level-1…7`).
- Typografia dwugłosowa już jest: **Bricolage Grotesque** (display) + Inter, przez
  `next/font` (self-host w buildzie — zgodne z ADR-009).
- Słabość wspólna z App: **paleta primary to stockowe indigo Tailwinda hex w hex**
  („zgodna z lot-app" — więc zmieniamy ją RAZEM z App, patrz niżej).
- Ilustracje/ikony: rysowane własnym SVG (zasada ADR-009) — to atut tożsamości, nie brak.
- Luki zmierzone w S20 roadmapy: LCP/CLS nigdy nie zmierzone, feed 106 kB HTML, brak
  `fetchpriority`/`sizes` na obrazach.

## Wspólna decyzja marki (jedna dla ekosystemu)

Paleta primary jest współdzielona z App („zgodna z lot-app"). Kierunki i decyzja właściciela
zapadają w **D1 programu App** (`/docker/leaders-of-teams-app/docs/DESIGN-SPRINTY.md`) —
Portal przejmuje wybrane wartości w PD1, nie prowadzi osobnego konkursu palet. Sygnatura
„cieplejsze światło" pochodzi Z PORTALU i zostaje jego najmocniejszym akcentem.

## Sprinty

Każdy sprint = wdrożenie + rytm repo: bramki → staging → prod → zrzuty 390/1440 →
krytyka (`design:design-critique`) → HANDOFF. Pomiar przed/po.

### PD1 — Tokeny, światło i pomiar bazowy — ✅ WYKONANY 20.08 (HANDOFF, baner)

> Pkt 1 i 3 zgodnie z planem (paleta A „cieplone indigo", kontrast 19/19 AA).
> Pkt 2 skorygowany POMIAREM: LCP wszędzie tekstem — `fetchpriority`/`sizes` nie miały celu
> (hero to inline SVG, feed `<img>` bez `srcset`); realną naprawą było zdjęcie `cookies()`
> ze ścieżki landingu (`publicApi` + ISR) → `/` statyczne, CLS 0,058 → 0. Liczby w HANDOFF.
> „Wzmocnienie widoczności temperatury poziomów" (pkt 1, część druga) NIE wykonane — to praca
> na komponentach, przechodzi do PD2/PD3.

1. Przejęcie palety wybranej w D1 App do `globals.css` (primary + semantyka), z zachowaniem
   i WZMOCNIENIEM skali `--level-1…7` — temperatura poziomu ma być widoczna w każdym
   miejscu, gdzie pojawia się poziom Lidera (karta, profil, drabinka, feed).
2. **Pomiar bazowy wydajności mobile** (S20 pkt 1 — wchodzi tu): LCP/CLS/FCP na 390 px
   dla `/`, `/feed`, `/drabinka`, `/rejestracja` — „praca bez liczby przed i po jest
   zgadywaniem". `fetchpriority` na hero, `sizes` na obrazach feedu (S20 pkt 2).
3. Kontrast AA całej nowej palety na ciemnym tle — zmierzony, nie oceniony na oko.

### PD2 — Pierwsza mila jak z produktu, nie z szablonu — ✅ WYKONANY 21.08 (HANDOFF, baner)

> Twardy test (pkt 3) ZDANY: krytyka wskazała nasz /feed bez logo obok generycznego mocka
> i wymieniła wyróżniki (temperatura poziomów + etykieta, separator dni jako widoczna
> chronologia ADR-010, Bricolage, atmosfera tła, pasek 5 slotów). Zrzuty i mock:
> sesja 21.08. Korekta stanu zastanego względem tego dokumentu: `LevelBadge` już PRZED PD2
> czytał `--level-1…7` (nie była to „stara odznaka") — dług polegał na słabej sile rażenia
> (0.78rem, brak nazwy poziomu poza tabelą /drabinki); `.ladder-visual` miał już temperaturę
> wszystkich 7 szczebli na desktopie, złamana była tylko para kolor+etykieta na 390 px
> (`display:none` na nazwach). Część ilustracji istniała od wcześniej (`illustrations.tsx`).

Ekrany, które zobaczy każdy z pierwszych dwudziestu, w kolejności pierwszego kontaktu:
**strona główna → /rejestracja → kreator /start → /feed → /drabinka**.

1. Hierarchia i liczby-bohaterowie Bricolage'em; własne ilustracje SVG stanów pustych
   (feed przed pierwszym wpisem, drabinka na poziomie 0) — stan pusty podpowiada ruch.
2. Mikrointerakcje wg `anthropic-skills:emil-design-eng` — z ograniczeniem ADR-010:
   żadnych confetti/streaków/liczników dopaminowych; ruch służy orientacji, nie retencji.
3. Twardy test: zrzut /feed obok generycznego szablonu „social feed" — rozpoznawalny
   bez logo, albo sprint trwa dalej.

### PD3 — Marketplace i profile (wiarygodność)

1. Karta usługi, profil Lidera, profil Firmy: ślad zaufania (oceny, poziom-światło,
   zrealizowane zlecenia) jako główny element wizualny — to jest wyróżnik produktu
   („status trzeba zapracować"), design ma go OPOWIADAĆ.
2. Warianty kartowe/tabelowe spójne z regułą z e2e (`/drabinka`: karty na 390, tabela
   na desktop) wszędzie, gdzie są listy.
3. Edycja opublikowanej usługi (`PATCH /listings/:id` — martwa trasa znaleziona przez
   strażnika w S18) dostaje UI przy okazji przebudowy karty.

### PD4 — Dostępność, offline i domknięcie

1. Audyt `design:accessibility-review` (WCAG 2.1 AA) na 390 px.
2. Offline przestaje być zaślepką (S20 pkt 3): ostatni feed z cache czytelny offline,
   w nowej skórze.
3. Teksty przeglądem `design:ux-copy`; przemarsz wszystkich ścieżek na żywo kontem
   testowym; aktualizacja docs + MINY.

## Harmonogram ekosystemu (ustalony 2026-08-20)

Programy Portalu (PD1–PD4) i App (D1–D5,
`/docker/leaders-of-teams-app/docs/DESIGN-SPRINTY.md`) idą jednym, naprzemiennym rytmem:

**D1 (App — decyzja o palecie) → PD1 → PD2 (przed zaproszeniami S19) → D2 → D3 (App) →
PD3 → D4 (App) → D5+PD4 (oba, dostępność i domknięcie).**

- PD1 pkt 2–3 (pomiar bazowy LCP/CLS/FCP i kontrast) **nie czekają na paletę** — gdy D1
  stoi na decyzji właściciela, sesja przechodzi tutaj.
- Sprinty funkcjonalne (S19 „Pierwszych dwudziestu", S21) to osobny tor odblokowywany
  decyzjami właściciela — patrz aktualizacja 20.08 w [SPRINTY-S18-S21.md](SPRINTY-S18-S21.md).

## Twarde ograniczenia (niezmienne)

- **ADR-009**: zero zewnętrznych zasobów w runtime (fonty przez next/font zostają),
  ilustracje i ikony rysujemy sami w SVG. Cloudflare/CDN-y nie wracają.
- **ADR-010**: żadnych wzorców uzależniających — feed chronologiczny, bez infinite
  scrolla, ranking tylko do etykiet. Design nie może przemycić dark patterns.
- **Anty-MLM (ADR-004)**: żaden element wizualny nie sugeruje nagród za zapraszanie.
- **Żadnych nowych bibliotek UI** — tożsamość na własnych komponentach i SVG.
- Priorytet S19 (decyzje właściciela: dane demo, lista zaproszeń) jest nadrzędny —
  program designu nie blokuje zaproszeń, tylko je poprzedza tam, gdzie zdąży.

## Miary sukcesu

| Miara                                       | Przed (19.08)       | Cel                                    |
| ------------------------------------------- | ------------------- | -------------------------------------- |
| Paleta primary = stockowy Tailwind          | tak                 | nie (wspólna decyzja z D1 App)         |
| LCP/CLS na 390 px                           | nigdy nie zmierzone | zmierzone w PD1; po PD2 CLS bez zmian, FCP/LCP w bazie poza /drabinką (+~80 ms za pasek poziomu 0 — świadomy koszt; szczegóły w HANDOFF) |
| Stany puste z własną ilustracją SVG         | brak                | ✅ PD2: komplet na pierwszej mili (feed CTA, drabinka błąd+poziom 0)   |
| Test „szablon czy produkt" (/feed bez logo) | nie do odróżnienia  | ✅ PD2: rozpoznawalny (krytyka 21.08)  |
| Offline                                     | zaślepka            | ostatni feed czytelny                  |
