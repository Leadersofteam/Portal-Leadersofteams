# Roadmapa S8–S12 — „Kieszonkowa Drabina": mobile-first + wyjątkowy design

**Data:** 2026-08-12 · **Autor:** Fable 5 (sesja S7/go-live)
**Status (2026-08-13, Opus 5):** ✅ **S8, S9, S10 i S11 ZREALIZOWANE i WDROŻONE NA PRODUKCJĘ**
(szczegóły i commity w [HANDOFF-OPUS.md](HANDOFF-OPUS.md)). Otwarty pozostaje **S12**.
Świadomie NIE zrobione z S11: publiczny profil Firmy (`/firmy/[id]`) i digest e-mail —
oba mają sens dopiero przy realnym ruchu i realnych Firmach.
Świadomie odłożone z S10: seeding rynku (R-06) — to decyzja i działanie właściciela.
**Kontekst:** Portal jest publicznie żywy (leadersofteams.pl), rynek pusty (0 kont realnych),
moduły S7 wdrożone (files/listings/social), design v2 „drabina jako architektura" objął
na razie landing. Ograniczenia niezmienne: 0 zł za klik (ADR-009), anty-MLM (ADR-004),
anty-engagement (ADR-010: chronologia, bez infinite scroll, bez DM), wdrożenia ręczne.

---

## Dwie zasady przekrojowe (obowiązują w KAŻDYM sprincie)

### 1. Mobile-first — projektujemy od 390 px W GÓRĘ

- Każdy nowy widok najpierw makietowany/oceniany na 390 px, desktop jest rozszerzeniem.
- Definition of done każdego PR-a: zrzut 390 px (headless Chromium — harness z S7)
  obok zrzutu desktop; cele dotyku ≥ 44 px; formularze z przyklejonym CTA na dole.
- Zero tabel na mobile — tabela zawsze ma wariant kartowy (`.table-wrap` to fallback,
  nie rozwiązanie).

### 2. Język wizualny „światło, na które się wspinasz" — nic generycznego

Ustalony w S7 i ROZWIJANY, nie wymieniany:

- **Drabina jako architektura** (climb-rail, LadderArt, glify szczebli) — każdy nowy
  widok musi użyć przynajmniej jednego elementu tego języka.
- **Bursztyn tylko zdobyty** — kolor poziomu 7 nigdy w przyciskach/marketingu, tylko
  przy realnym statusie.
- **Ziarno zamiast gładzi, widmowe numery zamiast sztancy, Bricolage w nagłówkach.**
- Zakaz: stockowe ilustracje/packi ikon, komponenty wyglądające jak szablon Tailwind,
  paleta bez powodu. Ikony i ilustracje rysujemy sami w SVG (0 zł).

---

## S8 — Kieszonkowa nawigacja + PWA (fundament mobile)

Cel: Portal ma być apką w kieszeni Lidera, nie stroną „też działającą na telefonie".

1. **Dolny pasek nawigacji (mobile ≤768 px)** — 5 miejsc pod kciuk:
   Feed · Usługi · **[+]** (centralny przycisk twórczy: usługa/zlecenie/pytanie —
   arkusz wyboru) · Powiadomienia (z badge) · Panel. Górny header na mobile chudnie
   do logo + wyszukiwania. Aktywna pozycja podświetlona światłem poziomu użytkownika.
2. **PWA**: `manifest.webmanifest` (ikony z logo-drabinki 192/512, maskable),
   minimalny service worker (cache statyków, offline-fallback strona „Jesteś offline —
   drabina poczeka"), `theme-color` #0a0b12. Instalowalna z Chrome/Safari.
   ⚠️ Pułapka z App (pamięć): w PWA `window.open`/`target=_blank` nie pobiera plików.
3. **Tabele → karty na mobile**: `/drabinka` (progi), `/panel/punkty` (ledger),
   `/panel/oferty`, oferty na zleceniu.
4. **Formularze mobile**: kreator usługi i zlecenia — kroki zamiast ściany pól
   (akordeon sekcji), sticky „Opublikuj" na dole, `inputmode`/`autocomplete` wszędzie.
5. Audyt celów dotyku + odstępów na 6 kluczowych widokach.

Weryfikacja: zrzuty 390/768/1440 wszystkich zmienionych widoków; instalacja PWA
na realnym telefonie właściciela; e2e critical-path.

## S9 — Wnętrze appki w języku marki (panel = baza wspinacza)

Cel: zalogowany użytkownik ma czuć tę samą markę co na landingu — dziś wnętrze jest
poprawne, ale bez duszy.

1. **Panel → „Baza wspinacza"**: hero panelu z pionową szyną postępu do następnego
   poziomu (ile punktów brakuje, z jakich ścieżek — wizualnie na szczeblach, nie w
   tabelce), karty modułów w języku widmowych numerów.
2. **Checklist „Zacznij tutaj"** dla świeżych kont (stan pusty panelu): 4 kroki
   (uzupełnij profil → dodaj zdjęcie → opublikuj usługę / pierwsze zlecenie → odpowiedz
   w Q&A). Krok odhaczony gaśnie; ZERO punktów za samą checklistę (anty-MLM) — to mapa,
   nie nagroda.
3. **Profil Lidera jako credential**: nagłówek profilu przechodzi na pełny „dowód
   statusu" — duże światło poziomu, pasek obu ścieżek (zlecenia/mentoring), przycisk
   **„Udostępnij swój poziom"** (Web Share API na mobile → istniejące karty OG; desktop:
   kopiuj link). To nasz viral-loop za 0 zł.
