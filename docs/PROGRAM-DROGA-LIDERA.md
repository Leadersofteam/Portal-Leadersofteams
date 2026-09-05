# Program „Droga Lidera” — rozwój Portalu pod ruch, transakcje i wygląd (analiza 04.09.2026)

**Rola:** genialny Lider / full-stack + PM · **Repo:** `/docker/portal-staging` (prod = `leadersofteams.pl`)
**Data:** 2026-09-04 · **Status:** ZATWIERDZONY przez właściciela 04.09 (D1–D5: tak). Realizacja: PL0+PL1+PL2 wdrożone 05.09 (HANDOFF), PL3–PL5 otwarte

---

## 1. Kontekst — co zmierzyłem, zanim cokolwiek zaproponowałem

Portal ma **więcej funkcji niż ludzi**. Fundament techniczny jest lepszy niż wygląda z zewnątrz,
ale trzy rzeczy blokują ruch i pierwszą realną transakcję:

| Sygnał (prod, 04.09)                                                  | Pomiar                                                                                                                    | Wniosek                                                                                                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Odsłony/dobę (Redis `portal:analytics:v1:views:*`, 28.08–04.09)       | 5–24 dziennie, w tym własne sesje wyprawy; 29.08 = 10 odsłon, 31.08 = 7                                                   | **Zero ruchu organicznego.** Bottleneck = dystrybucja, nie funkcje                                                                            |
| Realni ludzie                                                         | Macix + 5 person wyprawy (`wyprawa/KONTA.md`), reszta demo/anonimizowane                                                  | Pierwsza realna oferta (Konrad → „Marketing" HydroSpark) wisi **bez odpowiedzi**                                                              |
| Katalog publiczny (API `/leaders`, `/orders`, `/listings`, `/groups`) | 9 Liderów, 10 zleceń, 47 usług, 20 grup, 10 branż (mają `slug`)                                                           | Jest czym wypełnić strony hubowe — nie pusty serwis                                                                                           |
| TTFB publicznych stron                                                | 60–170 ms, HTML 37–124 KB                                                                                                 | Szybkość nie jest problemem; problemem jest `cache-control: private, no-store` na WSZYSTKICH listach (tylko `/` używa `publicApi`+ISR)        |
| Maile wychodzące                                                      | **tylko digest** (`notifications/service.ts:397`); nowa oferta/wiadomość = powiadomienie in-app                           | Firma, która nie loguje się codziennie, **nigdy nie dowie się o ofercie** — to prawdopodobnie dlaczego Macix nie odpowiedział                 |
| CTA landingu „Dodaj zlecenie jako Firma"                              | `/zlecenia/nowe` → `redirect('/logowanie')` dla gościa                                                                    | Oferteo/Fixly dają najpierw formularz potrzeby, potem konto. My dajemy ścianę                                                                 |
| Kanał rozmowy przy ofercie na zlecenie                                | brak (tylko przyjmij/zignoruj); przy usługach istnieje (`Inquiry`→`InquiryMessage`)                                       | Asymetria uderza w pierwszą transakcję (zapisane w HANDOFF jako decyzja właściciela)                                                          |
| Analityka                                                             | tylko odsłony ścieżek; zero zdarzeń lejka (wejście → rejestracja → weryfikacja → profil → pierwsza akcja)                 | Nie da się powiedzieć, gdzie ludzie odpadają                                                                                                  |
| SEO                                                                   | sitemap (55 URL, limit 50/typ), JSON-LD (Organization/WebSite/Person/JobPosting/QAPage), OG per encja, robots OK          | Fundament jest; brakuje **stron hubowych per branża** i treści, na które ktoś może trafić z Google                                            |
| Design                                                                | paleta „cieplone indigo", Bricolage, motyw jasny/ciemny, sygnatura „im wyżej, tym cieplej" (zrzuty `wyprawa/zrzuty/p2-*`) | Solidne, ale landing to **tekst + jedna drabina**. „Droga od zera do Lidera" nie istnieje jako strona — istnieje jako regulamin (`/drabinka`) |

**Teza:** Portal nie potrzebuje kolejnej funkcji społecznej. Potrzebuje (1) domknięcia pętli
transakcji tak, żeby nie przeciekała, (2) wejścia dla Firm bez ściany, (3) **Drogi Lidera jako
opowieści** widocznej na landingu i profilu, (4) stron, na które da się trafić z wyszukiwarki.
Wszystko w granicach ADR-004 (anty-MLM), ADR-009 (0 zł, zero zewnętrznych API), ADR-010 (anty-engagement).

---

## 2. Program „Droga Lidera" — 6 sprintów (PL0–PL5)

Rytm bez zmian: `pnpm format && pnpm lint && pnpm typecheck && pnpm -r test` → `pnpm build` →
`bash infra/e2e.sh` → zrzuty 390/1440 → staging → prod → wpis w HANDOFF. Skille: `portal-bramki`,
`portal-wdrozenie`, `portal-migracja`, `portal-anty-mlm`, `portal-design`, `portal-zrzuty`.
Punkt odniesienia: **217 testów API, 23 e2e**. Jeden sprint = jedno wdrożenie.

### PL0 — Pomiar i higiena (1 sesja, bez migracji) — ✅ WYKONANY 05.09 (poza pkt 3 i 5, patrz HANDOFF)

Cel: zanim zaczniemy „robić ruch", mieć lejek, który powie, co działa.

1. **Zdarzenia lejka w module `analytics`** (własna baza/Redis, 0 zł): `visit_landing`,
   `signup_started`, `signup_done`, `email_verified`, `profile_done`, `first_action`
   (oferta / zlecenie / zapytanie / pytanie Q&A). Zapis obok istniejących `views:*`
   (`apps/api/src/modules/analytics/service.ts`, `routes.ts`); emisja z `identity` i
   `marketplace` przez outbox (ten sam wzorzec co `notifications/events.ts`). Widok w
   `/panel/analityka` (karty `.day-cards`, `dataviz`). **Bez cookies, bez fingerprintu.**
2. **Referrer + UTM** w `middleware.ts` hit (dziś tylko `path`) — skąd przychodzą ludzie.
3. **Lighthouse bazowy** 390 px dla `/`, `/uslugi`, `/zlecenia`, `/liderzy`, `/drabinka`
   (skill `web-quality-skills` — patrz §3). Liczby do HANDOFF.
4. **Nagłówki bezpieczeństwa web** — `curl -I` na prod nie pokazał HSTS/CSP/X-Frame dla
   Next (helmet jest tylko na API). Dodać `headers()` w `apps/web/next.config.ts`.
   _(niezweryfikowane: Traefik może dokładać HSTS na innej ścieżce — sprawdzić przed zmianą)_.
5. Sprawdzić, czy oferta Konrada dostała odpowiedź (Macix) — jeśli nie, to dowód dla PL1.

### PL1 — Pętla transakcji nie przecieka (1 sesja, 1 migracja expand-only) — ✅ WYKONANY 05.09

Cel: pierwsza realna transakcja w Portalu ma się domknąć bez telefonu właściciela.

1. **Maile transakcyjne** (własny SMTP — ADR-009 OK): `offer_submitted` → do Firmy,
   `offer_accepted` → do Lidera, `inquiry_message` → do drugiej strony, `order_delivered`/
   `order_confirmed`. Reuse: `shared/mail.ts` + wzorzec digestu (`notifications/service.ts:397`,
   token wypisu `/wypis-digest` już istnieje). Treść jak mail aktywacyjny z S19: skąd, po co,
   bez ponaglania (ADR-010). Dedupe kluczem jak in-app (`dedupeKey`).
2. **Wątek rozmowy przy ofercie** — `OfferMessage` (lustro `InquiryMessage`: `offerId`,
   `authorId`, `body`), trasy `GET/POST /offers/:id/messages`, UI na `/zlecenia/[id]`
   (dla Firmy i oferenta) i w `/panel/oferty`. To NIE jest DM (ADR-010): rozmowa jest
   zakotwiczona w ofercie, jak `Inquiry` w usłudze. Migracja: skill `portal-migracja`;
   ścieżka dopisana do `shared/web-contract.test.ts` (KNOWN_PATHS) i do
   `social/antimlm.integration.test.ts` (wiadomość = 0 punktów). **Decyzja właściciela — D1 w §4.**
3. **„Twoja oferta czeka"** — po złożeniu oferty stan potwierdzenia z linkiem do
   `/panel/oferty` (zgłoszenie z dziennika wyprawy, dzień 6).
4. **Feed dla nowego konta**: gdy `following = 0`, domyślna zakładka = „Cała społeczność"
   (zrzut `p2-2708-feed-ciemny-1440.png` — pierwszy ekran nowego Lidera to pusty stan).

### PL2 — Firma w 90 sekund (model Oferteo/Fixly) (1 sesja) — ✅ WDROŻONY 05.09

Cel: gość z potrzebą publikuje zlecenie bez ściany logowania.

1. **Formularz potrzeby najpierw, konto potem**: `/zlecenia/nowe` dla gościa renderuje
   formularz (tytuł, branża, budżet, opis), szkic trafia do `sessionStorage`; po wysłaniu
   → lekka rejestracja (e-mail + hasło + nazwa firmy w JEDNYM kroku, `POST /auth/register`
   z `intent=COMPANY` + auto-`Company`) → szkic zapisany jako `DRAFT` → ekran „Sprawdź
   i opublikuj". Reuse: istniejący formularz zlecenia (`apps/web/app/zlecenia/nowe/`),
   `firma/nowa`, kreator `/start`. Anty-bot proof-of-work bez zmian (`lib/humancheck.ts`).
   Rate-limit świeżych kont (R-03) zostaje.
2. **Hub „Szukam wykonawcy"** dla osób szukających freelancera: `/szukam-wykonawcy`
   (3 ścieżki: opublikuj zlecenie / przeglądaj usługi / zapytaj Lidera), z pasem zaufania
   (`components/ui/trust-strip.tsx`) i realnymi kartami z `/listings`. Link z nagłówka
   i landingu zamiast dzisiejszego CTA-ściany.
3. **Strona `/dla-firm`** — copy dla drugiej strony rynku (dziś landing mówi tylko do Lidera).
   Skill `anthropic-skills:copywriting` + `design:ux-copy`; twarda zasada z briefu:
   bez fałszywych liczników i presji (ADR-010).
4. e2e: nowy spec `company-first-order.spec.ts` (gość → formularz → konto → publikacja).

### PL3 — Droga Lidera jako opowieść (design + treść, 1–2 sesje) — ✅ KOD GOTOWY 05.09 (pkt 4 View Transitions świadomie pominięty)

Cel: landing i profil mają pokazywać **drogę od zera do Lidera**, nie regulamin punktacji.
Wzorce: x.com / SpaceX = odważna typografia, jedna wielka wizualizacja, ciemne tło, ruch
służący orientacji. Wszystko własnym SVG (ADR-009), bez confetti/streaków (ADR-010).

1. **Strona `/droga`** (publiczna, ISR): 7 szczebli jako pionowa oś z „temperaturą"
   (`--level-1…7`, `LEVEL_NAMES` z `lib/levels.ts`, `ladder/rules.ts`), przy każdym: co
   odblokowuje, ile punktów, **prawdziwy przykład z księgi** (anonimizowany `PointEvent`
   z wyprawy: „50 pkt · zlecenie ocenione 5/5 · ×0,5 bo firma < 14 dni"). Sekcja
   „Ściana szerokości" — dlaczego z wąskim kręgiem nie da się wejść wysoko (anty-MLM jako
   cecha, dziennik dzień 7). CTA: „Zacznij od poziomu 0".
2. **Oś drogi na publicznym profilu Lidera** (`/liderzy/[id]`, `/profil/[handle]`):
   timeline z `LevelAchievement` + kamienie milowe (pierwsze zlecenie, pierwsza uznana
   odpowiedź) — dane już istnieją, brak widoku. Reuse `LevelBadge`, `trust-strip`.
3. **Hero landingu**: jedna wielka animowana drabina (`LadderArt` → wersja pełnoekranowa
   z `prefers-reduced-motion`), nagłówek Bricolage 56–72 px, pod nim **liczby realne**
   z API (`Liderów: 9 · Zleceń: 10 · Zrealizowanych: N`) — fakt, nie licznik próżności;
   znikają, gdy 0. Sekcja „Historie" = 2–3 realne opowieści (Konrad L0→L1, HydroSpark
   jako Firma) z dziennika wyprawy, za zgodą person. Skill `frontend-design` +
   `design:design-critique` + `emil-design-eng` (ruch), test anty-generyczności z `portal-design`.
