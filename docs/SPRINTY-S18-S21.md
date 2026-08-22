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

⚠️ **Aktualizacja 2026-08-20 — program designu PD1–PD4** ([DESIGN-SPRINTY.md](DESIGN-SPRINTY.md))
wchodzi jako główny tor na polecenie właściciela (koniec z generycznością, mobile-first,
najwyższy poziom UX/UI) i częściowo wchłania ten plan:
**PD1** przejmuje S20 pkt 1–2 (pomiar bazowy, `fetchpriority`/`sizes`), **PD2** poprzedza
zaproszenia z S19 (pierwsza mila ma wyglądać jak produkt, ZANIM zobaczy ją pierwszych
dwudziestu), **PD3** realizuje S21 pkt 0 (UI edycji opublikowanej usługi), **PD4** domyka
S20 pkt 3–4 (offline, stany puste). **✅ PD4 wykonany 21.08** — offline z migawką feedu (S20 pkt 3 domknięty; kontrola „/api/* nigdy do cache" trzyma się w sw.js), stany puste przeszły przegląd ux-copy. Decyzje właściciela z S19 (dane demo R-17, lista
zaproszeń) pozostają nadrzędne i nietknięte. Harmonogram wspólny z App (D1–D5) — opis
w [DESIGN-SPRINTY.md](DESIGN-SPRINTY.md).

---

## S18 — „Prawda o Portalu" ✅ DOMKNIĘTY 2026-08-15

Sprint o tym, żeby to, co Portal **twierdzi**, było prawdą. Wszystkie sześć punktów
wykonane i wdrożone na produkcję — szczegóły i dowody w [HANDOFF-OPUS.md](HANDOFF-OPUS.md).
Sprint znalazł po drodze **cztery zastane błędy**, których nie było w planie: dwie martwe
trasy API (`POST /offers/:id/withdraw`, `PATCH /listings/:id`), `public/robots.txt`
przesłaniający `app/robots.ts` oraz przezroczyste tło WSZYSTKICH głównych przycisków.

1. ✅ **Analityka przestaje kłamać.** Sonda celuje w nową trasę `/healthz` (`force-dynamic`,
   żeby dalej dowodziła renderowania), wykluczoną z matchera middleware — nie z białej listy,
   bo wtedy kłamstwo przeniosłoby się z `/` na `/inne`.
   **Zmierzone po zmianie: 0 przyrostu licznika `/` w oknie 4 minut** przy kontenerze
   `healthy` (przed zmianą byłoby +16).
   ➕ **Poza planem:** biała lista `KNOWN_PATHS` była za kodem o dwa sprinty (7 stron
   w `/inne`), a heurystyka identyfikatorów gubiła `/profil/<uchwyt>`, `/tematy/<hashtag>`
   i `/uslugi/<slug>` — realne uchwyty są KRÓTSZE niż próg długości, a istniejący test
   przechodził tylko dzięki 27-znakowej atrapie.
2. ✅ **Pierwsze testy modułu `analytics`.** Sprostowanie: `shared/analytics.test.ts`
   istniał — brakowało testów SERWISU modułu (doby bez dziur, liczby ZE ŹRÓDEŁ a nie
   z Redisa, `topPaths`).
3. ✅ **RODO dostaje ścieżkę użytkownika** — `/panel/konto` z eksportem (blob + `<a download>`)
   i usunięciem konta potwierdzanym wpisaniem słowa. Opis „co zostaje" pisany z kodu
   anonimizacji. Linki z panelu i z `/prywatnosc` §5, która tę funkcję obiecywała.
4. ✅ **„Moje ulubione"** — `/panel/ulubione`. Przy okazji `GET /me/social`: panel pokazuje
   własny uchwyt z linkiem do publicznego profilu.
5. ✅ **Strażnik „trasa bez wejścia w UI"** — `shared/web-contract.test.ts`. Porównuje trasy
   z **literałami ścieżek** w `apps/web` (nie tylko z argumentami `apiFetch`: strona zlecenia
   podaje ścieżkę propsem), z jawną listą wyjątków, bezpiecznikiem na minimalną liczbę
   znalezionych tras i zakazem martwych wyjątków.
6. ✅ **Porządek w [RISKS.md](RISKS.md)** — dane demo to dziś R-17.

**Kryterium końca — spełnione:** licznik `/` przestał rosnąć od sondy (0 w oknie 4 min);
`/panel/konto` przeszedł eksport i usunięcie konta na produkcji kontem testowym; strażnik
sczerwieniał w próbie kontrolnej po usunięciu `/panel/ulubione`.

**Dług świadomie zostawiony (do S21):** `PATCH /listings/:id` — opublikowanej usługi nie da
się edytować. Trasa jest na liście wyjątków strażnika z uzasadnieniem.

## S19 — „Pierwszych dwudziestu" (wymaga decyzji właściciela na wejściu)

⚠️ **Decyzja, której nie da się rozstrzygnąć z kodu: czy dane demo zostają na produkcji,
gdy przyjdą realni Liderzy** (R-17) i **kogo zapraszamy**. Na produkcji jest już konto
`kuchar21ski@gmail.com` („Macix", 13.08, profil Lidera, adres niepotwierdzony) — jeśli to
nie właściciel, pytanie przestało być hipotetyczne.

1. **Wykonanie decyzji o demo** — obie ścieżki gotowe (`seed-demo.ts --purge`, markery
   `@demo.leadersofteams.pl` / `nip = 'DEMO-SEED'`); sprint wykonuje wybraną i weryfikuje
   NA ŻYWO, że nic nie zostało po drugiej.
2. **Zaproszenie Lidera bez cienia MLM** — strona „Zaproś Lidera" + mail z linkiem.
   **Zero punktów, zero nagrody, zero downline** (ADR-004/ADR-011). Ścieżkę zaproszenia
   DOPISAĆ do `social/antimlm.integration.test.ts` — inaczej strażnik zazieleni się przez
   pominięcie. To jedyna funkcja tego sprintu dotykająca granicy anty-MLM.
3. ✅ **ZROBIONE 22.08 — ślad zaufania w `/szukaj`** (`40fa0ab`). Sprostowanie do tego
   punktu: logika NIE siedzi w `reviews.getCompanyPublicStats` (to statystyki _Firmy_),
   tylko w `getLeaderReviewStats` / `getLeaderReviewStatsMany`. Przyczyna braku była
   architektoniczna: `/search` komponuje SERWISY, a wzbogacanie o oceny żyło w warstwie
   TRAS modułów `listings`/`marketplace`. Na żywo: `?q=sprint` → 6 pasów zaufania,
   `?q=Lead&zakladka=liderzy` → 2 pasy, 390 i 1440 px.
4. ✅ **ZROBIONE 22.08 — pierwsze 60 sekund** (`40fa0ab`, `bd480ce`). Zmierzone, nie ocenione:
   pierwsza klikalna akcja na `/start` leżała na y = 981 px przy zgięciu 844 (390 px) → po
   zmianie y = 711. Przy okazji: `/weryfikacja` kazała się zalogować komuś już zalogowanemu,
   a mail aktywacyjny był jedną linijką z gołym URL-em — oba naprawione.
   **Zostaje otwarte:** nic nie przypomina o niepotwierdzonym adresie po fakcie. Macix
   dostał jeden link ręcznie (decyzja właściciela 22.08); mechanizm przypominania to
   osobna decyzja — patrz HANDOFF.
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

0. ✅ **WYKONANE w PD3 (21.08)** — edycja opublikowanej usługi ma UI: formularz
   create/edit, strona `/uslugi/[slug]/edytuj`, wejścia w panelu i na stronie usługi;
   wpis zdjęty z `EXCEPTIONS`, trasa w `KNOWN_PATHS`. Ścieżka przeszła na żywo na
   stagingu i produkcji (PATCH → skutek widoczny publicznie → przywrócenie).
   Pierwotny opis (dla historii):
   Edycja opublikowanej usługi (dług z S18, znaleziony przez strażnika kontraktu).
   `PATCH /listings/:id` istnieje z walidacją i testami, ale panel ma wyłącznie
   publikuj/wstrzymaj/archiwizuj — **zmiana ceny albo opisu wymaga dziś zarchiwizowania
   usługi i wystawienia jej od nowa**, co kasuje jej adres i historię. To pierwszy punkt
   tego sprintu, bo dotyka pracy zarobkowej Lidera, a nie wygody.
   Po dodaniu UI **usuń wpis z `EXCEPTIONS`** w `shared/web-contract.test.ts`.
1. ✅ **WYKONANE w PD3 (21.08)** — `completedOrders` w /leaders, /leaders/:id i /listings
   (wersja wsadowa bez N+1); widoczny na karcie usługi (pas zaufania) i profilu Lidera
   (karty lustrem profilu Firmy). Test doszyty do cyklu życia zlecenia (213. test API).
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
