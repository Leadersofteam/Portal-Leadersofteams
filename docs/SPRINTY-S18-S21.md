# Roadmapa S18–S21 — „Portal, który mówi prawdę"

**Data:** 2026-08-14 · **Autor:** Opus 5 (po domknięciu S17) · **Status:** w realizacji
**Punkt startowy:** [HANDOFF-OPUS.md](HANDOFF-OPUS.md) · poprzednia roadmapa:
[SPRINTY-S15-S19.md](SPRINTY-S15-S19.md) (S15–S17 zrobione, S18/S19 **przenumerowane** — niżej)

---

## Skąd ten plan — pomiary, nie lista życzeń

Wszystko poniżej wynika z tego, co zmierzyłem na żywej produkcji 14.08 po wdrożeniu S17:

| Sygnał           | Pomiar                                                                          | Wniosek                                                                                         |
| ---------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Ruch             | `/` **3857 odsłon/dobę**, każda inna strona 2–3                                 | To nie ludzie. Healthcheck kontenera `web` uderza w `/` co 15 s i **jest liczony jako odsłona** |
| Baza produkcji   | 10 kont (9 demo + 1 realne), 14 zleceń, 6 usług, 13 wpisów, 20 ocen, **2,3 MB** | Nie optymalizujemy pustego serwisu                                                              |
| Czasy odpowiedzi | TTFB **57–101 ms**, całość ≤ 180 ms na 6 kluczowych stronach                    | Serwer się nudzi — „optymalizacja" nie oznacza tu szybkości                                     |
| Trasy bez UI     | `GET /me/export`, `DELETE /me`, `GET /me/favorites`, `GET /me/social`           | Ten sam wzorzec co `POST /groups` w S17 — **trzeci raz w tym repo**                             |
| Testy            | 182 API / 16 e2e; moduł `analytics` ma **0 plików testowych** (jedyny taki)     | Metryka bez testu i z fałszywym licznikiem                                                      |
| Rejestr ryzyk    | dwa RÓŻNE ryzyka mają numer **R-16**                                            | Rejestr zaczyna kłamać                                                                          |

**Diagnoza:** wąskim gardłem nadal są ludzie, ale Portal ma trzy długi, które wybuchną
dokładnie w dniu, w którym ci ludzie przyjdą — nieprawdziwa analityka, RODO bez ścieżki
użytkownika i funkcje bez wejścia w interfejsie.

⚠️ **Przenumerowanie:** stare S18 (marketplace) → **S21**, stare S19 (wygląd/mobile) → **S20**.

---

## S18 — „Prawda o Portalu" (higiena, zero nowych funkcji dla użytkownika)

Sprint o tym, żeby to, co Portal **twierdzi**, było prawdą.

1. **Analityka przestaje kłamać.** Healthcheck `web` (`infra/docker-compose.yml`
   i staging) uderza w `/` co 15 s → 5760 sztucznych odsłon na dobę. Dodać po stronie web
   osobną trasę zdrowia i przepiąć healthcheck; ścieżka **poza** białą listą
   w `apps/api/src/shared/analytics.ts`. Bez tego pierwszy realny ruch utonie w szumie.
2. **Pierwsze testy modułu `analytics`** — jedyny moduł bez testów (antifraud miał ten sam
   problem do S12). Minimum: biała lista odsiewa śmieci, healthcheck się nie liczy,
   rejestracje/publikacje idą Z BAZY, nie z licznika.
3. **RODO dostaje ścieżkę użytkownika.** `GET /me/export` i `DELETE /me` działają od D6
   i nie mają ANI JEDNEGO wejścia w UI. Nowa strona `/panel/konto` z dwoma akcjami:
   „Pobierz swoje dane" oraz „Usuń konto" — z realnym potwierdzeniem i opisem, co zostaje
   (ledger zanonimizowany, treści `[treść usunięta]`). To **R-10 — obowiązek prawny**,
   dziś żyjący wyłącznie w backendzie.
4. **„Moje ulubione"** — `GET /me/favorites` bez strony. Gwiazdka w `/uslugi` działa, ale
   ulubionych nie da się nigdzie zobaczyć. Wzorzec gotowy: `/panel/zapisane` (S17).
5. **Strażnik „trasa bez wejścia w UI" jako TEST.** Porównuje trasy z
   `apps/api/src/modules/*/routes.ts` z wywołaniami `apiFetch`/`serverApi` w `apps/web`,
   z jawną, komentowaną listą wyjątków (np. `/auth/challenge` z bramki anty-bot).
   Ta mina wystąpiła trzy razy — bez strażnika wróci czwarty.
6. **Porządek w [RISKS.md](RISKS.md)** — dane demo na produkcji dostają własny numer (R-17).

**Kryterium końca:** licznik `/` po dobie pokazuje liczbę zbliżoną do realnych wejść;
`/panel/konto` przechodzi eksport i usunięcie konta na koncie testowym (na produkcji,
ze sprzątaniem); strażnik z pkt 5 czerwienieje po usunięciu linku do `/panel/zapisane`.