4. **Rodzina ilustracji SVG empty states** (własnych): pusta drabina, wolny szczebel,
   latarnia szczytu — 4–5 scen używanych spójnie w pustych stanach zamiast samego tekstu.
5. **Mikrointerakcje** (CSS-only, szanując `prefers-reduced-motion`): moment awansu
   (jednorazowa poświata odznaki po `level_achieved` w powiadomieniach), rung-fill na
   hover głównych CTA, wejścia sekcji panelu.

## S10 — Pierwsza mila: onboarding, który prowadzi za rękę

Cel: pusty rynek wybacza mało — pierwsze 20 kont musi przejść od rejestracji do
pierwszej wartości bez jednego momentu „co teraz?".

1. **Kreator po rejestracji (3 kroki, mobile-first)**: Kim jesteś? (Lider / Firma /
   oba) → minimalny profil (branża+nagłówek lub nazwa firmy) → pierwsza akcja
   (opublikuj usługę / dodaj zlecenie / rozejrzyj się w grupach). Pomijalne, wraca
   z panelu.
2. **Puste stany akcyjne w całej appce** — przegląd wszystkich `EmptyState` pod kątem:
   czy mówią co zrobić TERAZ i czy CTA prowadzi w jedno dotknięcie do akcji.
3. **Strona „Dlaczego tu jestem"** dla zaproszonych z linku (`/start`): 30-sekundowe
   wyjaśnienie Trzech Płaszczyzn prostym językiem + wejście w kreator.
4. **Rytuał pierwszego punktu**: powiadomienie + ekran gratulacyjny przy PIERWSZYM
   wpisie w ledgerze (jednorazowy, bez streaków — ADR-010).
5. Seeding rynku (R-06, decyzja właściciela w trakcie sprintu): zapraszamy founding
   Liderów ręcznie; narzędzie CLI do założenia konta z zaproszeniem NIE daje punktów.

## S11 — Zaufanie i głębia marketplace

Cel: Firma, która trafia z Google na usługę/Lidera, ma w 10 sekund powód, żeby zaufać.

1. **Publiczny profil Firmy** (`/firmy/[id]`): historia zleceń, oceny wystawione
   Liderom przez tę firmę i otrzymane od Liderów (dwustronność = uczciwość), staż.
2. **Odznaka „NIP zweryfikowany"**: walidacja sumy kontrolnej NIP offline (algorytm
   wagowy — 0 zł, bez API) + wyróżnienie w katalogu; pełna weryfikacja rejestrowa
   dopiero, gdy pojawi się darmowe źródło (Biała Lista MF ma darmowe API — zbadać
   limity zanim obiecamy).
3. **Porównywarka pakietów** na stronie usługi (BASIC/STANDARD/PREMIUM obok siebie,
   na mobile jako przełączane karty) + „poproś o wycenę niestandardową" (wariant
   zapytania).
4. **Szukanie, które nie wstydzi**: jedno pole globalne w headerze (usługi+Liderzy+
   zlecenia, wyniki w zakładkach), poprawki FULLTEXT (prefiksy), chipy popularnych
   tagów w katalogu.
5. **Digest powiadomień e-mail** — kod gotowy za flagą; włączy się sam, gdy właściciel
   poda klucz Brevo (bez rebuilda).

## S12 — Twardość produkcji i tempo

Cel: zanim przyjdzie ruch — wiedzieć, ile uniesiemy, i widzieć, co się dzieje.

1. **k6 load test na prod** (poza szczytem, ostrożnie — współdzielony VPS z App;
   bloker R-04 z checklisty) + zapis wyników w docs.
2. **Worker heartbeat** (SET portal:worker:heartbeat EX 60 → healthcheck compose) —
   dług z GO-LIVE-CHECKLIST §1.
3. **Performance mobile**: budżet Lighthouse (LCP < 2,5 s na 4G), subset fontów
   (latin-ext only), `next/image`? — NIE (własne API plików); za to `fetchpriority`
   na hero, lazy na galeriach.
4. **Analityka za 0 zł i bez cookies**: dzienny licznik odwiedzin/ścieżek w Redis
   (agregaty, zero danych osobowych — zgodne z naszą polityką prywatności) + prosty
   podgląd w panelu moderatora. Żadnego zewnętrznego skryptu.
5. Sprzątanie: odświeżenie stagingu, decyzja o basic-auth stagingu, Bull Board (opc.).

---

## Kolejność i logika

S8 przed S9 (nawigacja to szkielet, do którego S9 wiesza mięso) → S10 przed
zaproszeniem founding Liderów (nie palimy pierwszego wrażenia) → S11, gdy są
pierwsi userzy do uwiarygodnienia → S12 przed jakąkolwiek promocją.

Każdy sprint kończy się: testy (vitest + e2e) → deploy staging → przegląd zrzutów
390/1440 → deploy prod (`portal-prod` + `run --rm migrate`) → wpis w HANDOFF.