4. **View Transitions** między listą a kartą (skill `react-view-transitions` z Vercela) —
   jedyny „efekt", jaki wnosi ruch; reszta statyczna.
5. OG image `/droga` i landingu w nowej skórze (`lib/og.tsx`).

### PL4 — Ruch z wyszukiwarki (0 zł) (1–2 sesje)

Cel: strony, na które da się wejść z Google, i pełna indeksacja tego, co już jest.

1. **Huby per branża** (programmatic SEO, 10 branż × 3): `/uslugi/branza/[slug]`,
   `/zlecenia/branza/[slug]`, `/liderzy/branza/[slug]` — branże mają już `slug` w API.
   Każdy hub: unikalny akapit (ręcznie, 10 branż = 30 akapitów, nie generator), lista z
   `publicApi` + ISR 300 s, `BreadcrumbList` + `ItemList`/`CollectionPage` JSON-LD
   (`lib/jsonld.ts`), linki krzyżowe hub↔hub, chipy branż na listach głównych → huby
   (ranking tylko do etykiet — ADR-010 OK). Filtry `?industryId=` zostają, ale kanonik
   wskazuje hub.
2. **Listy publiczne przez `publicApi` + ISR** (dziś `serverApi` + `cookies()` =
   `no-store` na `/uslugi`, `/zlecenia`, `/liderzy`, `/grupy`, `/drabinka`, `/watki/[id]`):
   powtórzyć fix z PD1 (`page.tsx` landing) — część zalogowana (ulubione, „Twoje") jako
   klientowy komponent na wierzchu. Efekt: cache HTML dla gości i botów.
3. **Sitemap bez limitu 50/typ**: kursorowa paginacja w `app/sitemap.ts` + osobne
   sitemapy (`sitemap/[id]`) gdy > 1000 URL; `lastModified` z `updatedAt`.
4. **Baza wiedzy z Q&A**: hub `/pytania` (wszystkie rozwiązane wątki, chipy branż) —
   QAPage JSON-LD już jest per wątek, brakuje strony wejścia. Ranking chronologiczny.
5. **Strony porównawcze** (skill `competitors` z marketingskills): `/porownanie/oferteo`,
   `/porownanie/fixly`, `/porownanie/useme` — uczciwe „kiedy oni, kiedy my"
   (ADR-010: bez FUD), z FAQ JSON-LD. To są frazy, których ludzie realnie szukają.
6. **AI-SEO**: `/llms.txt` + cytowalne akapity na `/droga` i `/drabinka` (skill `ai-seo`).
7. Google Search Console + Bing Webmaster (darmowe, tylko weryfikacja pliku/DNS — nie API
   per klik; zgodne z ADR-009). Rejestracja sitemapy. _(wymaga dostępu właściciela do DNS)_.

### PL5 — Pierwszych dwudziestu, ale z lejkiem (ops + produkt, 1 sesja)

1. **„Zaproś Lidera"** (S19 pkt 2 — nadal nie zrobione): strona + mail, **0 punktów,
   0 nagrody, 0 downline**; ścieżka dopisana do `antimlm.integration.test.ts`.
2. **Mail powitalny** po weryfikacji (S19 pkt 5) z JEDNYM krokiem: „opublikuj usługę"
   albo „opublikuj zlecenie" wg `intent`.
3. **Przypomnienie o niepotwierdzonym adresie** raz, po 48 h (otwarte z S19 pkt 4).
4. **Seeding realny z HydroSpark**: 3–5 prawdziwych zleceń Macieja (instalacje, marketing,
   księgowość) zamiast demo — i **decyzja o purge demo** (R-17, D3 w §4).
5. Miara sukcesu programu: lejek z PL0 pokazuje ≥ 20 realnych kont z potwierdzonym
   adresem i ≥ 5 pierwszych akcji w 30 dni od PL4.

**Czego świadomie NIE robimy:** algorytmu feedu, DM, streaków, płatności (ADR-006), Cloudflare/
Turnstile, zewnętrznych API, auto-deployu, punktów za cokolwiek poza pracą i mentoringiem.

---

## 3. Skille z GitHuba — co warto zainstalować (wszystkie MIT, lokalne pliki SKILL.md = 0 zł)

Skill to instrukcja czytana lokalnie — nie wykonuje wywołań HTTP w runtime Portalu, więc ADR-009
jest zachowany. Instalacja globalna (`~/.claude/`), nie do repo (repo trzyma tylko `portal-*`).

| Repo                                                                                                                                     | Skille do użycia                                                                                                                                                       | Sprint                  | Instalacja                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (46,9k★, 75 skilli)                                    | `programmatic-seo`, `seo-audit`, `schema`, `ai-seo`, `competitors`, `onboarding`, `signup`, `cro`, `copywriting`, `launch`, `community-marketing`, `site-architecture` | PL2, PL4, PL5           | `/plugin marketplace add coreyhaines31/marketingskills` → `/plugin install marketing-skills`                                       |
| [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) (25 sub-skilli, offline; płatne rozszerzenia OPT-IN — nie włączać) | `/seo audit`, `/seo schema`, `/seo technical`, `/seo geo`                                                                                                              | PL0 (audyt bazowy), PL4 | `/plugin marketplace add AgriciDaniel/claude-seo` → `/plugin install` → `/seo setup`                                               |
| [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills)                                                        | `performance`, `core-web-vitals`, `accessibility`, `seo`; fallback Lighthouse CLI bez MCP                                                                              | PL0, PL3                | `/plugin marketplace add addyosmani/web-quality-skills` → `/plugin install web-quality-skills@addy-web-quality-skills`             |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)                                                                  | `web-design-guidelines` (100+ reguł UI/a11y), `react-best-practices`, `react-view-transitions`, `composition-patterns`                                                 | PL3                     | `npx skills add vercel-labs/agent-skills --skill web-design-guidelines -a claude-code`                                             |
| [rampstackco/claude-skills](https://github.com/rampstackco/claude-skills) (103 skille)                                                   | `landing-page-copy`, `onboarding-wizard-design`, `multi-step-form-design`, `journey-mapping`, `product-analytics-setup`, `seo-onpage`, `information-architecture`      | PL0, PL2, PL3           | `/plugin marketplace add rampstackco/claude-skills` → `/plugin install rampstack-skills@rampstack`                                 |
| [phuryn/pm-skills](https://github.com/phuryn/pm-skills) (68 skilli)                                                                      | `growth loops`, `North Star metric`, `journey maps`, `cohort analysis`                                                                                                 | PL0, PL5                | `claude plugin marketplace add phuryn/pm-skills` → `claude plugin install pm-marketing-growth@pm-skills pm-go-to-market@pm-skills` |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (101k★)                                  | tylko jako **źródło porównawcze** przy krytyce (50+ stylów, 161 palet) — NIE do generowania: Portal ma własne tokeny i zakaz nowych bibliotek UI                       | PL3                     | `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill`                                                                     |
| [anthropics/skills](https://github.com/anthropics/skills)                                                                                | `frontend-design`, `webapp-testing`, `skill-creator` (już dostępne we wtyczkach właściciela)                                                                           | —                       | już zainstalowane                                                                                                                  |

Pominięte świadomie: skille wymagające Ahrefs/DataForSEO/Semrush (płatne), `hyperfx-ai/marketing-skills`
(wymaga MCP z kluczem), skille do płatnych reklam (brak budżetu, ADR-009). Brak skilla po polsku —
copy pisze się z `copywriting` + `design:ux-copy`, a ton pilnuje CLAUDE.md repo.

Po instalacji: dopisać wiersze do `docs/SKILLE.md` (sekcja „Skille zewnętrzne").

---

## 4. Decyzje właściciela (rekomendacje — nie rozstrzygnę ich z kodu)

| #   | Decyzja                                                                             | Rekomendacja                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Wątek rozmowy przy ofercie na zlecenie (PL1.2) — czy to nie łamie ADR-010 „bez DM"? | **TAK, wdrożyć.** To lustro `Inquiry` (rozmowa zakotwiczona w transakcji, nie DM). Bez tego pierwsza transakcja umiera.                                   |
| D2  | Zlecenie jako gość przed kontem (PL2.1) — Firma bez weryfikacji publikuje szybciej  | **TAK.** Brief 3.4 mówi to wprost; ryzyko spamu R-03 mitygują istniejące rate-limity i proof-of-work. Szkic publikuje się dopiero po weryfikacji e-maila. |
| D3  | Dane demo na produkcji (R-17) przed pchnięciem ruchu                                | **PURGE przed PL4.** Strony hubowe z fikcyjnymi Liderami w Google = dowód przeciw ADR-004. Zastąpić 3–5 realnymi zleceniami HydroSpark.                   |
| D4  | Historie person wyprawy na landingu (PL3.3) — konta są testowe                      | Użyć jako **„historia wyprawy"** jawnie oznaczonej, albo poczekać na pierwszą realną. Nie udawać.                                                         |
| D5  | Google Search Console / Bing — weryfikacja domeny                                   | Zrobić (0 zł, brak API per klik); wymaga wpisu DNS/pliku od właściciela.                                                                                  |

Kolejność wdrażania: **PL0 → PL1 → PL2 → PL3 → PL4 → PL5**. PL3 i PL4 można zamienić, jeśli
właściciel chce najpierw ruch, a potem wygląd — ale strony hubowe w starej skórze landingu
też zadziałają.

---

## 5. Weryfikacja (dowód, nie „wdrożone")

- **PL0:** `/panel/analityka` pokazuje lejek; zdarzenia testowe kontem `@test.local` widoczne i posprzątane. Lighthouse przed/po w HANDOFF. `curl -I` prod pokazuje HSTS/CSP.
- **PL1:** konto testowe Firmy dostaje mail o ofercie (SMTP `250 queued` + kliknięty link prowadzi do zlecenia); wymiana 2 wiadomości w wątku oferty na prodzie; `antimlm` zielony **z rozszerzoną ścieżką** (liczba testów wzrosła).
- **PL2:** gość na 390 px: formularz → konto → publikacja w < 90 s (nagranie/zrzuty), nowy e2e zielony; ścieżka przejdzie na prodzie kontem testowym, konto usunięte ścieżką RODO.
- **PL3:** test anty-generyczności (`/droga` obok szablonu bez logo) z `design:design-critique`; zrzuty 390/1440 w obu motywach; kontrast AA zmierzony; `prefers-reduced-motion` respektowany.
- **PL4:** `curl -I /uslugi/branza/marketing` = `cache-control` publiczny (nie `no-store`); sitemap > 55 URL i waliduje się; JSON-LD przechodzi walidator schema.org (offline: `structured-data-testing-tool` z npm); Search Console widzi sitemapę (po D5).
- **PL5:** lejek z PL0: liczba `email_verified` i `first_action` w 30 dni — to jedyna miara, która się liczy.

**Lista „niezweryfikowane" po tej analizie:** (1) czy Traefik dokłada HSTS (curl HEAD nie pokazał), (2) czy Macix widział ofertę (baza — zapytanie zablokowane klasyfikatorem; sprawdzić w PL0 z panelu admina lub `docker exec` bez hasła w wierszu), (3) Lighthouse/LCP na dziś — brak pomiaru, tylko TTFB z curl, (4) czy `redirect('/logowanie')` na `/zlecenia/nowe` działa dla realnej przeglądarki (curl dostał 200 z `<form` — prawdopodobnie prerender), (5) gwiazdki/licencje skilli sprawdzone tylko przez WebFetch README, nie sklonowane.
