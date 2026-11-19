# Wytyczne „V17 PRO” Portalu — design, UX i UI dla każdego ekranu leadersofteams.pl

Dla Lidera i sesji roboczych. Obowiązuje od 19.11.2026. Siostra „Feniks v17 pro” z LoT App
(`/docker/leaders-of-teams-app/docs/WYTYCZNE-V17.md`) — ta sama rodzina, inny produkt: marketplace B2B + społeczność Liderów.
Skill: `portal-v17-design`. Program i akceptacje: `docs/PROGRAM-V17-PORTAL.md`. Recenzja: agent `recenzent-wygladu`, zgodność: `zgodnosc-makiety`.

> Zasada nadrzędna: **ekran istnieje, żeby ktoś szybciej znalazł wykonawcę, zlecenie albo odpowiedź — albo zapracował status.**
> Jeśli nie umiesz napisać „X przestaje robić Y dzięki temu ekranowi”, ekran nie jest gotowy do makiety.

## 1. Pięć zasad

| #   | Zasada                                                                                                                                                                                                                                                                                                                                       | Jak sprawdzić                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | **Dane zamiast opisów.** Zero zdań-wyjaśnień nad sekcjami. Miejsce idzie na ślad zaufania (oceny, zrealizowane zlecenia, uznane odpowiedzi, poziom Drabinki), budżety, terminy, liczby ofert.                                                                                                                                                | Policz zdania, które nie są daną ani akcją → cel 0 (wyjątek: landing P7). |
| 2   | **Wszystko dobrze poukładane.** Siatka 12 kolumn (desktop), jedna oś wyrównania, odstępy 16/12 px, karty tej samej wysokości w rzędzie.                                                                                                                                                                                                      | Zrzut 1512: krawędzie kart w jednej linii, brak „dziur”.                  |
| 3   | **Telefon pierwszy — wszystko mieści się w ekranie.** Maciej: „Na telefonie wszystko musi się mieścić w ekranie ewentualnie zgadzam się na przesuwanie kafelków i komponentów w poziomie.” Strona nigdy nie przewija się w poziomie; w poziomie przesuwa się tylko kontener `data-przesuw` (scroll-snap, widoczne ucięcie następnego kafla). | scrollWidth = 390 w każdym stanie; nic nie ucięte w kaflu.                |
| 4   | **Nawigacja, która tłumaczy się sama.** Szyna ↔ panel z sekcjami Rynek / Liderzy / Społeczność / Moje, dymek etykiety; na telefonie dolny pasek (bottom-nav) + arkusz modułów.                                                                                                                                                               | Nowa osoba znajduje Zlecenia, Drabinkę i Pytania w < 10 s.                |
| 5   | **Status świeci tylko z cudzych rąk.** Światło poziomów (`--level-1…7`) i każdy „postęp” pochodzi wyłącznie z ocen po zleceniu i uznanych odpowiedzi (ADR-004). Żadnego Feniksa/licznika z własnej aktywności.                                                                                                                               | Każdy wskaźnik postępu ma źródło: ocena albo uznana odpowiedź (SELECT).   |

## 2. System wizualny (tokeny z `apps/web/app/globals.css` — nie wymyślaj nowych)

Mapowanie rodziny App → Portal (nowe tokeny tylko w `:root`/`[data-theme]`, zapadka w globals.css zabrania hexów poza nimi):

| App v17               | Portal                                                              | Uwagi                                               |
| --------------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| `--ac` / `--ac2`      | `--primary-500` / `--violet-500` (`--accent`)                       | wspólny fiolet sieci                                |
| `--acs` (tło akcentu) | `rgba(var(--primary-500-rgb), .12)` jako nowy token `--accent-soft` | dodać przy fali kodu P0                             |
| `--ember` (na żywo)   | `--amber-rgb` / `--warning`                                         | tylko zlecenie „w toku” i stan „na żywo”            |
| `--ok/--warn/--bad`   | `--success` / `--warning` / `--danger` (+ `*-soft-text`)            |                                                     |
| —                     | **`--level-1…7`**                                                   | sygnatura Portalu: poziom Lidera, zawsze z etykietą |

**Typografia:** Bricolage Grotesque (`--font-display`) — nagłówki 28–40 px, tytuły kart 15 px, liczby tabelaryczne; Inter (`--font-sans`) — treść 13–14 px, etykiety 11–12 px;
**Instrument Serif kursywą** — najwyżej jedno słowo-akcent w nagłówku („Twoja _Drabinka_”, „Zlecenia _w okolicy_”). Ładowany przez `next/font/google` (build, nie runtime).
Wersaliki tylko w nagłówkach kolumn tabel.

**Ikony:** Phosphor duotone w kafelku 30–32 px (gradient akcentu + obwódka), akcje `bold`. Decyzja Macieja 19.11: „Phosphor jak w App”. Ilustracje — własne SVG.

**Kontenery:** `Karta v17` (obramowanie gradientowe, promień 22/20, padding 16/18, reflektor, nagłówek kafelek+tytuł+pigułka+przerywana linia) ·
`Karta na żywo` (ciemna, jedna na ekran — np. zlecenie w toku) · `KPI` (etykieta, wartość Bricolage 24–30, plakietka zmiany, mini-wykres; telefon = karuzela) ·
`Ślad zaufania` (ocena ★ + liczba ocen + zrealizowane + poziom w świetle `--level-n`) · `Plakietka statusu` (kropka + tekst + obwódka) · `Pigułki` filtrów.

**Tło:** „siatka liderów” na stronach zalogowanego i katalogach (P0–P6). Scena 3D Drabinki tylko na publicznych/landingu (P7). Nigdy obie naraz, nigdy w karcie, maska rozjaśnia środek.

