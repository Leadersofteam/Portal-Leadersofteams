# Handoff dla Claude Code — stan projektu i plan sprintów

> **📌 OD 2026-08-14 START SESJI WYGLĄDA INACZEJ.** Repo ma [`CLAUDE.md`](../CLAUDE.md)
> (wczytywany automatycznie), [`docs/MINY.md`](MINY.md) — skonsolidowaną listę pułapek —
> oraz **siedem Skilli projektowych** w `.claude/skills/` (mapa: [`docs/SKILLE.md`](SKILLE.md)).
> Skille włączają się same przy wdrożeniu, migracji, bramkach, danych demo, zrzutach,
> funkcjach społecznych i domykaniu sesji. Prompt startowy jest przez to KRÓTKI —
> wiedza żyje w repo, nie w kopiowanym bloku tekstu.
>
> **Stan produkcji 2026-08-14:** 1 realne konto (właściciel) + komplet danych demo.
> Konto `asfsaf@gmail.com` usunięte na polecenie właściciela (był to adres testowy).
> Wszystkie kontenery `healthy`, `worker.alive` i `uploads` zielone, zero błędów w logach.

> **✅ SESJA 2026-08-23 (wyprawa dogfoodingowa + nagroda Drabinki): przeszedłem Drabinkę jak Lider i odebrałem nagrodę — na produkcji** (`a91e57e`, `c1ada35`). Skróty: (1) nagroda „dostęp do aplikacji LOT" wróciła do briefu — copy `/drabinki`+landingu mówi prawdę, panel nagrody na `/panel/punkty` czyta flagi z `/ladder/levels`, ADR-010 zaktualizowany, anty-MLM rozszerzony o ścieżkę odbioru; (2) persona Konrad Jaworowski (konto wyprawy, `wyprawa/KONTA.md`) przeszła L0→L1 realnie: 3 cykle zleceń, Q&A, kompresja czasu `wyprawa-czas.ts`; ściana szerokości potwierdzona jako cecha anty-MLM; (3) App: zespół „Jaworowski Consulting", 5 leadów, kreator S18 OK, 2 wpisy w feedzie; (4) warsztat `wyprawa/` + skille `portal-wyprawa`/`lot-prowadzenie-zespolu`; W-01 (walidacja kreatora) naprawione. Sprzątanie z dowodem: realne konta = 5 person + Macix. **Wykluczaj `wyprawa/KONTA.md` przy liczeniu realnych.**

> **✅ SESJA 2026-08-22 (tor funkcjonalny, S19 pkt 3+4): ślad zaufania wszedł do
> wyszukiwarki, a pierwsza mila przestała chować akcję pod zgięciem — wdrożone na staging
> i produkcję** (`40fa0ab`, `bd480ce`). Bramki: **216/216 API** (213 + 3 nowe), 18/18 e2e,
> healthz/worker/uploads zielone, zero błędów w logach po deployu.
>
> **⚠️ NAJWAŻNIEJSZY POMIAR SESJI — nie funkcja, tylko liczba.** Na produkcji Portalu jest
> **DOKŁADNIE JEDEN realny człowiek**: `kuchar21ski@gmail.com` („Macix", konto z 13.08,
> intencja LEADER, profil Lidera założony). Reszta z 18 wierszy to 9 kont demo i 8 wcześniej
> zanonimizowanych kont testowych. **Jego adres nie został potwierdzony ANI RAZU** — token
> `EMAIL_VERIFY` wygasł 14.08 z `usedAt = NULL` i przez 9 dni nikt tego nie zauważył.
> Do tego: **0 zapytań ofertowych** od zawsze, **0 powiadomień**, **0 kont ADMIN/MODERATOR**
> (18/18 to `USER` — panel moderacji i zakładki moderatorów z S17 są niedostępne dla nikogo),
> zero ruchu organicznego w logach api z ostatniej doby. To jest stan wejściowy launchu.
>
> **1. S19 pkt 3 — ślad zaufania w `/szukaj`.** Przyczyna była architektoniczna, nie
> kosmetyczna: wzbogacanie o oceny żyło w warstwie TRAS (`listings/routes.ts` `withLeaderMeta`,
> `marketplace/routes.ts`), a `/search` komponuje SERWISY i tamtędy nie przechodzi — dlatego
> wyszukiwarka była jedynym miejscem w Portalu bez tego sygnału. Statystyki doklejane tam,
> gdzie `/search` dokleja już poziom Drabinki: jeden batch `getLeaderReviewStatsMany` na
> komplet Liderów z obu zakładek, bez N+1. Markup pasa wyprowadzony do
> `components/ui/trust-strip.tsx`, żeby nie powstała druga kopia obok `listing-card`.
> Zasada PD3 nietknięta (cisza zamiast piętna). **Na żywo:** `/szukaj?q=sprint` → 6 pasów,
> `?q=Lead&zakladka=liderzy` → 2 pasy, odmiana polska poprawna („1 zrealizowane zlecenie",
> „2 zrealizowane zlecenia", „4 zrealizowane zlecenia"), 390 i 1440 px.
>
> **2. S19 pkt 4 — pierwsza mila zmierzona, nie oceniona.** Na 390 px pierwszy element,
> w który da się kliknąć na `/start` („Jestem Liderem"), leżał na **y = 981 px przy zgięciu
> 844** — człowiek widział na pierwszym ekranie sam manifest i drabinę i musiał ZGADYWAĆ,
> że jest tu cokolwiek do zrobienia. Ilustracja spychała wybór pod zgięcie; ten sam mechanizm
> rozwiązuje już `.auth-aside` na `/rejestracja`. Po zmianie **y = 711**, strona 2269 → 1999 px.
>
> **3. Zastane, znalezione po drodze:** `/weryfikacja` przy wygasłym linku kazała się
> ZALOGOWAĆ także komuś, kto był już zalogowany — instrukcja nie do wykonania, a nowy link
> wisiał dwa ekrany dalej w banerze panelu. Zalogowany dostaje ponowną wysyłkę na miejscu;
> wylogowanemu świadomie NIE dajemy formularza z adresem (enumeracja kont).
> **Sprostowanie do planu tej sesji:** zakładałem „ślepy zaułek wygasłego linku" — pomiar
> pokazał, że ślepego zaułka NIE MA (strona rozróżnia stany i prowadzi do logowania).
> Prawdziwą wadą było złe polecenie dla zalogowanego.
>
> **4. Mail aktywacyjny przestał wyglądać jak spam.** Był jedną linijką z gołym URL-em.
> Nowa treść mówi, skąd wiadomość, po co potwierdzenie, ile link jest ważny i co zrobić po
> wygaśnięciu — bez ponaglania (ADR-010).
>
> **5. Decyzja właściciela wykonana:** do Macixa poszedł **JEDEN** link aktywacyjny, tą samą
> ścieżką co produkcyjna, PO wdrożeniu poprawek (żeby prowadził już do naprawionej strony).
> SMTP: `250 Ok: queued as 4hRfSk10jmz2xp5`, `accepted: [kuchar21ski@gmail.com]`.
> Token `cmt3ow7i00001me3tca6yt0yc` ważny do 2026-08-23 01:18 UTC.
> **Do sprawdzenia w następnej sesji: czy `usedAt` się wypełnił.** Jeśli nie — pytanie nie
> brzmi „jak poprawić mail", tylko „czy ten człowiek w ogóle chce tu być".
>
> **6. Posprzątane:** 8 kont `@test.local` z produkcji i 2 ze stagingu (stan wrócił do
> 18 wierszy: 9 demo, 8 zanonimizowanych, 1 realny). Skrypt jednorazowy usunięty z kontenera.
>
> **ADR-004 nietknięty:** zmiana jest projekcją danych marketplace, nie funkcją społeczną
> i nie źródłem punktów — `antimlm.integration.test.ts` nie wymagał rozszerzenia, a istniejąca
> asercja „wyszukiwanie nie tworzy zdarzeń ani punktów" pozostaje zielona.

> **✅ SESJA 2026-08-21 noc (design, PD4 — FINAŁ programu Portalu): offline przestał być
> zaślepką, dostępność domknięta — wdrożone na staging i produkcję.**
> (1) **Offline z ostatnim obrazem feedu**: migawka w localStorage — wyłącznie zakres
> „cała społeczność" (to, co widzi gość; skład „obserwowanych" zdradzałby graf obserwacji),
> czyszczona przy wylogowaniu; strona /offline renderuje ją klientowym Reactem, a instalacja
> SW parsuje z HTML /offline nazwy chunków i dokłada je do precache (lot-v2). **Lekcja
> sesji:** pierwsza wersja wstrzykiwała karty skryptem inline i hydracja Reacta zdejmowała
> je z DOM — e2e kłamał na zielono (łapał stan sprzed wyczyszczenia), prawdę pokazał dopiero
> zrzut ze stagingu; pełny mechanizm w MINY. (2) **WCAG**: 23 pary tokenów zmierzone, jedyna
> poniżej AA (--text-faint 3,91:1) naprawiona do 4,68–5,31:1 jednym tokenem. (3) **Dług PD3**:
> /panel/analityka — doby kartami na 390 px (.day-cards, wzorzec .rung-cards), tabela zostaje
> jako .desktop-only. (4) **ux-copy**: puste stany /uslugi i /zlecen z kontekstowym CTA
> („Wyczyść filtry" przy aktywnych filtrach zamiast fałszywego „Opublikuj pierwszą").
> Bramki: 213/213 API, **18/18 e2e** (nowy test migawki). Programy designu App (D1–D4)
> i Portalu (PD1–PD4) są DOMKNIĘTE poza D5 App (dostępność/dataviz — brief w repo App).

