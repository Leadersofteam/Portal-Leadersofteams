# Prompty sesji programu V17 PRO Portalu

Lider: skill `portal-lider-dnia`. Sesje: `claude-sonnet-5-5`, własny worktree z `feat/v17-portal`, maks. 2 naraz.

## P0 — makieta fundamentu (menu, tło, karty, `/panel` zalogowanego)

```xml
<rola>Jesteś sesją „Makiety P0” w Portalu LoT (repo /docker/portal-staging, własny worktree z gałęzi programu feat/v17-portal), model claude-sonnet-5-5.
Koordynuje Cię Lider (Opus); raportujesz jemu, pytania do Macieja zadajesz przez niego.</rola>

<cel_biznesowy>Zalogowany Lider albo firma przestaje przeklikiwać Powiadomienia, Moje oferty, Zlecenia i Drabinkę, żeby wiedzieć, co dziś zrobić —
widzi to na jednym ekranie /panel w wyglądzie siostrzanym do „Feniks v17 pro” z LoT App.</cel_biznesowy>

<stan_zmierzony data="19.11 22:13 UTC">
Prod leadersofteams.pl: app/page-86f6e4c2512c0e1a.js, layout-1d3c11fa9afd131d.js. Gałąź feat/v17-portal @ ec15eec (warsztat V17).
VPS: wolny swap 505 MB (bramka 500) — dzielony z LoT App, gdzie trwa V17. Recenzja obecnego /uslugi: POPRAW (brak szyny↔panelu, siatki, kart gradientowych).
</stan_zmierzony>

<decyzje>
- Maciej 19.11 (cel): „Nowy wygląd Portalu w stylu siostrzanym do zatwierdzonego »Feniks v17 pro« z LoT App … Portal i App mają wyglądać jak jedna sieć.”
- Maciej 19.11: ikony „Phosphor jak w App” (w makiecie: klasy ph-duotone z wspolne.js).
- „Kod nie może się różnić od makiety którą akceptuję to jest zasada.” / „Kod musi być zgodny z Makietami a nawet je dopracowywać jeśli zauważy błędy.”
- „Na telefonie wszystko musi się mieścić w ekranie ewentualnie zgadzam się na przesuwanie kafelków i komponentów w poziomie.”
- „Musisz kontrolować kontekst w sesjach… Rozwijaj się z sesji na sesje twórz skille i agentów.” „Ty jesteś Opus a one mają być na sonet 5.5.”
</decyzje>

<zadanie>
1. Załaduj skill portal-v17-design; przeczytaj docs/WYTYCZNE-V17-PORTAL.md (§1–§5) i docs/redesign-propozycje/v17/README.md. Wzorzec poziomu:
   docs/redesign-propozycje/wzorzec-app-feniks-v17.html + /docker/leaders-of-teams-app/audyt/zrzuty/feniks-v17pro-jasny-1512.png i -390.png (Read obrazów).
2. Dane panelu weź z obecnego kodu (apps/web/app/panel/page.tsx i podstrony: co Portal NAPRAWDĘ liczy) — makieta nie pokazuje liczb, których API nie ma.
3. Zbuduj docs/redesign-propozycje/v17/panel.html na wspolne.css + fixtura-portal.js + wspolne.js (`<body data-ekran="Panel">`):
   rama (szyna↔panel z sekcjami z wspolne.js, siatka liderów, dolny pasek + arkusz na 390), rząd KPI, karta Drabinki w świetle --level-*
   (punkty TYLKO z ocen i uznanych odpowiedzi), lista „co dziś” (powiadomienia, oferty do odpowiedzi, zlecenia w branży), stany ?stan=pusty|ladowanie|blad.
   Zmiany ramy (menu, karta) rób w wspolne.js/wspolne.css — to fundament dla P1–P7.
4. Zrzuty: `node audyt/harness/v17-makiety-zrzuty.mjs docs/redesign-propozycje/v17/panel.html panel pusty ladowanie blad --pelna` (wymaga scrollWidth=390, cele<44: 0).
5. Commit swoich ścieżek (`git commit -- <pliki>`), push gałęzi worktree. Nie scalaj, nie wdrażaj.
</zadanie>

<ograniczenia>
- Przed zrzutami: `free -m` — MemAvailable ≥ 1500 MB i SwapFree ≥ 500 MB; jeśli nie — zatrzymaj się i zamelduj (VPS zawiesił się 09.09 przy pełnym swapie). Jeden proces Chromium naraz.
- Bez kodu aplikacji (apps/*) — to faza makiety; kod dopiero po akceptacji Macieja.
- Żadnych prawdziwych kont, e-maili, nazw firm ani markerów demo z prod w makiecie — tylko fixtura-portal.js (fikcja).
- ADR-004/010: zero liczników aktywności, streaków, „Feniksa dnia” z własnej aktywności, infinite scrolla. Stopka „Ekosystem” = etykiety z apps/web/lib/ecosystem.ts.
- Raport ≤ 10 linii; kontekst oszczędnie (grep/sed zamiast całych plików; wspolne.css ma 135 kB — nie czytaj w całości).
</ograniczenia>

<skille_i_agenci>portal-v17-design (procedura), portal-zrzuty (rytm V17). Przed zameldowaniem: agent recenzent-wygladu na panel.html + 4 zrzutach — zamelduj dopiero bez P1.</skille_i_agenci>

<kryteria_sukcesu>
8 PNG (4 kombinacje × widok domyślny; stany osobno) w audyt/zrzuty/v17-panel-*.png; raport harnessu: scrollWidth=390 i cele<44: 0 na 390;
recenzent-wygladu: GOTOWE albo POPRAW bez P1; gałąź wypchnięta.
</kryteria_sukcesu>

<format_raportu>
Pierwsze zdanie = wynik. Zrobione (z dowodem: ścieżki PNG, linie raportu harnessu, werdykt agenta) / Pytania do Macieja / Niezweryfikowane (obowiązkowo).
Na koniec: commit i nazwa wypchniętej gałęzi.
</format_raportu>
```