**Ruch:** wejście kart 0,6 s / 12 px, kaskada 40–60 ms, hover −3 px; `prefers-reduced-motion` = statycznie (siatka też). Canvas pauzuje w tle i poza ekranem.

## 3. Wzorce ekranów (wybierz jeden)

| Typ                  | Ekrany Portalu                                                               | Desktop 1512                                                                                  | Telefon 390                                                                  |
| -------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Panel / przegląd** | `/panel` (zalogowany)                                                        | rząd KPI (zlecenia, oferty, oceny, poziom) → karta Drabinki + karta „na żywo” → lista działań | karuzela KPI → karty pod sobą                                                |
| **Katalog**          | `/zlecenia`, `/uslugi`, `/firmy`, `/liderzy`                                 | filtry-pigułki u góry, lista kart (8) + mapa zaufania / filtry boczne (4)                     | pigułki przewijane `data-przesuw`, lista kart dwuwierszowych, „Pokaż więcej” |
| **Karta obiektu**    | `/zlecenia/[id]`, `/uslugi/[id]`, `/liderzy/[id]`, `/profil/[handle]`, firma | nagłówek + ślad zaufania; oś (oceny/oferty) 8 + fakty/akcja 4                                 | nagłówek, zakładki pigułkami, akcja przyklejona u dołu                       |
| **Drabinka / droga** | `/drabinka`, `/droga`, `/panel/punkty`                                       | drabinka poziomów w świetle `--level-*` + skąd punkty (oceny, odpowiedzi)                     | pionowa drabinka, karty źródeł punktów                                       |
| **Wątek / Q&A**      | `/pytania`, `/watki`, `/feed`, `/grupy`, `/tematy`                           | chronologicznie (ADR-010), kolumna 720 px + boczna (tematy jako etykiety)                     | jedna kolumna, „Pokaż więcej”                                                |
| **Formularz**        | dodaj zlecenie/usługę/ofertę, `/firma/nowa`, konto                           | formularz (8) + podgląd karty (4)                                                             | sekcje zwijane, „Opublikuj” przyklejone                                      |
| **Publiczne / auth** | `/`, `/dla-firm`, `/start`, logowanie, rejestracja, reset                    | landing ze sceną 3D; auth: kolumna 440 px na siatce                                           | pełna szerokość                                                              |

## 4. UX — reguły zachowania

1. **Jedno główne wezwanie do działania na ekran.** Reszta: pigułki, ikony, linki.
2. **Następny krok zawsze widoczny**: stan pusty mówi, co zrobić („Brak zleceń w Twojej branży — ustaw powiadomienie →”).
3. **Komplet stanów** w makiecie (`?stan=pusty|ladowanie|blad`) i kodzie. Żadnego `catch {}` bez komunikatu.
4. **Obcięcie listy nigdy ciche, nigdy nieskończone**: „Pokazano 20 z 87 · Pokaż więcej” (ADR-010 — bez infinite scrolla).
5. **Ślad zaufania z danych**, nie z dekoracji: brak ocen = „Nowy w Portalu”, nie 5 pustych gwiazdek.
6. **Teksty**: prosto, po polsku, bez żargonu; liczby z jednostką (tys. zł, ofert, ocen).
7. **Dostępność**: kontrast AA, fokus widoczny, ARIA na ikonach bez tekstu, temperatura poziomu zawsze z etykietą.

## 5. Antywzorce (odrzucone)

- Zdania-opisy nad sekcjami, „Witaj w…”, teksty sklejane kropkami; karty-klony; kilka głównych przycisków.
- Liczby, których Portal nie liczy (dopasowanie %, „popularność”, wyświetlenia — ADR-010).
- Punkty, odznaki, postęp za zaproszenia, logowanie, aktywność (ADR-004). Feniks dnia z App jako licznik aktywności.
- Infinite scroll, ranking treści algorytmem, streaki, DM (ADR-010).
- **Google Fonts / unpkg / CDN w kodzie aplikacji** (ADR-009). W makietach HTML wolno — to pliki lokalne; w kodzie tylko `next/font` i paczki npm.
- Tabela przewijana w bok na telefonie; tekst na ilustracji/scenie 3D.
- Zmiana etykiet lub kolejności stopki „Ekosystem” (`apps/web/lib/ecosystem.ts`, wspólne dla czterech repo).

## 6. Bramka „ekran gotowy” (Definition of Done)

1. Makieta zaakceptowana przez Macieja (cytat + data w tabeli `PROGRAM-V17-PORTAL.md`).
2. Kod pod flagą `html[data-wyglad="v17"]`, wspólne komponenty (nie kopie stylów).
3. Zrzuty Portalu 1512 + 390 × jasny + ciemny (skill `portal-zrzuty`, sekcja „Rytm V17”) → `zgodnosc-makiety` **ZGODNY w 4 parach**.
   Maciej: „Kod nie może się różnić od makiety którą akceptuję to jest zasada.” / „Kod musi być zgodny z Makietami a nawet je dopracowywać jeśli zauważy błędy.”
   Błąd w makiecie wykryty przez kod → poprawka makiety w tym samym commicie + wiersz „Poprawki z kodu” w `docs/redesign-propozycje/v17/README.md` + zrzut do Macieja.
4. `recenzent-wygladu` bez P1; scrollWidth = szerokość; cele ≥ 44 px; reduced-motion sprawdzony.
5. Ścieżka użytkownika przejdziona na żywo (CLAUDE.md, lekcja 1), konta testowe posprzątane.
6. `portal-bramki` zielone (w tym `antimlm.integration.test.ts` — rozszerzony, jeśli ekran dodaje funkcję społeczną).