> **✅ SESJA 2026-08-21 wieczór (design, PD3): marketplace opowiada zaufanie — wdrożone
> na staging i produkcję** (`982d26f` + docs), healthz/worker/uploads zielone, **213/213
> API** (baza 212 + nowy test), 17/17 e2e. Test anty-generyczności katalogu ZDANY.
>
> **1. Lider wreszcie ma czym udowodnić pracę.** `completedOrders` w API (odbicie
> licznika Firmy: CONFIRMED przez wygraną ofertę; wersja wsadowa bez N+1) → widoczny
> w pasie zaufania karty usługi (`.trust-strip`: „★ 4/5 (1) · 1 zrealizowane zlecenie")
> i na profilu Lidera jako karty lustrem profilu Firmy (feature-grid + stat-number).
> Zasada pasa: tylko fakty ZAPRACOWANE — świeży Lider nie dostaje zer ani „brak ocen".
> Gwiazdka światłem marki, nie bursztynem (bursztyn = poziom 7, jak przy docenieniach).
> Weryfikacja NA ŻYWO: prod pokazuje Tomek/Ola/Piotr = 1 realizacja, Macix = 0.
>
> **2. Martwa trasa PATCH /listings/:id OŻYŁA** (dług S18, S21 pkt 0): formularz
> create/edit (jeden plik, `initial` przełącza tryb; slug celowo STABILNY — komunikat
> w UI), strona `/uslugi/[slug]/edytuj`, wejścia: „Edytuj" w panelu obok
> Wstrzymaj/Archiwizuj i na stronie usługi dla właściciela. Wyjątek zdjęty ze
> strażnika kontraktu, trasa dopisana do KNOWN_PATHS. Ścieżka przeszła na żywo
> dwukrotnie (staging + prod: PATCH → skutek widoczny publicznie → przywrócenie
> oryginału, zero śladu).
>
> **3. Mobile marketplace:** filtry /uslugi zwinięte za przyciskiem na 390 px (4 pola
> spychały pierwszą kartę o cały ekran; desktop bez zmian), `list-row--stack` na
> /liderzy, /zlecenia, /panel/zlecenia i /panel/uslugi. Karta usługi w JEDNYM
> komponencie (`components/ui/listing-card`) zamiast kopii w katalogu i ulubionych.
> Naprawiona wisząca kropka na profilu Lidera poziomu 0 (separator przy null-owym
> LevelBadge). Nagłówek profilu Lidera klasą `.leader-head`, poziom z nazwą.
>
> **4. Pułapka weryfikacji (do MINY):** na stagingu po IP/HTTP przeglądarka NIE
> zaloguje konta — cookie sesji ma `Secure` w buildzie produkcyjnym. Ścieżki
> zalogowane testuj przez API z ręcznie niesionym cookie (curl ignoruje Secure)
> albo w przeglądarce na produkcyjnym HTTPS.

> **✅ SESJA 2026-08-21 (design, PD2): pierwsza mila jak z produktu — wdrożone na staging
> i produkcję** (`0a85df2` + `bccc78b`), healthz/worker/uploads zielone, 212/212 API,
> 17/17 e2e. **Twardy test „szablon czy produkt" ZDANY** (mock generycznego feedu obok
> naszego /feed bez logo; wyróżniki: temperatura poziomów z etykietą, separatory dni,
> Bricolage, atmosfera tła, pasek 5 slotów).
>
> **1. Co weszło.** Feed: separatory dni (Dziś/Wczoraj/data — chronologia ADR-010 jako
> WIDOCZNA cecha), karta autora z poziomem ma lewą krawędź w kolorze szczebla
> (`--actor-lv`), chip poziomu z nazwą („Poziom 2 · Praktyk", `lib/levels.ts` — lustro
> `ladder/rules.ts`), awans celebruje odznaka `LevelBadge size="md"` (jedyna celebracja,
> ADR-004), pusty stan „cisza" dostał CTA, chipy tematów przycięte do 6 (11 spychało treść
> o ekran na 390 px). Landing: drabinka na 390 px kładzie się na bok (column-reverse,
> bursztyn NA GÓRZE, nazwy widoczne — wcześniej `display:none` łamał parę kolor+etykieta),
> pasek liczb 7/2/0. Rejestracja ≥1024: kolumna „po co konto" z latarnią. Kreator: wejścia
> kroków `rise` w nowej skali ruchu (`--dur-fast/--dur-slow/--ease-out` w `:root`), karty
> „Pierwszego ruchu" z miniaturami ART. Drabinka: próg punktów liczbą-bohaterem karty,
> `levels=[]` → EmptyState, zalogowany poziom 0 widzi pasek „Twoje miejsce czeka".
> Kontrast nowych par zmierzony: 6.7–11:1 (wszystko ≥AA).
>
> **2. Wydajność.** CLS bez zmian (0–0.058, ten sam shift shellu). FCP/LCP w bazie PD1
> poza `/drabinką`: FCP ~480–530 ms vs baza 296–424 — świadomy koszt dwóch nowych zapytań
> (`/auth/me` dla paska poziomu 0); pierwsza wersja robiła je SEKWENCYJNIE (620–836 ms),
> `Promise.all` w `bccc78b` zbił to o ~150 ms. UWAGA na pomiar: trzy sesje pomiarowe dały
> trzy obrazy, bo VPS (2 rdzenie) miał load 6–9 — równoległy `next build` Zodiamo z innej
> sesji ORAZ osierocony Chromium Playwrighta z 20.08 (PID 48660/48562, ~416 min CPU,
> NIE ubity — może należeć do żywej sesji; **właściciel: warto sprawdzić i ubić**).
> Liczby porównywać tylko przy niskim load.
>
> **3. Pełny audyt WCAG** (`design:accessibility-review`) świadomie NIE zrobiony — to
> zakres PD4; w PD2 przeszedł szybki pas (kontrasty zmierzone, focus states, etykiety przy
> temperaturze, cele ≥44 px pilnowane przez e2e mobile-shell).

> **✅ SESJA 2026-08-20 (design, PD1): Portal przejął paletę „cieplone indigo" + landing bez
> mignięcia skeletonu.** Wdrożone na staging i produkcję, wszystkie kontrole zielone.
>
> **1. Paleta.** Właściciel wybrał w D1 App kierunek A z trzech renderowanych na żywych
> ekranach (materiał: repo App, `audyt/design/palety-d1/`). W Portalu weszła do `globals.css`
> (primary/semantyka/orchidea zamiast violet; `--level-3` idzie za nowym primary-400) + sedem
> literały `rgb(99 102 241 …)` → `rgb(131 113 244 …)` w 5 plikach CSS. Własne SVG (logo,
> LadderArt) miały ZASZYTE hexy marki — inline SVG w HTML honoruje `var()`, więc teraz czytają
> tokeny (statyczne `public/logo.svg`/`app/icon.svg` podmienione literalnie — tam var() nie
> działa). Kontrast zmierzony: **19/19 par AA** (tekst/tło, semantyka, poziomy 1–7 na surface).
>
> **2. Pomiar bazowy PD1 obalił pkt 2 dokumentu.** LCP na `/`, `/feed`, `/drabince`
> i `/rejestracji` to AKAPIT TEKSTU (300–850 ms), nie obraz — `fetchpriority`/`sizes` nie
> miały czego przyspieszać (hero to inline SVG; feed ma `<img>` bez `srcset`, więc `sizes`
> byłby no-opem). Realny problem znalazł się gdzie indziej: **`serverApi` czyta `cookies()`
> i wyłącza prerender całej trasy** — gość na landingu dostawał skeleton z `loading.tsx`
> i podmianę treści ~1,3 s po wejściu (stopka spadała o 3,7 tys. px; stąd CLS 0,058 na każdej
> stronie). Naprawa: `publicApi` bez cookies z ISR 300 s → `/` jest `○ (Static)`,
> **CLS 0** (bazowo zawsze 0,058; przy rewalidacji ISR pojedynczy przebieg może jeszcze
> złapać 0,058 — zaakceptowane). Liczby bazowe (390 px, produkcja, 3 przebiegi/strona):
> `/` FCP 320–384 · `/feed` FCP 380–1196, LCP do 1768 · `/drabinka` FCP 296–424 ·
> `/rejestracja` FCP 296–460. Po wdrożeniu `/`: FCP 288–612, CLS 0–0.058.
>
> **3. Wdrożeniowa wpadka sesji (naprawiona w ~4 min):** deploy prod odpalony BEZ
> `--env-file .env.prod` i spoza `infra/` — compose wziął domyślne `infra/.env` (dev),
> przetworzył WSZYSTKIE kontenery (z mysql!) i api wstało z błędnymi poświadczeniami.
> Dane nietknięte (wolumen; po naprawie 18 users / 4 posts). Lekcja w MINY: komendy wdrożenia
> kopiować ZE SKILLA, nie z pamięci.
>
> **✅ SESJA 2026-08-19 (PM infrastruktury): digest naprawiony + role z UI** (`380bd08`, `c562583`).
> Wdrożone na staging i produkcję (migracja expand-only: `users.digestOptOutAt`,
> `users.digestToken`, tabela `worker_state`), przejście ścieżek NA ŻYWO kontami testowymi
> (posprzątane ścieżką RODO — stąd 6 nowych wierszy `deleted-*@deleted.invalid` z 19.08).
>
> **1. Digest miał dwie zastane usterki.** (a) `setInterval(24h)` liczony od startu procesu —
> każdy deploy resetował licznik, więc digest wychodził losowo albo wcale. Teraz: znacznik
> `digest:lastSentDate` w `worker_state`, sprawdzenie co 10 min, wysyłka raz na dobę po
> 06:00 UTC. Dowód z produkcji: wiersz `2026-08-19` zapisany przy pierwszym przebiegu,
> restart workera nie wysyła drugi raz. (b) **Zero drogi wypisu** — grep po
> `optOut|unsubscribe` dawał zero trafień, a przy realnych użytkownikach to RODO, nie
> kosmetyka. Teraz: link „wypisz się" w mailu (trwały token per user, strona `/wypis-digest`
> bez logowania) + przełącznik w `/panel/konto`. Zweryfikowane na żywo: wypis tokenem
> ustawia `digestOptOutAt`, zły token dostaje uczciwy komunikat.
>
> **2. Role moderatora z UI zamiast SQL-a.** `GET /admin/users` + `POST /admin/users/:id/role`
> (tylko ADMIN) + strona `/panel/uzytkownicy` (link w karcie Moderacji panelu). Zmiana roli
> od razu niszczy sesje tej osoby (rola jest zamrożona w sesji — pułapka z S12). ADMIN
> celowo POZA zasięgiem tras: przejęte konto admina nie mianuje kolejnych adminów.
> ⚠️ **Produkcja nie ma dziś ŻADNEGO konta ADMIN ani MODERATOR** (jedyne „ADMINY" w bazie
> były moimi kontami testowymi, posprzątane). Żeby użyć panelu, właściciel nadaje sobie rolę
> jednorazowo SQL-em: `UPDATE users SET role='ADMIN' WHERE email='<jego-mail>';` + ponowne
> zalogowanie. Dalej wszystko idzie z UI.
>
> **3. Zastany incydent bezpieczeństwa: dev Redis przejęty.** 18.08 07:03 UTC ktoś z
> 175.24.232.83 wykonał `SLAVEOF` na wystawionym na świat `portal-dev-redis-1` (port 6379,
> bez hasła — ryzyko akceptowane przez właściciela dla portal-dev). Synchronizacja z hostem
> atakującego NIGDY się nie powiodła (2248 nieudanych prób), dane nietknięte, ataku przez
> `CONFIG SET dir` brak. Naprawione `SLAVEOF NO ONE` 19.08. **Prod-owe Redisy nie są
> wystawione.** Objaw, po którym to wyszło: cała suita testów padała na
> „READONLY You can't write against a read only replica". Decyzja o dalszym wystawianiu
> portu należy do właściciela — ryzyko przestało być teoretyczne (wpis R-18 w RISKS.md).
>
> **4. Nowa mina złapana ścieżką na żywo:** zdublowany `Content-Type` w kliencie dawał 415
> na POST-ach przy komplecie zielonych testów (`app.inject` nie idzie przez fetch
> przeglądarki) — patrz MINY.md. Plus dwa nowe skille: `portal-awaria` (rollback/restore)
> i `portal-stan-zastany`, oraz skopiowane `playwright-cli`/`playwright-trace`/`prisma-cli`.
>
> **Poza zakresem, do wiadomości:** flagi `unlocksAppAccess`/`unlocksTeamCreation` w
> `ladder/rules.ts` wciąż obiecują na /drabince „założenie własnego zespołu" (L7) —
> integracja z App porzucona, a grupy zakłada dziś każdy; copy do decyzji właściciela.
> Zastany `GET /me/listings → 400` dla świeżych kont — osobne zadanie (chip w sesji).

> **✅ SESJA 2026-08-19 (wieczór): zastany 400 na `GET /me/listings` naprawiony** (`58b8932`).
> `myListings` wymagało profilu Lidera (`PROFILE_REQUIRED`), a panel (SSR,
> `panel/page.tsx` i `panel/uslugi`) odpytuje tę trasę dla KAŻDEGO zalogowanego —
> każde świeże konto od rejestracji generowało 400 w logach api. Strona się nie
> wywalała (`serverApi` łyka nie-OK jako `null`), więc objaw był tylko w logach.
> Naprawa: brak profilu = pusta lista (wzorzec `listMyInquiries`); bramka profilu
> zostaje w `createDraft`. Test integracyjny pokrywa oba przypadki (212 testów API).
> Potwierdzone na żywo: prod PRZED naprawą 400 → po wdrożeniu 200 `[]` (staging
> i prod, konta testowe `claude-test-me-listings-*@test.invalid` usunięte z obu baz).

> **▶ NASTĘPNY KROK: S19 „Pierwszych dwudziestu"** w [SPRINTY-S18-S21.md](SPRINTY-S18-S21.md).
> ⚠️ Ten sprint **zaczyna się od decyzji właściciela**, której nie da się rozstrzygnąć z kodu:
> czy dane demo zostają na produkcji, gdy przyjdą realni Liderzy (R-17), i kogo zapraszamy.