## S19 — „Pierwszych dwudziestu" (wymaga decyzji właściciela na wejściu)

⚠️ **Decyzja, której nie da się rozstrzygnąć z kodu: czy dane demo zostają na produkcji,
gdy przyjdą realni Liderzy** (R-16/R-17) i **kogo zapraszamy**. Na produkcji jest już konto
`kuchar21ski@gmail.com` („Macix", 13.08, profil Lidera, adres niepotwierdzony) — jeśli to
nie właściciel, pytanie przestało być hipotetyczne.

1. **Wykonanie decyzji o demo** — obie ścieżki gotowe (`seed-demo.ts --purge`, markery
   `@demo.leadersofteams.pl` / `nip = 'DEMO-SEED'`); sprint wykonuje wybraną i weryfikuje
   NA ŻYWO, że nic nie zostało po drugiej.
2. **Zaproszenie Lidera bez cienia MLM** — strona „Zaproś Lidera" + mail z linkiem.
   **Zero punktów, zero nagrody, zero downline** (ADR-004/ADR-011). Ścieżkę zaproszenia
   DOPISAĆ do `social/antimlm.integration.test.ts` — inaczej strażnik zazieleni się przez
   pominięcie. To jedyna funkcja tego sprintu dotykająca granicy anty-MLM.
3. **Ślad zaufania w `/szukaj`** — dziś wyniki mają `LevelBadge`, ale nie mają ocen ani
   liczby zrealizowanych zleceń; to jedyne miejsce bez tego sygnału. Logika policzona
   w `reviews.getCompanyPublicStats`.
4. **Pierwsze 60 sekund** — przejść rejestrację → kreator → panel oczami obcej osoby
   i usunąć wszystko, co każe zgadywać, co robić dalej. Zrzuty 390/1440 obowiązkowe.
5. **Mail powitalny + digest tygodniowy opt-in** — bez streaków, bez „wróć do nas",
   z jednym kliknięciem wyłączenia (ADR-010).

## S20 — „Mobile i wydajność, ale zmierzona" (dawne S19)

Sprint zaczyna się od **pomiaru**. Serwer odpowiada w ≤ 180 ms, więc praca bez liczby
przed i po jest zgadywaniem.

1. **Pomiar bazowy** LCP/CLS na 390 px z dławieniem 4G (skill `portal-zrzuty`) dla `/`,
   `/feed`, `/uslugi`, `/grupy/:id`. **Liczby do HANDOFF** — inaczej za miesiąc nikt nie
   będzie wiedział, czy było lepiej.
2. Dopiero potem: `fetchpriority` na hero, `sizes` dla obrazów feedu (warianty webp już
   są), lazy dla galerii. Feed to najcięższy dokument (106 KB HTML).
3. **PWA po dołożeniu obrazów** — rozmiar cache, offline feedu, kontrola, że `/api/*`
   NIGDY nie trafia do cache (cache HTML = czyjś panel u kogoś innego).
4. Przegląd spójności wizualnej i **stanów pustych** — po S16/S17 widać, które zostają puste.
5. **k6 dopiero, gdy będzie znany kształt ruchu** — R-04 zostaje otwarte świadomie.

## S21 — „Marketplace i dopasowanie" (dawne S18)

1. **Licznik zrealizowanych zleceń przy Liderze** — odbicie logiki policzonej dla Firmy.
2. **„Nowe zlecenie w Twojej branży"** — powiadomienie **opt-in**. Dopasowanie, nie przynęta.
3. **Zapisane wyszukiwania** — przedłużenie zakładek z S17 (prywatne, bez licznika).
4. **Q&A pod obciążeniem realnych ludzi** — to jedyna punktowana ścieżka społeczna, więc
   tam skupi się nadużycie; przegląd progów i detekcji, gdy pojawią się dane.

---

## Czego świadomie NIE robimy

- **Nowych funkcji społecznych przed pierwszymi realnymi Liderami.** S17 pokazał, jak to
  się kończy: `POST /groups` przeleżała cztery sprinty bez wejścia w UI.
- **Optymalizacji bez pomiaru** — przy 2,3 MB bazy i TTFB 60 ms to praca dla samej pracy.
- **Grywalizacji, streaków, liczników popularności** (ADR-010) i **zewnętrznych API** poza
  własnym SMTP (ADR-009).
- **Auto-deployu z GitHuba** — twarda zasada właściciela.

## Rytm pracy (bez zmian)

`pnpm format && pnpm lint && pnpm typecheck && pnpm -r test` (na realnym MySQL/Redis!) →
`pnpm build` → `bash infra/e2e.sh` → zrzuty 390/1440 → commit → staging + `run --rm migrate`
→ **backup prod przed migracją** → prod → przejście ścieżki NA ŻYWO → sprzątnięcie kont
testowych → wpis w HANDOFF. Punkt odniesienia po S17: **182 testy API, 16 e2e**.
PR do `main` tworzy właściciel (brak `gh` na VPS).