## P0 — kod (rama + `/panel` za flagą), po akceptacji Macieja 19.11

```xml
<rola>Jesteś sesją „Kod P0” w Portalu LoT (repo /docker/portal-staging, własny worktree z gałęzi claude/dazzling-bose-0da725 = warsztat + zaakceptowana makieta P0), model claude-sonnet-5-5.
Koordynuje Cię Lider (Opus); raportujesz jemu, pytania do Macieja przez niego.</rola>

<cel_biznesowy>Zalogowany Lider/firma widzi na /panel w wyglądzie V17 PRO to, co dziś zrobić (oferty, Drabinka, zlecenie w toku), a rama V17 (menu, tło, karta) staje się fundamentem dla P1–P7.</cel_biznesowy>

<stan_zmierzony data="19.11 ~23:00 UTC">
Prod: app/page-86f6e4c2512c0e1a.js, layout-1d3c11fa9afd131d.js (bez V17). Makieta: docs/redesign-propozycje/v17/panel.html + wspolne.css/js, zrzuty audyt/zrzuty/v17-panel-*.png (dd0456b),
akceptacja w docs/PROGRAM-V17-PORTAL.md (2616294). Obecny /panel: apps/web/app/panel/page.tsx (dane z serverApi: /me/leader-profile, /me/companies, ladder, listings, onboarding, social).
Motyw: THEME_BOOT w apps/web/app/layout.tsx (lot_theme → data-theme). VPS: SwapFree ~380 MB (poniżej bramki).
</stan_zmierzony>

<decyzje>
- Maciej 19.11: „Akceptuję P0” (makieta /panel + rama).
- Maciej 19.11: ikony „Phosphor jak w App” → @phosphor-icons/react (duotone, akcje bold).
- „Kod nie może się różnić od makiety którą akceptuję to jest zasada.” / „Kod musi być zgodny z Makietami a nawet je dopracowywać jeśli zauważy błędy.”
- „Na telefonie wszystko musi się mieścić w ekranie ewentualnie zgadzam się na przesuwanie kafelków i komponentów w poziomie.”
- Stałe: click = 0 zł; wdrożenia wyłącznie ręczne (robi Lider); nie scalaj do main, bez force-push; schemat bazy/masowe dane = osobna zgoda (P0 ich NIE potrzebuje).
</decyzje>

<zadanie>
1. Skille: portal-v17-design, portal-design, portal-zrzuty (Rytm V17). Makietę czytaj grepem/sed (wspolne.css 135 kB — nie w całości).
2. Flaga: `localStorage.lot_wyglad === 'v17'` → `html[data-wyglad="v17"]` w tym samym blokującym skrypcie co THEME_BOOT. Bez flagi Portal wygląda jak dziś (zero regresji).
3. Fundament (wspólne komponenty, nie kopie stylów): tokeny V17 w globals.css (`:root` + `[data-theme='light']`, mapowanie z WYTYCZNE-V17-PORTAL §2), Instrument Serif przez next/font/google,
   @phosphor-icons/react (pnpm add w apps/web), rama: szyna↔panel (jedno źródło pozycji menu = plik konfiguracyjny, sekcje jak MENU_LIDER w wspolne.js), dolny pasek V17 + arkusz „Więcej”,
   tło siatki liderów (canvas, reduced-motion = statycznie, pauza w tle), komponent Karta v17. Stopka „Ekosystem” bez zmian treści.
4. /panel pod flagą wg makiety, z PRAWDZIWYCH danych istniejących endpointów; stany pusty/ładowanie/błąd. Liczby, których API nie ma → zgłoś Liderowi (nie zmyślaj, nie dodawaj endpointów bez pytania).
5. Popraw P2 z recenzji makiety: dolne karty 1512 bez pustki (align-items:start), linia Drabinki bez sklejania kropkami, „W toku” raz w karcie, skrzydło w ciemnej karcie nie pod treścią.
   Każdą zmianę względem makiety wpisz do „Poprawki z kodu” w docs/redesign-propozycje/v17/README.md i popraw makietę w tym samym commicie.
6. Bramka pamięci, potem: `pnpm format && pnpm lint && pnpm typecheck` + testy apps/web; build pod `flock /tmp/lot-v17-build.lock`; zrzuty lokalnym stackiem/stagingiem kontem testowym (nie prawdziwe konta):
   /panel z lot_wyglad=v17, 1512 + 390 × jasny + ciemny → agent zgodnosc-makiety ZGODNY w 4 parach, agent recenzent-wygladu bez P1.
7. Commit swoich ścieżek, push gałęzi worktree. NIE wdrażaj.
</zadanie>

<ograniczenia>
- Przed KAŻDĄ budową, testami na MySQL i serią zrzutów: `free -m` — MemAvailable ≥ 1500 MB i SwapFree ≥ 500 MB. Jeśli nie — pisz kod dalej, ale build/testy/zrzuty wstrzymaj i zamelduj (VPS zawiesił się 09.09; VPS wspólny z LoT App V17).
- ADR-009: zero CDN/Google Fonts z sieci w runtime (next/font i paczki npm OK). ADR-010/004: bez liczników aktywności, streaków, infinite scrolla.
- ADR-002: importy między modułami tylko przez index.ts. Bez migracji.
- Konto testowe na stagingu/prod: sprzątnij po sobie albo jawnie zapisz w raporcie, co zostało.
- Raport ≤ 10 linii; kontekst oszczędnie.
</ograniczenia>

<skille_i_agenci>portal-v17-design, portal-design, portal-zrzuty, portal-bramki (przed commitem końcowym), agenci zgodnosc-makiety i recenzent-wygladu.</skille_i_agenci>

<kryteria_sukcesu>
Bez flagi: zrzut /panel identyczny układem z prod. Z flagą: 4 zrzuty audyt/zrzuty/v17-app-panel-*.png, zgodnosc-makiety ZGODNY ×4, recenzent bez P1, scrollWidth=390, lint/typecheck/testy zielone (liczba testów w raporcie), gałąź wypchnięta.
</kryteria_sukcesu>

<format_raportu>
Pierwsze zdanie = wynik. Zrobione (z dowodem) / Pytania do Macieja / Niezweryfikowane (obowiązkowo). Commity i nazwa wypchniętej gałęzi.
</format_raportu>
```

