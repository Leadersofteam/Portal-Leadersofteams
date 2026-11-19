---
name: portal-v17-design
description: Wygląd „V17 PRO” Portalu LoT (leadersofteams.pl, od 19.11) — siostra zatwierdzonego „Feniks v17 pro” z LoT App z akcentem marketplace'u B2B i społeczności Liderów: szyna↔panel menu z sekcjami Portalu, ikony Phosphor duotone, tło „siatka liderów”, karty z obramowaniem gradientowym, gęste dane, światło poziomów Drabinki; flaga wyglądu, procedura makieta→akceptacja→kod, lista kontrolna ekranu. Użyj przy KAŻDEJ zmianie wyglądu Portalu w programie V17, przy słowach „V17”, „V17 PRO”, „nowy wygląd Portalu”, „redesign”, „makieta”, „paczka P0…P7”, oraz przed uznaniem ekranu za dopracowany. Bramka jakości ogólna (tokeny, a11y, anty-generyczność) zostaje w portal-design.
---

# V17 PRO Portalu — OBOWIĄZUJE od 19.11.2026

Cel Macieja (19.11): nowy wygląd Portalu „w stylu siostrzanym do zatwierdzonego Feniks v17 pro” — ta sama rodzina, akcent
i treść marketplace'u B2B i społeczności Liderów. **Portal i App mają wyglądać jak jedna sieć.**
Program i tabela akceptacji: `docs/PROGRAM-V17-PORTAL.md`. Wytyczne (5 zasad, tokeny, wzorce, antywzorce, DoD): `docs/WYTYCZNE-V17-PORTAL.md`.
Wzorzec rodziny (App): `/docker/leaders-of-teams-app/docs/redesign-propozycje/feniks-v17.html` + `audyt/zrzuty/feniks-v17pro-*.png` tamże.
Ogólna bramka (tokeny, 390 px, a11y, anty-generyczność, ADR-009/010): skill `portal-design` — obowiązuje dalej.

## Procedura ekranu (kolejność nienegocjowalna)

1. **Makieta** w `docs/redesign-propozycje/v17/<ekran>.html` na wspólnych `wspolne.css`/`wspolne.js` (menu, siatka, karty) z danymi
   z fikstury `audyt/harness/v17-fixtura-portal.mjs` (fikcyjne, nigdy prawdziwe konta ani markery demo z prod).
2. **Zrzuty** `node audyt/harness/v17-makiety-zrzuty.mjs <plik.html> <nazwa> [stany…]` → 1512 + 390 × jasny + ciemny; raport scrollWidth = 390 i cele < 44 px.
3. **Agent `recenzent-wygladu`** — bez P1, zanim cokolwiek zobaczy Maciej.
4. **Akceptacja Macieja** na zrzutach (Lider: SendUserFile 1512 jasny + 390, jedno pytanie) → wiersz w tabeli PROGRAM-V17-PORTAL (cytat + data).
   Bez wiersza ekran nie idzie do kodu.
5. **Kod** pod flagą `html[data-wyglad="v17"]` (obok `data-theme`; ustawia blokujący skrypt w `app/layout.tsx` z `localStorage.lot_wyglad`,
   jak `lot_theme`) → zrzuty Portalu 4 kombinacje → agent `zgodnosc-makiety` ZGODNY w 4 parach → `portal-bramki` → `portal-wdrozenie`.

Zasady Macieja (cytuj dosłownie w briefach): „Kod nie może się różnić od makiety którą akceptuję to jest zasada.” /
„Kod musi być zgodny z Makietami a nawet je dopracowywać jeśli zauważy błędy.” / „Na telefonie wszystko musi się mieścić w ekranie
ewentualnie zgadzam się na przesuwanie kafelków i komponentów w poziomie.”

## Zasady V17 w Portalu (z App + to, co Portal ma inaczej)

- **Menu:** szyna 76 px ↔ panel 256 px (przycisk + skrót `[` + zapamiętany stan), sekcje Portalu: _Rynek_ (Zlecenia, Usługi, Firmy),
  _Liderzy_ (Liderzy, Drabinka, Droga Lidera), _Społeczność_ (Feed, Pytania, Grupy, Tematy), _Moje_ (Panel, Oferty, Zapisane, Powiadomienia, Konto).
  Dymek etykiety w szynie. Telefon: dolny pasek (istniejący `components/bottom-nav.tsx` — pozycje bez zmian sensu) + arkusz modułów w sekcjach.
  Jedno źródło listy pozycji (plik konfiguracyjny), nie kopie w szynie, panelu i arkuszu.