> **✅ S18 DOMKNIĘTY (2026-08-15): „Prawda o Portalu"** (`0af32c3`, `5012178`, `60e20b8`, `53fa760`).
> Wdrożone na staging **i produkcję**, przejście ścieżki wykonane NA ŻYWO kontem testowym
> (skasowanym własnym przyciskiem „Usuń konto" — testowana funkcja była jednocześnie
> sprzątaniem). Sprint higieniczny: zero nowych funkcji, wszystko o zgodność deklaracji
> ze stanem faktycznym. **Bez migracji** — zero zmian w Prismie.
>
> **1. Analityka przestała liczyć samą siebie.** Sonda kontenera `web` uderzała w `/` co 15 s
> i była liczona jako odsłona. Sonda celuje dziś w `/healthz` (nowa trasa `force-dynamic`,
> żeby dalej dowodziła RENDEROWANIA), wykluczoną z matchera middleware — nie z białej listy,
> bo wtedy kłamstwo przeniosłoby się z `/` na `/inne`.
> **Dowód z produkcji:** przed zmianą `/` = 3926/dobę przy 2–3 na każdej innej stronie;
> po zmianie **0 przyrostu w kontrolowanym oknie 4 minut** przy kontenerze `healthy`
> (gdyby sonda dalej liczyła, byłoby +16).
>
> **2. DRUGI POWÓD, dla którego analityka kłamała — nieopisany w roadmapie.** Biała lista
> `KNOWN_PATHS` była za kodem o dwa sprinty: siedem istniejących stron wpadało do `/inne`,
> w tym `/reset-hasla` i `/weryfikacja`, czyli dokładnie te sygnały, których szukamy przy
> pierwszej mili. Gorzej: heurystyka identyfikatorów milczała przy `/profil/<uchwyt>` —
> uchwyt to `displayName` przycięty do 24 znaków **bez sufiksu**, więc realny uchwyt jest
> zwykle KRÓTSZY niż próg długości. Istniejący test przechodził wyłącznie dlatego, że użyto
> w nim 27-znakowej atrapy. To samo dotyczyło `/tematy/<hashtag>` i `/uslugi/<slug>`.
> **Wniosek do zapamiętania: atrapa dobrana pod implementację potrafi zazielenić test
> na dane, które w produkcji nie występują.**
>
> **3. RODO dostało ścieżkę użytkownika (R-10).** `GET /me/export` i `DELETE /me` działały
> od D6 bez ANI JEDNEGO wywołania w aplikacji, a `/prywatnosc` §5 twierdziła, że „w panelu
> konta możesz pobrać komplet swoich danych". Nowe `/panel/konto`: eksport (blob +
> `<a download>`, NIE `window.open` — w PWA nowa karta nie pobiera pliku) i usunięcie konta
> z potwierdzeniem przez WPISANIE słowa (natywnego `confirm()` nie da się uczciwie przejść
> w e2e, a odruchowe „OK" nie jest decyzją). Opis „co zostaje" napisany z kodu
> `anonymizeAccount` i `anonymizeUserContent` każdego modułu — deklaracja prawna rozjeżdżająca
> się z implementacją jest gorsza niż jej brak.
>
> **4. `/panel/ulubione`** — `GET /me/favorites` istniało od Sprintu 7 bez strony.
> **`/me/social`** też nie miało wejścia: wzmianki `@handle` działały, a użytkownik nie miał
> jak poznać własnego uchwytu. Panel pokazuje go z linkiem do publicznego profilu.
>
> **5. STRAŻNIK `shared/web-contract.test.ts`.** Porównuje trasy API z literałami ścieżek
> w `apps/web` — nie tylko z argumentami `apiFetch`, bo strona zlecenia podaje ścieżkę
> PROPSEM (`<ActionButton path={…}>`) i cały cykl życia zlecenia byłby przegapiony.
> Zweryfikowany próbą: usunięcie `/panel/ulubione` czerwieni suitę na `GET /me/favorites`.
> **🔴 ZNALAZŁ DWIE ZASTANE MARTWE TRASY, o których nikt nie wiedział:**
> `POST /offers/:id/withdraw` (od Sprintu 3 — złożonej oferty NIE DAŁO SIĘ wycofać inaczej
> niż curl-em; naprawione przyciskiem w `/panel/oferty`) oraz **`PATCH /listings/:id` —
> opublikowanej usługi NIE DA SIĘ edytować**. To drugie zostawiam świadomie: edycja to
> funkcja, a ten sprint jest higieniczny. Wpisane do wyjątków z uzasadnieniem i dopisane
> do S21.
>
> **🔴 ZASTANY BŁĄD 1: `public/robots.txt` przesłaniał `app/robots.ts`.** Next serwuje
> statyki przed trasami aplikacji, więc plik sprzed Sprintu G1 wygrywał od miesiąca:
> `/logowanie` i `/rejestracja` NIE były wyłączone z indeksacji, a linia `Sitemap:` **nigdy
> nie trafiła do crawlerów** — czyli główny efekt pracy nad odkrywalnością z G1 nie działał.
> Naprawione; strażnik porównuje teraz `public/` z trasami metadanych w `app/`.
>
> **🔴 ZASTANY BŁĄD 2, złapany na zrzucie nowej strony i potwierdzony POMIAREM: KAŻDY
> główny przycisk Portalu był przezroczysty.** `.btn` miał `background-color: rgba(0,0,0,0)`,
> bo warstwa „połysku" z `climb.css` (wyższa swoistość) nadpisywała `background-image`
> ustawiony skrótem `background` w `globals.css`. „Filtruj", „Utwórz konto", „Zaloguj się"
> renderowały się jako sam biały napis — od S9/S10. Nikt nie zgłosił, bo biały tekst na
> ciemnym tle nadal się czyta. Wypełnienie żyje dziś w zmiennej `--btn-fill`, połysk jest
> DRUGĄ warstwą, a `background-color` jest siatką bezpieczeństwa.
>
> **6. Moduł `analytics` przestał być jedynym bez testów.** ⚠️ Sprostowanie do roadmapy:
> `shared/analytics.test.ts` istniał i pokrywał `normalizePath`/`dayKey` — brakowało testów
> SERWISU modułu (agregacja dób, źródła liczb).
>
> **7. Rejestr ryzyk przestał kłamać:** dane demo na produkcji to dziś **R-17**, kursy
> zostają przy R-16 (starsze, cytowane w ADR-012/013).
>
> **Bramki: 203/203 testów API** (było 182), **17/17 e2e** (było 16), lint, typecheck, build.
> Backup prod przed wdrożeniem: `portal-20260814-170916.sql.gz`.
>
> **⚠️ DO WIADOMOŚCI: konta testowe usuwane przyciskiem zostawiają ślad z definicji.**
> `anonymizeAccount` działa W MIEJSCU (wiersz zostaje, PII znika), więc po każdym takim
> przejściu w bazie jest wiersz `deleted-*@deleted.invalid`. **Licząc „ilu realnych
> użytkowników", odfiltruj tę domenę** — inaczej wróci mina „konta testowe liczone jako
> realni użytkownicy".

> **✅ S17 DOMKNIĘTY — punkty 3–4 (2026-08-14): „Zakładki i moderatorzy grup"**
> (`3cdf582`, `c69e64f`). Wdrożone na staging i **produkcję**, przejrzane na żywo
> kontami testowymi (skasowane po sobie).
>
> **Zakładki.** Prywatna półka „na później" nad OBIEMA tabelami treści; właścicielem jest
> `social`, dokładnie jak przy tematach. Klucz złożony `(userId, subjectType, subjectId)`
> daje idempotencję za darmo; polimorf świadomie BEZ klucza obcego na treść — odczyt
> filtruje treść usuniętą i ukrytą, więc wiszący wiersz jest niewidoczny i tani.
> **ADR-010 pilnowany testem, nie deklaracją:** suita czyta SUROWE ciała pięciu odpowiedzi
> i sprawdza, że nie ma w nich liczby zapisań — asercja na kształt obiektu przepuściłaby
> pole dołożone kiedyś „bo się przyda".
> **ANTY-MLM:** zapisanie do zakładek nie emituje ŻADNEGO zdarzenia (jak
> `identity.updateOnboarding`). Ścieżka strażnika rozszerzona o ten krok, ale asercja jest
> ODWROTNA niż przy cytowaniu: porównujemy zbiór typów zdarzeń przed i po, bo pilnujemy
> CISZY, a ciszy nie da się sprawdzić przez `toContain`.
>
> **Moderatorzy grup.** RBAC (`GroupMembership.role`) istniał od Sprintu 4, ale używała go
> WYŁĄCZNIE akceptacja wniosków; `GroupMemberStatus.BANNED` stał nieużywany. Doszły: skład
> grupy (tylko dla moderatora — publiczna lista nazwisk to dane o ludziach, nie treść),
> awans/degradacja z powiadomieniem, wyproszenie, ukrycie posta, przypięcie.
> Degradacja i wyproszenie OSTATNIEGO moderatora → 409. Ukrycie ma JEDNĄ implementację
> (`hideGroupPost`) dla moderatora grupy i platformy — wzorzec `takeDownSocialPost`.
> Przypinamy POST, nie wątek Q&A (uzasadnienie w SPRINTY-S15-S19), najwyżej jeden na grupę,
> wykluczony z listy chronologicznej na WSZYSTKICH stronach — inaczej wypłynąłby ponownie
> przy kursorze.
>
> **🔴 ZASTANY BRAK, znaleziony dopiero przy przechodzeniu na żywo: `POST /groups` NIE MIAŁA
> ŻADNEGO WEJŚCIA W UI.** Trasa z bramką poziomu 2 i testami istniała od Sprintu 4; grupę
> dało się założyć wyłącznie curl-em. Dlatego produkcja miała 10 grup — wszystkie systemowe
> z seeda, 57 członkostw i **ZERO moderatorów** (grupa systemowa nie ma założyciela).
> Bez `/grupy/nowa` cały punkt 4 byłby funkcją, do której nikt nie ma jak dojść. Dodatkowo
> moderator PLATFORMY może teraz nadać rolę moderatora w każdej grupie — wąsko i celowo,
> żeby grupy systemowe miały jak dostać pierwszego gospodarza (wyproszenie i ukrywanie
> zostają u moderatora grupy; platforma ma `/panel/moderacja` ze śladem w ModerationCase).
>
> **🔴 ZASTANY BŁĄD 1: `SiteHeader` NIGDY nie czytał sesji** — zalogowany widział na każdej
> stronie „Zaloguj się / Dołącz". Zgłoszone przy S12 jako „bardzo mylący papierek", otwarte
> do dziś. Sesję czyta teraz hook kliencki (`lib/use-session.ts`), NIE layout: `serverApi`
> czyta cookies, więc odczyt w root layoucie uczyniłby dynamiczną każdą stronę, łącznie
> z landingiem i regulaminem (sprawdzone: 14 tras nadal prerenderuje się statycznie).
> Do rozstrzygnięcia slot zostaje pusty — nagłówek, który przez pół sekundy milczy, jest
> lepszy niż taki, który przez pół sekundy kłamie.
>
> **🔴 ZASTANY BŁĄD 2:** feed miał na sztywno `initialActive={false}` przy „Doceniam", więc
> docenione wpisy wyglądały na niedocenione, a ponowne kliknięcie kasowało własne docenienie.
>
> **Nowe miny w [MINY.md](MINY.md):** trasa API bez wejścia w UI, `waitFor` nie odświeży
> strony renderowanej na serwerze, `waitForURL(/regex/)` łapie też adres bieżący, `.first()`
> w liście, w której akcja zmienia liczbę kontrolek (odebrałem sobie moderację).
>
> Bramki: **182/182 testów API** (było 170), **16/16 e2e** (było 15), lint, typecheck, build.
> Migracja expand-only: nowa tabela `bookmarks`, nowy enum, `posts.pinnedAt` + indeks.
> Backup prod przed migracją: `portal-20260814-123451.sql.gz`.
>
> **⚠️ DO WIADOMOŚCI WŁAŚCICIELA:** na produkcji jest konto `kuchar21ski@gmail.com`
> („Macix", 13.08 wieczorem) — z profilem Lidera, bez potwierdzonego adresu, bez treści.
> Nie jest moje i nie usuwam go. Jeśli to nie Ty, **to pierwszy realny użytkownik Portalu**
> i wtedy decyzja o danych demo (R-17) przestaje być hipotetyczna.

> **✅ S17 — punkty 1–2 (2026-08-14): „Tematy i obrazy w grupach"** (`a5cfdf0`).
> Wdrożone na staging i **produkcję**, dane demo przesiane z tematami.
>
> **Tematy (#hashtagi).** Własny model `Topic` — świadomie NIE współdzielony z `Tag`
> z modułu listings: tag przy usłudze to deklaracja sprzedawcy o kategorii oferty,
> temat we wpisie to swobodne słowo w rozmowie; zlanie ich oznaczałoby, że „popularne
> tagi" w katalogu usług zaczynają mieszać kategorie ofert z tematami dyskusji.
> Właścicielem jest moduł `social`: tematy wydobywa TEN SAM konsument, który buduje oś
> aktywności (`onSocialPostPublished` / `onPostPublished`) — jedno miejsce, w którym
> „opublikowana treść" zamienia się w to, co widać w nawigacji.
> Strona `/tematy/[slug]` jest CHRONOLOGICZNA (ADR-010) i łączy wpisy portalowe
> z postami w grupach: dla czytelnika „#HR" to jedna rozmowa. Ranking wyłącznie dla
> etykiet (chipy na feedzie), nigdy dla treści.
> Po co to, skoro jest wyszukiwarka: `innodb_ft_min_token_size` = 3, więc „HR", „AI"
> i „UX" NIGDY nie wejdą do FULLTEXT — temat jest jedyną drogą do tych rozmów.
>
> **Obrazy w postach grupowych.** `PostImage` wzorowany na `SocialPostImage`; odczyt
> dla całej strony listy jednym zapytaniem (N+1 na tym widoku nie widać w testach,
> tylko na produkcji). Duplikacja uploadu usunięta — wspólny `lib/use-image-upload.ts`
> i `components/image-picker.tsx` dla obu formularzy.
>
> **Błąd czasu wykonania złapany po drodze:** `SOCIAL_POST_MAX_IMAGES` było zdefiniowane
> NIŻEJ niż jego pierwsze użycie w tym samym module kontraktów, a `const` nie jest
> hoistowany — schemat wywracałby moduł na starcie. Stała przeniesiona do sekcji wspólnej.
>
> **ANTY-MLM:** ścieżka w `antimlm.integration.test.ts` rozszerzona o wpis z tematem,
> z tego samego powodu co wcześniej o cytowanie — test strzeże wyłącznie tego, przez co
> realnie przeszedł.
>
> Bramki: 170/170 testów API (było 157), 15/15 e2e, lint, typecheck, build.
> Migracja expand-only: 4 nowe tabele, zero zmian w istniejących kolumnach.

> **✅ SESJA S15 + S16 (2026-08-13, wieczór): „Pierwsza mila i portal pełen życia"**
> (`5c03258`, `e30e05b`, `5e18ed5`). Wdrożone na staging i **produkcję**.
> **▶ NASTĘPNY KROK: S17 w [SPRINTY-S15-S19.md](SPRINTY-S15-S19.md)**, prompt startowy:
> [PROMPT-STARTOWY-OPUS.md](PROMPT-STARTOWY-OPUS.md).
>
> **🔴 SPROSTOWANIE, KTÓRE MUSI TU STAĆ NA WIERZCHU.** Ten dokument twierdził, że poczta
> jest „ZROBIONA 13.08, zweryfikowane na produkcji dla rejestracji i resetu". Zweryfikowane
> było WYŁĄCZNIE to, że e-mail wychodzi (`mail.sent` w logu). **Nikt nie kliknął linku.**
> Właściciel kliknął — i dostał 404. Okazało się, że nie istniały ANI `/weryfikacja`,
> ANI `/reset-hasla`, a `/logowanie` nie miało nawet linku „nie pamiętam hasła".
> Front nie wołał ŻADNEGO z trzech gotowych endpointów auth. „Martwy reset hasła",
> odhaczony jako zamknięty bloker pierwszej mili, był otwarty przez cały czas — przesunął
> się z „mail nie wychodzi" na „mail prowadzi donikąd".
> **Lekcja do zapamiętania: „backend gotowy" ≠ „funkcja działa". Jeśli funkcja ma ścieżkę
> użytkownika, trzeba ją PRZEJŚĆ.**
>
> **S15 — pierwsza mila.** Dodane `/weryfikacja`, `/reset-hasla`, `/nie-pamietam-hasla`,
> link na logowaniu, baner potwierdzenia adresu + `POST /auth/resend-verification`
> (bez tego po wygaśnięciu tokenu jedyną drogą było drugie konto na ten sam adres).
> Nowy `e2e/email-flows.spec.ts` przechodzi obie ścieżki końcem-końcem.
> Stan potwierdzenia czytamy z BAZY, nie z migawki sesji — sesja jest zamrożona przy
> logowaniu, więc baner oparty na sesji wisiałby po kliknięciu w link.
> **Błąd złapany przez ten nowy test, dotyczący też realnych użytkowników:** bramka
> anty-botowa odrzucała rejestracje z `TOO_FAST`, bo klient odliczał minimalny czas
> wypełniania formularza od WYSŁANIA żądania o wyzwanie, a serwer od jego UTWORZENIA —
> o całą latencję sieci później.
>
> **S16 — dane demo z warstwą społecznościową.** `seed-demo.ts` powstał przed modułem
> `social`, więc siał marketplace i Q&A, ale feed oraz grupy zostawały puste nawet na
> stagingu. Nowy `prisma/seed-demo-social.ts`: 13 wpisów (5 z obrazami, 2 z cytowaniem),
> 4 dyskusje w grupach, 18 obserwowań, reakcje. Obrazy rysowane u nas w SVG.
> Przechodzimy PRAWDZIWĄ ŚCIEŻKĄ KODU: obrazy przez `filesService.store()`, oś aktywności
> przez `socialService.onSocialPostPublished` (ten sam konsument co w workerze).
>
> **DECYZJA WŁAŚCICIELA: dane demo są na PRODUKCJI.** Zgłosiłem ryzyko (fikcyjni Liderzy
> z punktami vs obietnica ADR-004) — decyzja podtrzymana. Bezpieczniki: druga flaga
> `SEED_DEMO_ALLOW_PRODUCTION=1` i `--purge` zdejmujący komplet jedną komendą.
> Ryzyko zapisane jako **R-17** w [RISKS.md](RISKS.md).
>
> **🔴 ZASTANY BŁĄD INFRASTRUKTURY: staging pokazywał dane PRODUKCJI.** Staging i prod
> dzielą sieć Traefika `n8n_default`, a compose nadaje alias równy nazwie usługi — nazwa
> `api` istniała w obu projektach naraz i `portal-staging-web` rozwiązywał ją na kontener
> produkcyjny. Każda weryfikacja „na stagingu" mogła być weryfikacją produkcji.
> Naprawione aliasem `api-staging` + `ARG API_INTERNAL_URL` w `Dockerfile.web`
> (cel rewrite'u jest zapiekany w buildzie, więc sam runtime env by nie wystarczył).
> Produkcja była bezpieczna — tam `api` wskazuje jej własny kontener.
>
> **Stan produkcji:** 2 realne konta (właściciel + jedno pomyłkowe) + komplet danych demo.
> Bramki: 157/157 testów API, 15/15 e2e (było 12), lint, typecheck, build.

> **✅ PRZYROST S14 (2026-08-13, po S12): „Obrazy, cytowanie i twarz Firmy"**
> (`105c907`, `883975b`). Wdrożone na staging i **produkcję**, przejrzane na żywo.
> Właściciel poprosił o funkcje z X i marketplace'u; wybrałem takie, które pracują
> na wąskie gardło (pusty portal ma wyglądać żywo, Firma ma dać się sprawdzić),
> a nie tylko wydłużają listę.
>
> **Warstwa X:** obrazy przy wpisie (do 4) i „podaj dalej z komentarzem".
>
> - `FileKind.SOCIAL` dopisany NA KOŃCU enuma (MySQL trzyma enum jako liczbę
>   porządkową — wstawienie w środek przemapowałoby istniejące pliki).
> - Cytat cytatu SPŁASZCZA się do oryginału; usunięcie oryginału NIE kasuje
>   cudzego komentarza (`onDelete: SetNull` + jawne „wpis niedostępny").
> - Własność obrazu sprawdzana PRZED transakcją — cudzy identyfikator pliku
>   odbija się od walidacji, zamiast wyciec w feedzie (jest na to test).
> - **ANTY-MLM:** rozszerzyłem ścieżkę w `antimlm.integration.test.ts` o krok
>   cytowania i dodałem `expect(types).toContain('social.post_quoted')`. Bez tego
>   test byłby zielony przez POMINIĘCIE nowej funkcji.
>
> **Marketplace (dług z S11):** publiczny profil Firmy `/firmy/[id]` (staż,
> historia zleceń, oceny z OBU stron — jednostronna karta zachęcałaby do
> wybielania), `Company.nipVerifiedAt` + odznaka „NIP — suma kontrolna OK"
> (copy istotne prawnie: NIE „zweryfikowany"), `GET /listings/tags/popular`
>
> - chipy. Nazwa firmy na stronie zlecenia jest teraz LINKIEM.
>
> **🔴 ZASTANY BŁĄD ZNALEZIONY PRZY PRZECHODZENIU NA ŻYWO: uploady na produkcji
> zwracały 500.** Podkatalog miesięczny w wolumenie należał do `root`, a API
> działa jako `node` → EACCES. Dotyczyło WSZYSTKICH uploadów (awatary, portfolio),
> nie tylko nowych obrazów. Na stagingu ten sam katalog należy do `node`, więc
> rozjazd był wyłącznie produkcyjny i niewidoczny do pierwszej próby wgrania
> zdjęcia. Naprawione (chown) + dołożony SYGNAŁ: `filesService.checkWritable()`
> (realny zapis, nie `access()`), głośny log przy starcie i pole `uploads`
> w `/healthz` — informacyjne, poza `checks`, z tego samego powodu co puls workera.
>
> **⚠️ KOREKTA WCZEŚNIEJSZEGO WPISU: produkcja NIE MIAŁA 3 realnych kont.**
> Wszystkie trzy (`s8-test-…`, `final-…`, plus moje) to były konta testowe
> z poprzednich sesji, których nikt nie posprzątał. Usunięte razem z treściami.
> Zostało JEDNO konto: `asfsaf@gmail.com` (nazwa „HydroSpark Maps API Key") —
> prawdziwy gmail, wygląda na pomyłkową rejestrację właściciela. **Nie usuwam go
> bez decyzji.** Realnych użytkowników: zero. To nie zmienia diagnozy z roadmapy,
> tylko ją zaostrza.
>
> Bramki: 157/157 testów API na realnym MySQL/Redis (było 145), 12/12 e2e, lint,
> typecheck, build. Dwie migracje, obie expand-only. Backup prod przed migracją
> (`portal-20260813-132123.sql.gz`).

**Ostatnia aktualizacja:** 2026-08-13 · **Branch tej sesji:** `feat/s12-widziec-i-reagowac`
(oparty na `feat/s8-s11-kieszonkowa-drabina` — oba czekają na PR właściciela, `main` jest
starszy o obie gałęzie).
**Wykonawca:** Opus 5 (sesja S12) · **Stan:** 🟢 **PRODUKCJA PUBLICZNIE ŻYWA** na leadersofteams.pl
(certy LE, backup cron 03:45). **▶ NASTĘPNY KROK: S13 w [SPRINTY-S12-S15.md](SPRINTY-S12-S15.md)**
(dług z S11 + pierwsze wrażenie Firmy). Poprzednia roadmapa S8–S12: [SPRINTY-S8-S12.md](SPRINTY-S8-S12.md).

> **✅ SESJA S12 (2026-08-13): „Widzieć i reagować".** Jeden commit (`c4ec600`), wdrożony
> na staging **i na produkcję**, przeklikany na żywo kontami testowymi (usunięte po sobie
> — na prodzie zostały 3 realne konta, tyle co przed sesją).
>
> **Kolejność wdrożeń była INNA niż w roadmapie i to było celowe:** najpierw puls workera
> (bo przez resztę dnia wielokrotnie wdrażałem — martwy worker objawia się CISZĄ i kosztowałby
> godziny diagnozowania nie tego, co trzeba), potem analityka (jedyna rzecz, której nie da się
> nadrobić wstecz: niepoliczona odsłona przepada na zawsze), na końcu moderacja (największa,
> ale jej wartość jest „na żądanie", a przy ~0 kontach jest ~0 zgłoszeń).
>
> 1. **Moderacja przestała być ślepa** (bloker nr 1). `/panel/moderacja` pokazuje typ
>    zgłoszenia, fragment treści, autora, link „Otwórz zgłoszoną treść ↗" i akcję
>    **„Ukryj treść"**. Wzorzec `ModerationSubjectModule` (`modules/antifraud/subjects.ts`)
>    jest LUSTREM `AccountDataModule` z RODO — antifraud nie czyta cudzych tabel (ADR-002),
>    każdy moduł wnosi `moderation.ts` dla swojego typu.
>    - `SOCIAL_POST` → wspólny `takeDownSocialPost` (jedna implementacja dla usunięcia przez
>      autora i ukrycia przez moderatora; dwie kopie rozjechałyby się i zostawiły sierotę w feedzie),
>    - `POST` → `moderationStatus=HIDDEN` + **istniejące** zdarzenie `groups.post_deleted`,
>      które `social` już konsumuje (zero nowych typów zdarzeń),
>    - `THREAD` → nowe `hiddenAt` (jedyna migracja, expand-only). Ukrycie odcina TAKŻE
>      akceptację odpowiedzi i głosowanie — inaczej moderator zdejmowałby treść, a farmienie
>      punktów szłoby dalej, czyli akcja byłaby kosmetyką. Q&A to jedyna punktowana ścieżka
>      społeczna, więc to tam skoncentruje się nadużycie,
>    - `ORDER` → **świadomie BEZ ukrywania**: zlecenie to umowa dwóch stron, nie publiczna treść.
>      Ukrycie zerwałoby pracę ludziom, którzy nie są przedmiotem zgłoszenia.
>      Akcje rozdzielone: `RELEASE`/`REJECT` (punkty) i `HIDE`/`DISMISS` (treść); akcja punktowa
>      na sprawie bez punktu daje teraz 400 zamiast po cichu zamykać sprawę.
> 2. **Puls workera.** `portal:worker:heartbeat` + healthcheck w compose prod i staging.
>    **Puls jest odnawiany TYLKO gdy obraca się pętla dispatchera** (`lastLoopAt`) — zwykły
>    `setInterval` dowodziłby jedynie, że proces istnieje, i świeciłby na zielono przy
>    zakleszczeniu, czyli przy dokładnie tej awarii, którą ma łapać. `/healthz` raportuje puls
>    INFORMACYJNIE, bez wpływu na 200/503: gdyby śmierć workera czerwieniła api, Traefik
>    wyrzuciłby zdrowe api z puli i awaria kolejki stałaby się awarią portalu.
>    Zweryfikowane próbą awarii na stagingu (SIGSTOP z hosta → `unhealthy` po ~170 s → `kill -CONT`
>    → `healthy` w < 45 s).
> 3. **Analityka za 0 zł**, bez cookies i bez danych osobowych. Odsłony w Redisie (35 dni),
>    ale **rejestracje i publikacje liczone z BAZY** po `createdAt` — odejście od planu, bo
>    licznik byłby drugim, gorszym źródłem prawdy. Biała lista ścieżek w `shared/analytics.ts`
>    to bariera pamięciowa, nie kosmetyka: bez niej bot skanujący tysiąc adresów tworzy tysiąc
>    pól w dobowym hashu. Podgląd `/panel/analityka`. Zweryfikowane na prodzie przez Traefika.
>    Świadomie bez unikalnych użytkowników (wymagałyby haszowania IP).
> 4. **Anty-bot — WŁASNA bramka zamiast Cloudflare** (`747b180`, dodane po decyzji właściciela
>    w trakcie sesji: „Wykluczam Cloudflare, minimalizujemy dostawców po API").
>    `shared/humancheck.ts` — proof-of-work na naszym Redisie, **włączony domyślnie**
>    (Turnstile bez kluczy stał wyłączony, więc de facto nigdy nie chronił produkcji).
>    Mechanizm: serwer losuje sekretną liczbę i podaje `sha256(salt+n)`, przeglądarka
>    szuka `n` licząc od zera, serwer porównuje liczbę i KASUJE wyzwanie (`GETDEL`, atomowo).
>    - **Wariant „zgadnij liczbę", nie „N zer z przodu"** — praca jest ograniczona z góry.
>      Przy zerach czas rozwiązania ma długi ogon, a za pechowe losowanie płaci CZŁOWIEK
>      ze słabym telefonem, nie atakujący z serwerownią.
>    - **Parametry z pomiaru:** `crypto.subtle` w Chromium na tym VPS robi ~112 tys. hashy/s
>      (ręcznie napisany synchroniczny SHA-256 ~143 tys./s — 28% szybciej, ale nie warto
>      utrzymywać własnego prymitywu kryptograficznego dla ułamka sekundy). `maxNumber`
>      40 000 → ~0,2 s na laptopie, ~1,3 s na słabym telefonie, liczone W TLE podczas
>      wypełniania formularza, więc użytkownik czeka 0 s.
>    - Warstwy poza samym PoW: jednorazowość wyzwania, minimalny czas wypełniania (2 s),
>      pole-pułapka, **eskalacja kosztu po IP** (×2/×4/×16 w oknie godziny — tego Turnstile
>      nie dawał nam wcale, bo licznik był po jego stronie).
>    - **Uczciwie o skuteczności:** PoW nie rozpoznaje człowieka, tylko podnosi koszt próby.
>      Zatrzyma pętlę curl-a i gotowy skrypt, nie zatrzyma solvera w C. Realną barierą
>      pozostają limity świeżego konta, weryfikacja e-maila i moderacja treści.
>      **Przy okazji usunięte Brevo** — martwy kod drugiego dostawcy po API (SMTP zawsze miał
>      pierwszeństwo). **Portal nie odpytuje już ŻADNEGO zewnętrznego API** poza SMTP własnej
>      skrzynki, którego zastąpić się nie da (własny serwer pocztowy = świeże IP = spam-folder).
>
> **Naprawione po drodze — wszystko ZASTANE, potwierdzone przed zmianą:**
>
> - **W całej aplikacji nie było ANI JEDNEGO linku do `/panel/moderacja`.** Moderator musiał
>   znać adres na pamięć, więc zgłoszenie mogło czekać tygodniami nie dlatego, że ktoś je
>   zignorował, tylko dlatego, że nie miał jak się o nim dowiedzieć. Panel ma teraz sekcję
>   „Moderacja" z licznikiem otwartych spraw (widoczną tylko dla MODERATOR/ADMIN).
> - **Moduł `antifraud` nie miał ANI JEDNEGO testu** — jedyny taki moduł. Ma 6.
> - **Staging: `worker` nie dostawał zmiennych SMTP**, choć `api` ma je od dawna. Dokładnie
>   ta pułapka, przed którą ostrzega runbook: „działa przy rejestracji, milczy w tle" (digest).
> - **`/prywatnosc` §4 twierdziła, że nie korzystamy z zewnętrznych dostawców poczty** i obiecywała
>   aktualizację PRZED włączeniem. SMTP ruszył 13.08 i sekcja została nieaktualna — dopisany
>   Hostinger jako procesor + opis własnej statystyki. ⚠️ To copy prawne: warto, żeby przeczytał
>   je prawnik razem z resztą R-10/R-15.
> - **`Dockerfile.web` nie miał `ARG` na `NEXT_PUBLIC_TURNSTILE_SITE_KEY`** — backend Turnstile
>   był gotowy, ale klucz publiczny NIE MIAŁ JAK trafić do obrazu, więc „kod gotowy, brakuje
>   tylko kluczy" było nieprawdą. Dodałem przelot, a kilka godzin później **usunąłem go razem
>   z całym Turnstile** (decyzja właściciela o wykluczeniu Cloudflare). Zostawiam ten wpis,
>   bo wnioskiem nie jest ARG, tylko to, że deklaracja gotowości nie została nigdy sprawdzona
>   końcem-końca. Własna bramka nie ma klucza publicznego, więc problem zniknął u źródła.
> - **Prod `web` nie miał healthchecku** (staging miał) — dodany, prod ma komplet `(healthy)`.
>
> **⚠️ PUŁAPKA, na którą wpadłem i którą trzeba znać:** rola użytkownika jest ZAMROŻONA
> w migawce sesji w Redisie, nie czytana z bazy przy żądaniu. Nadanie komuś roli MODERATOR
> `UPDATE`-em **nie działa, dopóki ta osoba się nie przeloguje** — do tego czasu widzi 403.
> Kosztowało mnie 5 czerwonych testów, zanim to zrozumiałem.
>
> **⚠️ ZNALEZIONE, ŚWIADOMIE NIETKNIĘTE (kandydat na S13):** `SiteHeader` **nigdy** nie czyta
> sesji — zalogowany użytkownik na każdej stronie widzi w nagłówku „Zaloguj się / Dołącz".
> Widać to na zrzutach z tej sesji. Nie ruszałem, bo to globalny komponent poza zakresem S12,
> ale dla pierwszych dwudziestu osób to bardzo mylący papierek.
>
> **Bramki:** 149/149 testów API na realnym MySQL/Redis (było 132 — liczba WYKONANYCH, nie
> pominiętych), 12/12 e2e, lint z granicami modułów (`analytics` dopisany do `API_MODULES`
> razem z modułem, nie po fakcie), typecheck, build. Jedna migracja, expand-only. Zrzuty
> 390 i 1440 px trzech widoków. Backup bazy prod zrobiony PRZED migracją
> (`portal-20260813-091331.sql.gz`).

> **✅ SESJA S8–S11 (2026-08-13): „Kieszonkowa Drabina".** Cztery przyrosty, każdy osobno
> zweryfikowany bramkami, wdrożony na staging i **na produkcję**, i przeklikany na żywo
> kontem testowym. Gałąź `feat/s8-s11-kieszonkowa-drabina` (PR tworzy właściciel — brak `gh`).
>
> 1. **S8 mobile/PWA** (`9e7de16`) — dolny pasek 5 slotów pod kciuk (Feed · Usługi · [+] ·
>    Powiadomienia · Panel), arkusz akcji twórczych na natywnym `<dialog>`, własna rodzina ikon
>    SVG (koniec z emoji w headerze), `manifest.webmanifest` + ikony maskable + service worker
>    - `/offline`, tabela progów Drabinki jako karty na mobile, cele dotyku ≥ 44 px.
>      **SW świadomie minimalny:** `/api/*` NIGDY nie trafia do cache, nawigacje network-only —
>      każda strona jest SSR-owana z ciasteczkiem sesji, więc cache HTML = czyjś panel u kogoś innego.
> 2. **S8 społeczność X-lite** (`b1580dd`) — wpis portalowy (`SocialPost/Comment/Reaction`),
>    kompozytor na `/feed`, zakładki „Obserwowani | Cała społeczność" (ta druga **publiczna dla
>    gościa**), „Doceniam", komentarze 1 poziom, permalink `/wpisy/[id]` z kartą OG, wzmianki
>    `@handle` prowadzące do wpisu, udostępnianie przez Web Share API.
> 3. **S9+S10 wnętrze i pierwsza mila** (`a57fad9`) — panel jako „baza wspinacza" z pionową
>    szyną 7 szczebli, checklist „Zacznij tutaj" (odhaczony krok GAŚNIE), profil jako credential
>    - „Udostępnij swój poziom", 5 własnych ilustracji SVG w pustych stanach, kreator `/start`
>      (3 kroki, pomijalny; rejestracja przekierowuje tam zamiast do panelu).
> 4. **S11 szukanie i zaufanie** (`e4013cc`) — globalna wyszukiwarka (`/szukaj` z zakładkami
>    i licznikami, pole w headerze działa bez JS), `shared/fulltext.ts` przenosi MATCH…AGAINST
>    na BOOLEAN MODE z prefiksami i **ożywia dwa martwe indeksy** (`threads`, `social_posts`),
>    walidacja sumy kontrolnej NIP offline, porównywarka pakietów bez JS (`:has()`).
>
> **ANTY-MLM — dowód, nie deklaracja.** Cała nowa warstwa (wpisy, komentarze, doceniam,
> obserwowanie, wzmianki, onboarding, wyszukiwanie) jest poza punktacją, a pilnują tego testy
> STRUKTURALNE: `social/antimlm.integration.test.ts` przechodzi pełną ścieżkę społeczną, zbiera
> WSZYSTKIE zdarzenia z outboxa, asertuje że lista jest niepusta (inaczej test zieleniłby się
> z niewłaściwego powodu) i że żadne z nich nie jest kluczem w `ladderSubscriptions`.
> `identity.updateOnboarding` nie emituje ANI JEDNEGO zdarzenia — brak zdarzenia to brak drogi
> do laddera, czyli zabezpieczenie z architektury, nie z regulaminu.
>
> **Naprawione po drodze (wszystko zastane, potwierdzone na czystym `main`):**
>
> - **e2e ścieżki krytycznej było CZERWONE.** Helper `submitReview` uznawał sukces po ZNIKNIĘCIU
>   pola oceny, a element nieobecny w trakcie nawigacji też jest „ukryty" — meldował sukces, choć
>   ocena nie poleciała, i test padał kilka kroków dalej, w miejscu niezwiązanym z przyczyną.
>   Sygnałem sukcesu jest teraz LOKATOR pozytywnego śladu. Uwaga: fraza „Oceny publikują się
>   symultanicznie" stoi w opisie samego formularza, więc `getByText(/Oceny/)` to ta sama pułapka.
> - **`infra/e2e.sh` zostawiał sieroty.** Trap zabijał opakowanie `pnpm`, ale nie `next-server`;
>   proces zostawał na porcie 3000, a kolejny przebieg — nic o tym nie wiedząc — testował
>   POPRZEDNI build. Objaw: lawina niezrozumiałych czerwonych testów. Teraz procesy startują
>   przez `setsid`, giną całymi grupami, a skrypt sprawdza porty na wejściu i staje z komunikatem.
> - **`groups.deletePost` zostawiał sierotę w feedzie** (usunięty post wisiał na osi aktywności
>   z dawnym tytułem i linkiem w 404) → zdarzenie `groups.post_deleted` konsumowane przez `social`.
> - **Bramka `format:check` była czerwona na `main`** (42 pliki) — wyprostowane osobnym commitem
>   `894cf00`, żeby diff sprintu został czytelny.
>
> 5. **✅ S12 częściowo: POCZTA NA WŁASNEJ SKRZYNCE** (`d4c9230`) — nie było potrzeby
>    zewnętrznego dostawcy. Portal wysyła przez `smtp.hostinger.com` na koncie
>    `kontakt@leadersofteams.com`, czyli tę samą skrzynkę, której od dawna używa App;
>    jest opłacona w ramach hostingu domeny. `shared/mail.ts` ma transport SMTP
>    (nodemailer) z PIERWSZEŃSTWEM przed Brevo, który zostaje jako opcja pod przyszły
>    masowy digest. **To zamknęło najpoważniejszy bloker pierwszej mili:** do 13.08
>    reset hasła po cichu nic nie robił, więc osoba, która zapomniała hasła, nie miała
>    żadnej drogi powrotu. Zweryfikowane na produkcji (`mail.sent`, `transport: smtp`)
>    dla rejestracji i resetu; konto testowe usunięte.
>    ⚠️ `MAIL_FROM` musi równać się `SMTP_USER` — nadawca z innej domeny nie przejdzie
>    SPF/DMARC. Dlatego prod ma `kontakt@leadersofteams.com`, nie `no-reply@leadersofteams.pl`.
>    ⛔ Świadomie NIE stawiamy serwera pocztowego na VPS (port 25 blokowany, świeże IP = spam).
>    Szczegóły i zmienne: [runbooks/sekrety.md](runbooks/sekrety.md).
>
> **⚠️ DŁUG Z TEJ SESJI — świadomie nieukończony, nie zapomniany (do S13):**
>
> - `Company.nipVerifiedAt` i odznaka „NIP — suma kontrolna OK" NIE weszły. Sama walidacja
>   DZIAŁA (błędny NIP → 400 przy tworzeniu firmy, testy w `shared/nip.test.ts`), ale nie ma
>   trwałego znacznika ani odznaki w UI — styl `.nip-badge` czeka nieużywany w `styles/search.css`.
> - `GET /listings/tags/popular` i chipy popularnych tagów NIE weszły. To nie kosmetyka:
>   frazy krótsze niż 3 znaki („HR", „IT", „AI") nigdy nie trafią do FULLTEXT, więc tagi są
>   jedyną drogą do tych kategorii.
> - **Panel moderacji jest ślepy na zgłoszenia** (dług zastany po D7, nie z tej sesji):
>   `/panel/moderacja` renderuje samą notatkę, bez `subjectType`, `subjectId` i linku do treści.
>   Moderator wie, że coś zgłoszono, i nie ma jak tego otworzyć. Naprawa: S12.
> - Poprawione tuż po sesji (`bd2f0e1`): zgłoszenie wpisu portalowego szło jako `POST`, czyli typ
>   posta w grupie → dodany osobny `SOCIAL_POST`; JSON-LD `SearchAction` wskazywał `/liderzy?q=`
>   zamiast `/szukaj?q=`.
>
> **Bramki na koniec:** 132/132 testów API, 12/12 e2e, lint (z zaostrzonymi granicami modułów:
> `API_MODULES` uzupełnione o social/listings/files/search), typecheck, build. Trzy migracje,
> wszystkie **expand-only**. Weryfikacja na żywo na produkcji: rejestracja → kreator → panel →
> publikacja wpisu → materializacja przez workera → wyszukanie po prefiksie.

> **✅ SESJA S7 (2026-08-11/12): „Marketplace + Społeczność + Tożsamość".** Cztery przyrosty
> na gałęzi `feat/s7-produkt` (PR do main po stronie właściciela), wszystkie wdrożone i
> zweryfikowane na stagingu:
>
> 1. **Design system + brand** — logo SVG drabinki (bursztynowy szczebel = zdobyty status),
>    favicon, root OG + karty OG „credential" dla zleceń/grup/wątków/usług, tokeny
>    `--level-1..7` („im wyżej, tym cieplejsze światło") + `LevelBadge`, Bricolage Grotesque
>    (display), `components/ui/*`, loading/error/not-found, stopka, przebudowany landing
>    (tagline strategii, „Jak to działa", wizual 7 poziomów, FAQ). Fix: Inter bez latin-ext.
> 2. **Moduł `files`** — uploady obrazów (multipart+sharp, warianty webp thumb/full, EXIF
>    wycinany), awatary + zdjęcia portfolio, volume `portal_staging_uploads` (backup!).
> 3. **Moduł `listings` (Usługi, Fiverr-lite)** — katalog `/uslugi` z filtrami/sortem,
>    pakiety 1–3 z cenami DEKLARATYWNYMI (ADR-006), tagi, ulubione, zapytania z wątkiem
>    wiadomości i KONWERSJĄ w zwykły Order (punkty tylko przez istniejący cykl — test
>    negatywny w `ladder/subscriptions.test.ts`). Dług D8 domknięty (opinie na profilu).
> 4. **Moduł `social` (X-lite w duchu ADR-010)** — follow, chronologiczny `/feed`
>    („Wczytaj więcej", zero algorytmu, ZERO punktów), profile `@handle` (`/profil/[handle]`),
>    wzmianki @handle → powiadomienia, edycja/usuwanie własnych postów/komentarzy (soft delete).
>    DM świadomie NIE MA — kontakt przez zapytania o usługi i wątki ofert.
>
> Nowe migracje: `files_uploads`, `service_listings`, `social`. Deploy staging MUSI kończyć się
> `docker compose … run --rm migrate` (profil tools). Testy: 102/102 + e2e critical-path.
> Nagrody poziomów przepisane na Portal-native (po porzuceniu integracji) — landing, /drabinka,
> README, notka w ADR-010. Szkice /regulamin i /prywatnosc w repo (sekcje [DO UZUPEŁNIENIA]).

> **⛔ ZMIANA KIERUNKU (2026-07-20): integracja Portal↔App PORZUCONA.** Decyzją właściciela integracja
> (OIDC IdP, webhook `level.changed`, rekoncyliacja, „Zaloguj przez leadersofteams.pl") **nie będzie
> realizowana**. Dokumenty oznaczone: [ADR-003](architecture/adr/ADR-003-integracja-oidc-level-sync.md) (SUPERSEDED),
> [INTEGRATION-APP-PORTAL.md](architecture/INTEGRATION-APP-PORTAL.md) (porzucone), Faza 2 w [ROADMAP](ROADMAP.md),
> R-05/R-09 w [RISKS](RISKS.md). **Konsekwencja:** moduł Zespołów (ADR-010) zakładał integrację — wymaga
> przeprojektowania jako funkcja wyłącznie Portalu albo rezygnacji (decyzja właściciela).

> **Przebieg konsolidacyjny (2026-07-20):** higiena git (gałąź `growth/g1-seo-discoverability` wypchnięta,
> `main` zsynchronizowany), Sprint 4.5 domknięty w ROADMAP, tabela statusów 16 ryzyk w RISKS,
> healthcheck `web` w staging compose (worker udokumentowany — wymaga heartbeatu), nowy
> [GO-LIVE-CHECKLIST.md](GO-LIVE-CHECKLIST.md), [RUNBOOK-COMPOSE.md](RUNBOOK-COMPOSE.md). Go-live NIE wykonany
> — to osobna sesja z osobną zgodą (DNS cutover u rejestratora po stronie właściciela).

> **⚠️ Dryf dok↔kod naprawiony 2026-07-12:** ten dokument opisywał Sprint 5 jako „następny do zrobienia".
> W rzeczywistości moduł `community` był już w `main` (zmergowany PR #8 `claude/lot-portal-sprints-5-9-*`) —
> tylko wskaźnik sprintu nie został zaktualizowany. Zweryfikowano end-to-end: 73 testy zielone (11 community
>
> - anty-MLM `subscriptions`), lint/typecheck/build czyste. **Nie odtwarzać Sprintu 5.** Realny następny
>   przyrost to Sprint 4.5 (niżej), po nim Sprint 6.

Ten dokument jest **jedynym punktem startu** dla kontynuacji prac. Czytaj w kolejności:

1. [Brief kontekstowy](../brief-leadersofteams-platforma.md) — rozstrzygnięcia biznesowe (nienaruszalne),
2. [OVERVIEW architektury](architecture/OVERVIEW.md) + ADR-y 001–013,
3. [Strategia różnicowania i wzrostu](strategy/DIFFERENTIATION-AND-GROWTH.md) — model Trzech Płaszczyzn (anty-MLM), Academy, polecenia (ADR-011/012/013),
4. ten dokument (stan + sprinty),
5. [ROADMAP](ROADMAP.md) i [RISKS](RISKS.md).

> **Uwaga o branchu (2026-07-11):** praca Sprintu 4 + strategia jest w `main`. Sesja deploy+design
> (poniżej §0) siedzi na `fix/api-tsup-noexternal-workspace` (oparta o `main`) — **do zmergowania do
> `main` w Sprincie 4.5**, potem Sprint 5 z nowej gałęzi. PR tworzy właściciel (brak `gh` na VPS).

---

## 0. Ostatnia sesja (2026-07-11) — deploy staging, fixy runtime, redesign, plan integracji

Wykonane i zweryfikowane w przeglądarce na `https://staging.leadersofteams.pl` (za basic-auth):

- **Deploy STAGING** na VPS (obok App i Zodiamo): `/docker/portal-staging`, projekt compose
  `portal-staging`, sieć Traefika `n8n_default` + resolver `mytlschallenge` (override
  `infra/staging.override.yml`, niecommitowany). Wdrożenie **ręczne** — auto-deploy CI świadomie
  NIE uzbrojony.
- **3 bugi repo (blokowały też produkcję/CD) — naprawione i wypchnięte:**
  1. `apps/api/tsup.config.ts` → `noExternal: [/^@lot\//]` (bez tego prod Node pada
     `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` na `@lot/contracts`).
  2. `infra/Dockerfile.web` → `ENV API_INTERNAL_URL=http://api:3001` przed buildem (cel rewrite'u
     `/api/*` jest zapiekany w build-time; bez tego web proxował do `localhost:3001` → wszystkie /api 500).
  3. `apps/web/next.config.ts` → `skipTrailingSlashRedirect` + dokładna reguła rewrite `/api/socket.io/`
     (Next gubił końcowy ukośnik → handshake Socket.IO 404/500).
- **Redesign UI/UX + responsywność (mobile + hamburger)**: `apps/web/app/globals.css` przebudowany
  w duchu design-systemu App (indigo/Inter/tokeny) + atmosfera/gradienty/hover-lift; `SiteHeader`
  (`apps/web/components/site-header.tsx`) z menu mobilnym; typografia treści (h2/h3/listy/tabele).
  Zweryfikowane desktop+mobile (390px, headless Chromium): home, zlecenia, drabinka, formularze,
  panel zalogowany. Auth/rejestracja działają E2E (register 201, /auth/me 200).
- **Plan strategiczny**: roadmapa sprintów + **architektura integracji App↔Portal** (patrz nowy
  `docs/architecture/INTEGRATION-APP-PORTAL.md`) + mapa funkcji ekosystemu.

**Dług z tej sesji do domknięcia (Sprint 4.5):** merge gałęzi → `main`; **seed danych demo** (pusta
tabela poziomów w `/drabinka`, przykładowe zlecenia/grupy — `apps/api/prisma/seed.ts`); `openssl`
w `Dockerfile.api` (ostrzeżenie Prisma); usunięcie kont testowych z bazy staging; decyzja o
**prod-VPS** (osobny/większy — 8 GB nie udźwignie 3. bazy MySQL + App pod ruchem).

**Sprint 4.5 — postęp (2026-07-12):** ✅ weryfikacja bramek na realnym MySQL/Redis (73 testy, lint,
typecheck, build — potwierdzenie zmergowanego Sprintu 5); ✅ `openssl`+`ca-certificates` w obu
warstwach `infra/Dockerfile.api`; ✅ reconciliacja docs (ten plik + ROADMAP). Kolejno: bogaty
**demo-seed** (`apps/api/prisma/seed-demo.ts`, env-guarded `SEED_DEMO=1`), uruchomienie seedów na
staging + czyszczenie kont testowych, deploy + e2e, przygotowanie merge → `main`.
**Decyzja właściciela o prod-VPS:** zostajemy na obecnym 8 GB, rewizja przy launchu (Sprint 6) —
wtedy twarde limity pamięci prod-MySQL w compose + pilnowanie swapu (4 G).

---

## 1. Stan projektu (co jest ZROBIONE i zweryfikowane)

| Etap                             | Commit    | Zakres                                                                                                                                                                                                                                                                                        |
| -------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architektura                     | `5ad095d` | 10 ADR-ów, model danych, roadmapa, rejestr ryzyk                                                                                                                                                                                                                                              |
| Faza 0 — fundament               | `a6e5a18` | monorepo pnpm, CI/CD (GitHub Actions → GHCR → SSH), infra compose prod/staging/dev, backupy, auth (argon2id, sesje Redis), outbox+worker BullMQ, runbooki                                                                                                                                     |
| Sprint 1–2 — marketplace         | `08a295e` | profile Liderów+portfolio, słownik branż, pełny cykl życia zleceń z blokadą optymistyczną, oferty z bramką `minLevel`, listing z FULLTEXT, frontend                                                                                                                                           |
| Sprint 2–3 — Drabinka            | `1836767` | oceny dwustronne (publikacja symultaniczna), append-only ledger `PointEvent`, ruleset v1, karencja 7 dni, malejące zwroty, detekcja wzajemności → HOLD → moderacja (RBAC), `/drabinka`, `/panel/punkty`                                                                                       |
| Sprint 4 — grupy + powiadomienia | `234d30a` | moduły `groups` (grupy OPEN/MODERATED od lvl 2, posty/komentarze/reakcje, feed kursorem) i `notifications` (konsumenci zdarzeń → in-app, dedupeKey); Socket.IO sygnał-only (ADR-007); dzwonek w headerze; `/grupy`, `/powiadomienia`; **test anty-MLM: aktywność w grupach = 0 `PointEvent`** |
| Strategia — kierunek             | `157522d` | model Trzech Płaszczyzn (anty-MLM), ADR-011 (polecenia — afiliacja 1-poziomowa), ADR-012 (Academy/kursy), ADR-013 (monetyzacja/płatności, rewizja ADR-006/009), aktualizacja ROADMAP/RISKS. **Same dokumenty — zero zmian kodu**                                                              |

**Jakość:** 55 testów (unit + integracyjne na realnym MySQL/Redis), lint z twardymi granicami modułów, typecheck strict, build produkcyjny, ręczne e2e każdego sprintu na zbudowanym API z realnym workerem. CI odpala wszystko na każdym pushu.

**Architektura w pigułce:** modular monolith (Fastify) z modułami `identity / marketplace / ladder / antifraud / groups / notifications` (+ zarezerwowane: `community / teams / integration` oraz zaprojektowane w ADR-011/012/013: `referral / academy / billing`); komunikacja przez outbox→BullMQ; realtime Socket.IO (sygnał-only, ADR-007); Next.js 15 SSR z rewrites do API (same-origin cookies); MySQL 8 + Redis 7; wszystko 0 zł (ADR-009, wyjątek: prowizje PSP przy monetyzacji — ADR-013).

**Kluczowe inwarianty (nie do naruszenia — patrz ADR-002/004/010):**

- import z modułu tylko przez `modules/<x>/index.ts` (lint to egzekwuje),
- `ladder` subskrybuje wyłącznie `marketplace.*`/`community.*` (test `subscriptions.test.ts`),
- zamknięty enum `PointEventType` — dodanie typu = migracja + rewizja ADR-004,
- ledger append-only; wszystkie skutki uboczne mutacji przez outbox w tej samej transakcji,
- każdy punkt wymaga uznania przez innego człowieka; zero punktów za aktywność w groups/teams.

## 2. Zidentyfikowany dług / luki (do domknięcia w najbliższych sprintach)

| #       | Luka                                                                                                                                                                                                                                                                                                                                                                                                                                          | Gdzie domknąć         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| ~~D1~~  | ✅ **ZROBIONE (Sprint 4)** — moduł `notifications` konsumuje zdarzenia → wpisy in-app + sygnał realtime                                                                                                                                                                                                                                                                                                                                       | —                     |
| ~~D2~~  | ✅ **ZROBIONE (Sprint 4)** — Socket.IO sygnał-only (pokój `user:{id}`, handshake sesyjnym cookie, Redis pub/sub)                                                                                                                                                                                                                                                                                                                              | —                     |
| ~~D3~~  | ✅ **ZROBIONE** — cache-aside Redis (`shared/cache.ts`, inwalidacja przez wersję namespace; `/me/ladder` NIGDY nie cache'owany). Test w `hardening.integration.test.ts`                                                                                                                                                                                                                                                                       | —                     |
| ~~D4~~  | ✅ **ZROBIONE (scaffolding)** — warstwa e-mail (`shared/mail.ts`): realny transport Brevo + fallback no-op; weryfikacja adresu, reset hasła (flow `verify-email`/`request-password-reset`/`reset-password`). **AKTYWOWANE 2026-08-13** — własna skrzynka SMTP, nie Brevo (patrz sesja S8–S11 pkt 5 i `runbooks/sekrety.md`). Digest powiadomień: do dołożenia (S13)                                                                           | ✅ aktywne            |
| ~~D5~~  | ✅ **ZROBIONE** — e2e Playwright ścieżki krytycznej (ADR-008): rejestracja→firma→zlecenie→oferta→przyznanie→cykl→obustronna ocena→punkty, 2 aktorów, przeglądarkowo (`apps/web/e2e/critical-path.spec.ts`, runner `infra/e2e.sh`). **Złapał realny bug prod:** `apiFetch` słał `content-type: application/json` przy pustym body → Fastify odrzucał WSZYSTKIE akcje bez body (publikuj/akceptuj/start/…) — naprawione w `apps/web/lib/api.ts` | —                     |
| ~~D6~~  | ✅ **ZROBIONE** — RODO: `DELETE /me` = anonimizacja w miejscu (ledger ZACHOWANY, treści `[treść usunięta]`, profil ukryty, sesja unieważniona) + `GET /me/export`. Test w `hardening`                                                                                                                                                                                                                                                         | —                     |
| ~~D7~~  | ✅ **ZROBIONE** — rate-limity świeżych kont (`shared/quota.ts`) + „zgłoś" (`POST /reports` → `ModerationCase` REPORT, soft-dedup) + **Turnstile flag-gated** (`shared/turnstile.ts`, wpięty w `/auth/register`, widget na `/rejestracja`; OFF bez kluczy). Aktywacja = klucze Cloudflare przy launchu                                                                                                                                         | — (aktywacja: launch) |
| D8      | Rating na profilu zlicza oceny wszystkimi kanałami poprawnie, ale brak listy „opinie o Liderze" na profilu                                                                                                                                                                                                                                                                                                                                    | niski priorytet       |
| ~~D9~~  | ✅ **CZĘŚCIOWO (2026-07-11)** — STAGING wdrożony i zweryfikowany na VPS (ręcznie, §0). Zostaje: **launch** — prod (decyzja: zostajemy na 8 GB z limitami RAM) + zdjęcie basic-auth                                                                                                                                                                                                                                                            | Launch                |
| **D10** | ❌ **GAP (opcjonalne)** — panel Bull Board (wgląd w kolejki) niewdrożony. **Po S12:** najostrzejszą potrzebę (czy worker w ogóle żyje) zaspokaja już puls + healthcheck, więc Bull Board zjechał w priorytecie                                                                                                                                                                                                                                | Sprint 6, opcjonalnie |
| ~~D11~~ | ✅ **ZROBIONE (S12)** — moderacja zgłoszeń z podglądem treści, linkiem i akcją „ukryj"; puls workera; analityka 0 zł (baner sesji S12 na górze)                                                                                                                                                                                                                                                                                               | —                     |
| **D12** | ❌ **NOWY (znaleziony w S12, nietknięty)** — `SiteHeader` nie czyta sesji: zalogowany użytkownik widzi „Zaloguj się / Dołącz" na KAŻDEJ stronie                                                                                                                                                                                                                                                                                               | S13                   |

> **Audyt stanu kodu vs docs (2026-07-12):** przy wejściu w Sprint 6 potwierdzono, że backend Sprintu 6
> jest w większości ZROBIONY i zielony (73 testy): cache-aside (D3), e-mail flag-gated + weryfikacja/reset
> (D4), RODO (D6), rate-limity + „zgłoś" (D7). To kolejny przypadek dryfu dok↔kod (jak Sprint 5) — PR #8
> „sprints-5-9" niósł istotnie więcej niż opisywały docs. **Realne, niezaimplementowane luki:** Turnstile,
> e2e Playwright (D5), load-test k6, Bull Board (D10), oraz aktywacja launchu (sekrety właściciela).

## 3. Rekomendowane kolejne kroki — plan sprintów dla Opus 4.8

Pracuj **sprint po sprincie**: jeden sprint = jeden spójny, zweryfikowany i wypchnięty przyrost. Po każdym sprincie: `pnpm lint && pnpm typecheck && pnpm test` (integracyjne na `infra/docker-compose.dev.yml`), `pnpm build`, ręczny e2e nowej funkcji na zbudowanym API, commit z opisem, push na branch roboczy.

> **▶ TU ZACZYNASZ: Sprint 4.5 (stabilizacja), potem Sprint 6.** Sprinty 4 i 5 są zamknięte (niżej, dla kontekstu wzorca — `groups`/`notifications`/`community` to wzorzec dla kolejnych modułów). Po Sprincie 6 (launch) wchodzą Faza 2 (integracja + `teams`, sprinty 7–9) i **Faza Academy + Monetyzacja** (moduły `billing → academy → referral`, ADR-011/012/013) — patrz [ROADMAP](ROADMAP.md).

### ✅ SPRINT 4 — Grupy branżowe + fundament powiadomień (`groups`, `notifications`) — ZROBIONE (`234d30a`)

Dostarczony i zweryfikowany (55 testów, e2e na zbudowanym API + workerem). Trzymaj ten moduł jako **wzorzec** dla kolejnych: `groups`/`notifications` powielają konwencję `marketplace`/`ladder` (index.ts jako publiczne API, serwisy z DI, zdarzenia przez `emitEvent` w transakcji, idempotentni konsumenci, testy przez `buildServer`+`app.inject`). Dispatcher workera obsługuje **wielu konsumentów na jeden typ zdarzenia** (`Record<string, EventHandler[]>`). Oryginalna specyfikacja poniżej — dla odniesienia.

Cel: warstwa „portal jak Facebook" (ADR-010 dec. 1) + zdarzenia przestają lecieć w próżnię.

1. **Prisma v4**: `Group` (industryId?, typ OPEN/MODERATED, createdById), `GroupMembership` (rola MEMBER/MODERATOR, status ACTIVE/PENDING/BANNED, unikat group+user), `Post` (typ DISCUSSION/CASE_STUDY/IDEA, `teamId` nullable — pod fazę 2, status moderacji), `Comment` (parentId 1 poziom), `Reaction` (unikat post+user), `Notification` (userId, typ, payload, readAt). Indeksy: `Post(groupId, createdAt)`, `Comment(postId, createdAt)`, `Notification(userId, readAt, createdAt)`. FULLTEXT na `Post(title, body)`. Seed grup systemowych (po jednej na branżę ze słownika).
2. **Moduł `groups`**: tworzenie grup od lvl 2 (przez `ladder.getLevel` — publiczne API), join/leave (PENDING dla MODERATED, akceptacja przez moderatora grupy), posty/komentarze/reakcja „doceniam", feed chronologiczny z paginacją kursorem (BEZ infinite scroll — ADR-010), listing grup. Zdarzenia outbox: `groups.post_published`, `groups.comment_added`, `groups.membership_requested/accepted`. **ŻADNEJ krawędzi do `ladder`.**
3. **Moduł `notifications`**: tabela + konsument zdarzeń (`marketplace.offer_submitted/accepted`, `marketplace.order_*`, `marketplace.review_published`, `ladder.level_achieved`, `groups.*`) → wpisy `Notification`; API `GET /me/notifications` + `POST /me/notifications/read`; badge w headerze.
4. **Frontend**: `/grupy` (listing), `/grupy/[id]` (feed + formularz posta + komentarze + reakcje + join/leave), `/grupy/[id]/post/[postId]`, dzwonek powiadomień w layoucie.
5. **Testy integracyjne**: cykl grupy (utworzenie od lvl 2 — odmowa dla lvl 0; join MODERATED z akceptacją; post/komentarz/reakcja; unikat reakcji), powiadomienia z realnych zdarzeń, **test anty-MLM: aktywność w grupach nie tworzy żadnego `PointEvent`**.

DoD: 55+ testów zielonych; feed grupy działa e2e na zbudowanym API; zero zdarzeń groups.* w subskrypcjach ladder.

### ✅ SPRINT 5 — Q&A/mentoring w grupach = druga ścieżka punktowania (moduł `community`) — ZROBIONE (w `main`, PR #8; zweryfikowany 2026-07-12)

Cel: domknięcie równowagi obu dróg awansu z briefu (3.3) — najważniejszy brakujący element produktu.
**Stan:** dostarczone i zmergowane do `main`; 11 testów integracyjnych community zielonych (akceptacja→50 pkt,
głos kwalifikowany/niekwalifikowany, malejące zwroty, czapka tygodniowa 300, awans obiema ścieżkami,
RECIPROCITY_QA→HOLD, RATE_LIMIT_QA→HOLD). Wartości ścieżki w `modules/ladder/rules.ts` (ruleset v1).
Frontend: `apps/web/app/grupy/[id]/pytania/` + `apps/web/app/watki/[id]/`. Specyfikacja poniżej — dla odniesienia.

1. **Prisma v5**: `Thread` (groupId, status OPEN/ANSWERED/CLOSED, FULLTEXT title+body), `Answer` (isAccepted — jedna per wątek), `AnswerVote` (unikat answer+user).
2. **Moduł `community`**: wątki w grupach, odpowiedzi, głos „w górę", akceptacja odpowiedzi przez autora pytania (nie można akceptować własnej odpowiedzi na własne pytanie ani głosować na siebie). Zdarzenia: `community.answer_accepted` (payload: answerId, answerAuthorUserId, questionAuthorUserId, groupId, accountAges…), `community.answer_upvoted` (payload z danymi głosującego: wiek konta, własna aktywność).
3. **Ladder — konsument ścieżki community** (rozszerzenie `modules/ladder`): `ANSWER_ACCEPTED` = 50 pkt bazowych; `ANSWER_UPVOTED_QUALIFIED` = 10 pkt za głos **kwalifikowany** (głosujący: konto ≥ 14 dni + ≥ 1 własna aktywność); malejące zwroty od tego samego uznającego (`counterpartyId` = userId uznającego, ta sama krzywa 0.5^n); **czapka tygodniowa** ścieżki community (start: 300 pkt/tydz. — realizuje „progres tygodniowy" z briefu; nadwyżka = wpis 0 pkt z wyjaśnieniem w meta). Wartości do rejestru w `rules.ts` (ruleset pozostaje v1 — to pierwsze wypełnienie zaprojektowanych typów, nie zmiana reguł).
4. **Antifraud**: kwalifikacja głosów + limit szybkości (max N punktowanych zdarzeń community dziennie → nadwyżka HOLD), wzajemna adoracja pary userów (A akceptuje B, B akceptuje A w krótkim oknie → FraudSignal RECIPROCITY_QA + HOLD).
5. **Frontend**: zakładka „Pytania" w grupie, wątek z odpowiedziami/głosami/akceptacją, sekcja Q&A w `/panel/punkty` (rozbicie ścieżek już jest).
6. **Testy**: akceptacja → 50 pkt PENDING; głos niekwalifikowany → brak punktów; kwalifikowany → 10 pkt; czapka tygodniowa; po dojrzeniu obu ścieżek `computeLevel` z wymogiem 20% od L4 działa na realnych danych; wzajemna adoracja → HOLD.

DoD: użytkownik może realnie awansować oboma ścieżkami; testy obu ścieżek + guardów zielone.

### SPRINT 6 — Hardening, bezpieczeństwo, launch (release `v0.1.0`) — W WIĘKSZOŚCI ZROBIONE (backend); otwarte: Turnstile, e2e, k6, launch

Stan po audycie 2026-07-12 (patrz §2). Backend hardeningu jest w większości dostarczony i zielony.

1. ✅ **E-mail (ADR-009)** — weryfikacja adresu i reset hasła (`shared/mail.ts` + flow). **Aktywne od 2026-08-13 przez WŁASNĄ skrzynkę SMTP** (`kontakt@leadersofteams.com`), a nie przez Brevo — zero nowego dostawcy i kosztu; Brevo zostaje jako alternatywa. **Otwarte:** dzienny digest (job w workerze, S13).
2. **Antybot/antyspam (R-03/R-13):** ✅ rate-limity świeżych kont (`shared/quota.ts`) + ✅ „zgłoś" (`POST /reports` → `ModerationCase` REPORT, soft-dedup) + ✅ **Cloudflare Turnstile flag-gated** (`shared/turnstile.ts`, fail-closed przy ON; `/auth/register` wymaga tokenu; widget na `/rejestracja` gdy `NEXT_PUBLIC_TURNSTILE_SITE_KEY`). Aktywacja: klucze Cloudflare przy launchu (`docs/runbooks/sekrety.md`).
3. ✅ **RODO (R-10)** — `DELETE /me` = anonimizacja w miejscu (ledger ZACHOWANY, `anonymizedAt`, treści `[treść usunięta]`, profil ukryty, sesja unieważniona); `GET /me/export`.
4. ✅ **Cache (ADR-007, D3)** — cache-aside Redis (`shared/cache.ts`) z inwalidacją przez wersję namespace; `/me/ladder` NIGDY nie cache'owany.
5. ✅ **E2E Playwright** (ścieżka krytyczna, ADR-008) ZROBIONE — `apps/web/e2e/critical-path.spec.ts`, runner `infra/e2e.sh` (stack lokalny: MySQL/Redis compose + api/worker tsx + web build produkcyjny; Chromium z cache). Odporny na wyścig hydracji (ponawialne kliknięcia). Do wpięcia w CI (ADR-008): krok `bash infra/e2e.sh`. ❌ **OTWARTE: load test k6** (500 równoczesnych) z wynikami w `docs/perf/`. **Uwaga:** k6 na współdzielonym 8 GB VPS ryzykuje kontencją z App-prod/Zodiamo — planować poza szczytem lub na osobnym celu; kamień decyzyjny właściciela.
6. ❌ **OTWARTE: Launch** — prod na obecnym 8 GB (decyzja właściciela) z twardymi limitami RAM MySQL + swap; staging → smoke → tag `v0.1.0` → produkcja za flagą; zdjęcie basic-auth; Netdata + Uptime Kuma; Bull Board (D10) za rolą ADMIN. Sekrety: `docs/runbooks/sekrety.md`.

DoD: staging działa na VPS (✅); Turnstile + e2e + k6 w budżecie (p95 < 300 ms publiczne z cache); tag `v0.1.0`.

### FAZA 2 (sprinty 7–9) — ~~Integracja z app.leadersofteams.com~~ + moduł Zespołów

> ⛔ **INTEGRACJA PORZUCONA (2026-07-20)** — patrz baner na górze dokumentu. Sprinty 7–8 (OIDC, webhook
> `level-changed`, rekoncyliacja) **anulowane**. Sprint 9 (moduł `teams`) był sprzężony z integracją
> (`Team.appTeamRef`, unlock po poziomie) — do przeprojektowania jako funkcja wyłącznie Portalu albo
> rezygnacji. Poniższe pozostaje jako zapis historyczny.

- **Sprint 7**: OIDC provider (`oidc-provider` na Fastify, tabele grantów, rotacja JWKS, claims `lot_level`/`lot_leader_status`), rejestracja app jako klienta, ekran zgody.
- **Sprint 8**: webhook `level-changed` (HMAC, retry/DLQ na `ladder.level_achieved` — zdarzenie już jest emitowane!), endpoint rekoncyliacyjny `GET /api/integration/levels?since=`, tabela `WebhookDelivery`; kontrakt dla zespołu app w `docs/architecture/INTEGRATION-CONTRACT.md`.
- **Sprint 9**: moduł `teams` (ADR-010 dec. 2): `Team` (tworzenie od lvl 7), profil publiczny, `TeamOpening` (rekrutacja ciągła, modele współpracy — bez pieniędzy), `TeamApplication` (od lvl 3, poziom sprawdzany w momencie aplikacji), `Post.teamId` aktywny (case studies w imieniu zespołu), `Team.appTeamRef`. **Zero punktów za cokolwiek w teams — test.**

### FAZA 3+ (backlog, kolejność po danych z launchu)

Monetyzacja i wzrost — **kierunek już zaprojektowany** (ADR-011 polecenia, ADR-012 Academy, ADR-013 płatności; osobna Faza Academy+Monetyzacja w [ROADMAP](ROADMAP.md)) · Meilisearch self-hosted · rankingi opt-in · weryfikacja Firm (KRS/NIP) jako odznaka · sesje mentoringowe 1:1 (`MENTORSHIP_SESSION_RATED`) · czat przy zleceniu · PWA/mobile.

## 4. Zasady pracy (obowiązują bez wyjątku)

1. **Nie reinterpretuj briefu ani ADR-ów.** Zmiana reguł punktacji = nowa wersja rulesetu + wpis w publicznym changelogu + zgoda właściciela.
2. **Bramki jakości przed każdym pushem**: lint (granice modułów!), typecheck, pełne testy na realnym MySQL/Redis, build, ręczny e2e nowej funkcji na zbudowanym API.
3. **0 zł** (ADR-009) — żadnych płatnych usług; nowe zależności tylko OSS/darmowe tiery z fallbackiem.
4. **Wzorce z kodu są kontraktem**: nowe moduły dokładnie jak `marketplace`/`ladder`/`groups` (index.ts jako publiczne API, serwisy z DI przez argumenty, zdarzenia przez `emitEvent` w transakcji, idempotentni konsumenci, testy integracyjne przez `buildServer` + `app.inject`).
5. **Branch**: `claude/lot-portal-sprints-4-9-szq1jf`, push po każdym sprincie; PR tworzy wyłącznie właściciel.
6. **Kamienie decyzyjne właściciela** (nie blokuj się — pytaj i jedź dalej): kalibracja wartości punktowych community (sprint 5), sekrety deploy + parametry VPS (sprint 6), plan seedingu rynku (przed launchem), monetyzacja/kalibracja prowizji i nagród afiliacyjnych (Faza Academy — ADR-013).

## 5. Szybki start środowiska

```bash
pnpm install
docker compose -f infra/docker-compose.dev.yml up -d --wait
cd apps/api && DATABASE_URL='mysql://portal:portal@localhost:3306/portal' \
  pnpm exec prisma db push && pnpm exec prisma db seed
# testy:
DATABASE_URL='mysql://portal:portal@127.0.0.1:3306/portal' REDIS_URL='redis://127.0.0.1:6379' pnpm test
# dev: apps/api → pnpm dev (port 3001), pnpm dev:worker; apps/web → pnpm dev (port 3000)
```

**Środowisko zdalne (web/CI-sandbox) bez Dockera** — jeśli `docker compose` nie działa (brak
`/var/run/docker.sock`), postaw zależności lokalnie (potwierdzony przepływ ze Sprintu 4):

```bash
redis-server --daemonize yes --save '' --appendonly no        # Redis (zwykle preinstalowany)
DEBIAN_FRONTEND=noninteractive apt-get update -qq && apt-get install -y -qq mysql-server   # MySQL 8 (Ubuntu 24.04)
mysqld --user=mysql --daemonize                               # (raz: mysqld --initialize-insecure --user=mysql)
mysql -uroot -e "CREATE DATABASE IF NOT EXISTS portal; \
  CREATE USER IF NOT EXISTS 'portal'@'%' IDENTIFIED BY 'portal'; \
  GRANT ALL ON portal.* TO 'portal'@'%'; FLUSH PRIVILEGES;"
# dalej jak wyżej: prisma db push --skip-generate + db seed + pnpm test
```

Komendy dotykające bazy/Redis mogą wymagać `dangerouslyDisableSandbox` (sandbox blokuje część I/O).