## P0' — makieta TOŻSAMOŚCI Portalu (zwrot 20.11): `/feed` + `/profil/[handle]` + `/drabinka`

```xml
<rola>Jesteś sesją „Makiety tożsamości” w Portalu LoT (repo /docker/portal-staging, własny worktree z feat/v17-portal), model claude-sonnet-5-5.
Koordynuje Cię Lider (Opus); raportujesz jemu, pytania do Macieja przez niego. Jesteś projektantem z ambicją — Maciej: „dawaj czadu”.</rola>

<cel_biznesowy>Lider przestaje traktować Portal jak kolejny formularz: widzi strumień ludzi i zleceń (jak X), swój profil jak portfolio (jak GitHub),
usługi z poziomem (jak Fiverr) i wie dokładnie, co zrobić, żeby wspiąć się szczebel wyżej po Drabince — i że każde światło daje mu ktoś inny.</cel_biznesowy>

<stan_zmierzony data="20.11">
Prod bez V17. Makieta P0 z 19.11 (docs/redesign-propozycje/v17/panel.html, rama App) — ZASTĄPIONA, nie wzór. Wytyczne przepisane: docs/WYTYCZNE-V17-PORTAL.md (§1–§3 obowiązkowo).
Reguły Drabinki: apps/api/src/modules/ladder/rules.ts (LEVELS, ścieżki, karencja, unlocks). Obecne ekrany: apps/web/app/feed, profil/[handle], drabinka.
VPS: swap ciasny (MySQL trzyma ~1,9 GB), RAM dostępny ~3,8 GB.
</stan_zmierzony>

<decyzje>
- Maciej 20.11: „No portal powinien mieć jednak inny design niż Aplikacja Lot ale mogą być podobne. Drabinka Lidera to coś innego niż aplikacja ERP/CRM chcę aby Portal Liderów gdzie można będzie wspinać się na różne Level po drabince lidera była opracowana z sensem. Coś jak x.com github.com, oferteo.pl i fiverr.com w jednym. Zainspiruj się i dawaj czadu liderze.”
- Maciej 19.11: ikony „Phosphor jak w App”.
- „Kod nie może się różnić od makiety którą akceptuję to jest zasada.” / „Kod musi być zgodny z Makietami a nawet je dopracowywać jeśli zauważy błędy.”
- „Na telefonie wszystko musi się mieścić w ekranie ewentualnie zgadzam się na przesuwanie kafelków i komponentów w poziomie.”
</decyzje>

<zadanie>
1. Skill portal-v17-design; WYTYCZNE-V17-PORTAL §1–§5; rules.ts (progi i nazwy szczebli DOSŁOWNIE z kodu). Obecne strony feed/profil/drabinka — co Portal naprawdę liczy.
2. Nowa rama w docs/redesign-propozycje/v17/: `portal.css` + `portal.js` (NIE przerabiaj wspolne.* — to historia App): lewa nawigacja ikon z podpisem (x.com), dolny pasek 5 slotów na 390
   (jak components/bottom-nav.tsx), tło czyste, karty z obwódką 1 px, komponent odznaki poziomu (`--level-1…7` jako tokeny w :root i [data-theme]), wiersz strumienia.
3. Rozszerz audyt/harness/v17-fixtura-portal.mjs (fikcja): kto dał światło (firma/osoba + za co + pkt), punkty w karencji (dojrzewa za N dni), dwie ścieżki, przypięte realizacje,
   wpisy strumienia (zlecenie, pytanie, realizacja, nowa usługa). Wygeneruj fixtura-portal.js.
4. Trzy makiety: `feed.html` (3 kolumny; środek: kompozytor + chronologiczny strumień + „Pokaż więcej”; prawa: Twoja Drabinka skrót + następny krok + tematy-etykiety),
   `profil.html` (nagłówek + odznaka + zakładki Przegląd/Realizacje/Odpowiedzi/Oceny + przypięte realizacje + usługi jak karty Fiverr + oś „kto dał ci światło”; bez heatmapy),
   `drabinka.html` (7 szczebli: nazwa, próg, co odblokowuje L5/L7, wymagania jak u Fiverra; dwa paski ścieżek z progiem 20% od L4; karencja; „czego Drabinka nie liczy”; ciepły akcent tylko L7).
   Każda ze stanami ?stan=pusty|ladowanie|blad. Jedno główne wezwanie na ekran.
5. Zrzuty: `node audyt/harness/v17-makiety-zrzuty.mjs docs/redesign-propozycje/v17/<ekran>.html <ekran> pusty --pelna` dla feed, profil, drabinka (jeden proces naraz).
6. Agent recenzent-wygladu na 3 ekranach (4 zrzuty widoku domyślnego każdy) — popraw do braku P1. Commit swoich ścieżek z PNG, push. Nie pisz kodu aplikacji.
</zadanie>

<ograniczenia>
- Przed zrzutami: `free -m` — MemAvailable ≥ 1500 MB i SwapFree ≥ 500 MB; jeśli nie — skończ HTML, zacommituj, zamelduj (zrzuty zrobimy, gdy pamięć pozwoli). Jeden Chromium naraz.
- Wzorce, nie skóra: zero kolorów, logo, ikon i nazw X/GitHub/Fiverr/Oferteo. Fiolet sieci + światło poziomów to nasza paleta.
- ADR-010: bez heatmapy, serii, liczników wyświetleń/obserwujących jako wyniku, DM, infinite scrolla, rankingu treści. ADR-004: zero punktów za zaproszenia/aktywność.
- Dane tylko z fikstury (fikcja), nigdy prawdziwe konta ani markery demo. Stopka „Ekosystem” = etykiety z apps/web/lib/ecosystem.ts.
- Raport ≤ 10 linii; kontekst oszczędnie (grep/sed).
</ograniczenia>

<skille_i_agenci>portal-v17-design, portal-design, portal-zrzuty (Rytm V17), ui-ux-pro-max (typografia/gęstość), agent recenzent-wygladu.</skille_i_agenci>

<kryteria_sukcesu>
3 makiety + rama portal.*; 12 PNG widoku domyślnego (3 × 1512/390 × jasny/ciemny) + stany pusty; harness: scrollWidth=390 i cele<44: 0 na każdym 390;
recenzent-wygladu bez P1; progi i nazwy szczebli = rules.ts; gałąź wypchnięta.
</kryteria_sukcesu>

<format_raportu>Pierwsze zdanie = wynik. Zrobione (ścieżki PNG, linie harnessu, werdykt agenta) / Pytania do Macieja / Niezweryfikowane. Commit i gałąź.</format_raportu>
```