- **Ikony:** Phosphor **duotone** (`@phosphor-icons/react`) w kafelku z gradientem i obwódką; akcje `bold`.
  **Wyjątek od reguły „ikony rysujemy sami”** — decyzja Macieja 19.11: „Phosphor jak w App”. Paczka npm, zero wywołań sieci w runtime (ADR-009 nietknięty).
  Ilustracje (stany puste, onboarding, Drabinka) — nadal własne SVG.
- **Tło:** „siatka liderów” (kratka CSS 48/36 px, alfa ≈ .06–.07 + liderzy na węzłach w canvas + impuls po liniach; maska rozjaśnia środek)
  na stronach zalogowanego i katalogach (P0–P6). **Scena 3D Drabinki zostaje** na stronach publicznych/landingu (P7, skill `portal-scena-3d`) —
  nigdy oba naraz na jednym ekranie. Reduced-motion = statycznie; pauza w tle (`visibilitychange`).
- **Akcent Portalu:** fiolet rodziny (`--primary-*`, `--violet-500`) + **światło poziomów Drabinki `--level-1…7`** jako sygnatura Portalu
  (cieplejsze światło — DESIGN-SPRINTY). Żar/ember z App = w Portalu „na żywo” tylko dla zlecenia w toku.
- **Karty:** obramowanie gradientowe (padding-box/border-box), reflektor pod kursorem, nagłówek = kafelek ikony + tytuł + akcja-pigułka + przerywana linia.
  Ciemna karta „na żywo” najwyżej jedna na ekran.
- **Treść:** zero zdań-opisów nad sekcjami; liczby z API (oceny, zrealizowane zlecenia, uznane odpowiedzi, poziom Drabinki).
  Ślad zaufania na karcie Lidera/firmy zawsze z danych, nigdy ozdobnik.
- **Typografia:** Bricolage (już w `next/font`), Inter (już), **Instrument Serif dochodzi przez `next/font/google`** (pobierany przy budowie,
  nie w runtime) — kursywą wyłącznie jedno słowo-akcent w nagłówku ekranu.
- **Telefon 390 pierwszy:** przyklejony nagłówek, KPI/kafle jako karuzela `data-przesuw` (scroll-snap), tabele → listy dwuwierszowe,
  safe-area, cele ≥ 44 px, scrollWidth = 390.
- **Motyw:** Portal ma DOMYŚLNIE ciemny, jasny przez `[data-theme='light']` (`lot_theme=light`). Makiety i zrzuty: oba, jasny pokazujemy Maciejowi pierwszy.

## Granice, których V17 nie przesuwa (złamanie = zmiana produktu, nie wyglądu)

- **ADR-004:** żaden element nie sugeruje statusu/punktów za aktywność, zaproszenia, logowanie. Drabinka świeci tylko z ocen i uznanych odpowiedzi.
- **ADR-010:** feed chronologiczny, bez infinite scrolla („Pokaż więcej”), bez liczników wyświetleń, streaków, DM. „Feniks dnia” z App
  **nie przechodzi** do Portalu jako licznik aktywności — jeśli coś rośnie, to Drabinka z cudzych ocen („twój punkt nigdy nie świeci sam”).
- **ADR-009:** w kodzie zero CDN i Google Fonts z sieci (makiety HTML mogą je ładować — to pliki lokalne, nie produkcja).
- **Stopka „Ekosystem”:** `apps/web/lib/ecosystem.ts` — etykiety i kolejność wspólne dla czterech repo; V17 zmienia wygląd, nie treść.

## Lista kontrolna ekranu (przed pokazaniem Maciejowi)

1. Zdanie „X przestaje robić Y dzięki temu ekranowi” istnieje.
2. 4 zrzuty, scrollWidth = 390, cele < 44: 0, stany pusty/ładowanie/błąd w makiecie (`?stan=`).
3. Jedno główne wezwanie do działania; nagłówki zdaniem, nie WIELKIMI.
4. `recenzent-wygladu` bez P1.
5. Dane z fikstury wyglądają jak Portal (zlecenia, oferty, Liderzy, oceny), nie jak CRM z App.
