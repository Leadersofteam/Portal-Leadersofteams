---
name: portal-v17-design
description: Wygląd „V17 PRO” Portalu LoT (leadersofteams.pl, od 19.11) — od 20.11 kierunek WŁASNY Portalu (podobny do LOT App, ale nie ten sam): strumień jak x.com, profil jak github.com, usługi i poziomy jak fiverr.com, zlecenia z ofertami jak oferteo.pl, Drabinka Lidera z sensem (7 szczebli, dwie ścieżki, co odblokowuje), Phosphor duotone, światło poziomów; flaga wyglądu, procedura makieta→akceptacja→kod, lista kontrolna ekranu. Użyj przy KAŻDEJ zmianie wyglądu Portalu w programie V17, przy słowach „V17”, „V17 PRO”, „nowy wygląd Portalu”, „redesign”, „makieta”, „paczka P0…P7”, oraz przed uznaniem ekranu za dopracowany. Bramka jakości ogólna (tokeny, a11y, anty-generyczność) zostaje w portal-design.
---

# V17 PRO Portalu — kierunek własny od 20.11.2026 (program od 19.11)

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

## Kierunek własny Portalu (od 20.11 — ZASTĘPUJE ramę App z 19.11)

Maciej 20.11: „Portal powinien mieć jednak inny design niż Aplikacja Lot ale mogą być podobne… Coś jak x.com github.com, oferteo.pl
i fiverr.com w jednym.” Pełne zasady: `docs/WYTYCZNE-V17-PORTAL.md` §1–§3. Skrót:

- **x.com → strumień:** 3 kolumny (lewa nawigacja ikon z podpisem · środek 600 px · prawa: Drabinka + tematy-etykiety), wpis = wiersz z awatarem.
- **github.com → profil:** nagłówek + zakładki Przegląd · Realizacje · Odpowiedzi · Oceny, przypięte realizacje, oś „kto dał ci światło”. Bez heatmapy.
- **fiverr.com → usługi i poziomy:** karta usługi z odznaką poziomu, oceną i ceną „od”; poziom z jawną listą wymagań.
- **oferteo.pl → zlecenia:** kreator „opisz potrzebę → dostań oferty” w 3 krokach, licznik ofert, porównanie ofert obok siebie.
- **Drabinka z sensem:** 7 szczebli i progi z `apps/api/src/modules/ladder/rules.ts`, dwie ścieżki (rynek/społeczność) z progiem 20% od L4,
  karencja 7 dni, L5 → LOT App, L7 → zespół, każde światło z awatarem osoby, która je dała.
- **Tożsamość:** NIE rama App (bez szyny↔panel, rzędów KPI, siatki liderów, gradientowych ramek). Tło od 26.11: jaśniejsze z przezroczystą siecią Liderów
  (`components/v17/tlo-siec.tsx`, tokeny w `styles/v17-braki.css`), karty z obwódką 1 px,
  gęste wiersze. Wspólne z siecią: fiolet, „ciepły = zapracowane” (`--level-7` tylko przy L7), Bricolage + Inter, Phosphor duotone,
  stopka Ekosystem. Scena 3D Drabinki: `/` i `/drabinka`.
- **Odznaka poziomu** = jeden komponent wszędzie: numer w kółku `--level-n` + nazwa szczebla.
- **Telefon 390:** dolny pasek (`components/bottom-nav.tsx`), w poziomie tylko `data-przesuw` (zakładki, filtry, przypięte), scrollWidth = 390.
- **Motyw:** domyślnie ciemny, jasny przez `[data-theme='light']`; zrzuty w obu, Maciej dostaje jasny pierwszy.

## Granice, których V17 nie przesuwa (złamanie = zmiana produktu, nie wyglądu)

- **ADR-004:** żaden element nie sugeruje statusu/punktów za aktywność, zaproszenia, logowanie. Drabinka świeci tylko z ocen i uznanych odpowiedzi.
- **ADR-010:** feed chronologiczny, bez infinite scrolla („Pokaż więcej”), bez liczników wyświetleń, streaków, DM. „Feniks dnia” z App
  **nie przechodzi** do Portalu jako licznik aktywności — jeśli coś rośnie, to Drabinka z cudzych ocen („twój punkt nigdy nie świeci sam”).
- **ADR-009:** w kodzie zero CDN i Google Fonts z sieci (makiety HTML mogą je ładować — to pliki lokalne, nie produkcja).
- **Stopka „Ekosystem”:** `apps/web/lib/ecosystem.ts` — etykiety i kolejność wspólne dla czterech repo; V17 zmienia wygląd, nie treść.

## Pułapki kodu V17 (26.11)

- **Wszystkie style są pod `.v17`.** Okno, arkusz, menu renderowane obok tego diva wygląda jak goły HTML, a test „toBeVisible” przechodzi.
  Renderuj wewnątrz (`Rama`), w e2e sprawdź styl (`toHaveCSS('position','fixed')`), obejrzyj zrzut po kliknięciu.
- `.v17` ma `isolation: isolate` — bez tego sieć tła (`z-index: -1`) znika pod tłem.
- Okna modalne: `lib/use-dialog.ts` (fokus, Tab, Esc, powrót fokusu — element otwierający musi zostać w drzewie).
- Docenienie i zakładka: logika w `lib/use-reakcje.ts`, w V17 bez licznika (ADR-010).
- Strumień czyta źródła po kursorze (`okno()` w `lib/v17-data.ts`); nowe źródło musi trafić do tego mechanizmu, inaczej gubi chronologię.
- Testy starego wyglądu idą przez `?wyglad=off` albo ciasteczko `lot_wyglad=off` (także `/offline`).

## Lista kontrolna ekranu (przed pokazaniem Maciejowi)

1. Zdanie „X przestaje robić Y dzięki temu ekranowi” istnieje.
2. 4 zrzuty, scrollWidth = 390, cele < 44: 0, stany pusty/ładowanie/błąd w makiecie (`?stan=`).
3. Jedno główne wezwanie do działania; nagłówki zdaniem, nie WIELKIMI.
4. `recenzent-wygladu` bez P1.
5. Dane z fikstury wyglądają jak Portal (zlecenia, oferty, Liderzy, oceny), nie jak CRM z App.
