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
