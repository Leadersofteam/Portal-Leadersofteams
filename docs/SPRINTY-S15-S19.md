# Roadmapa S15–S19 — „Portal, w którym da się zostać"

**Data:** 2026-08-13 · **Autor:** Opus 5 (po sesji S12 + S14 + S15/S16) · **Status:** w realizacji
**Punkt startowy:** [HANDOFF-OPUS.md](HANDOFF-OPUS.md) · poprzednia roadmapa: [SPRINTY-S12-S15.md](SPRINTY-S12-S15.md)

---

## Gdzie jesteśmy naprawdę

Portal jest publicznie żywy, ma komplet funkcji i — od 13.08 wieczorem — **pełne dane
przykładowe także na produkcji**. Zamknięte w tej sesji: moderacja z podglądem treści, puls
workera, własna analityka, własna bramka anty-botowa (bez Cloudflare), obrazy i cytowanie
wpisów, publiczny profil Firmy, przepływy mailowe.

**Trzy rzeczy, które ta sesja wyprostowała, a które warto pamiętać jako wzorzec błędu:**

1. **„Backend gotowy" ≠ „funkcja działa".** Poczta była odhaczona 13.08 na podstawie logu
   `mail.sent`. Nikt nie kliknął linku — obie strony docelowe (`/weryfikacja`, `/reset-hasla`)
   po prostu nie istniały. Reset hasła, zamknięty jako bloker pierwszej mili, był martwy
   przez cały czas.
2. **Staging pokazywał dane PRODUKCJI.** Nazwa `api` istniała w obu projektach compose naraz
   w sieci Traefika, więc `portal-staging-web` rozwiązywał ją na kontener produkcyjny.
   Każda weryfikacja „na stagingu" mogła być weryfikacją produkcji.
3. **Dokumentacja trzykrotnie w tej sesji rozminęła się z kodem** (digest, ślad zaufania na
   kartach, „kod Turnstile gotowy"). Zasada zostaje: potwierdzaj w kodzie, nie w docs.

---

## ✅ S15 — Pierwsza mila działa (ZROBIONE 2026-08-13)

`/weryfikacja`, `/reset-hasla`, `/nie-pamietam-hasla`, link „nie pamiętam hasła" na logowaniu,
baner potwierdzenia adresu + `POST /auth/resend-verification`. Nowy `e2e/email-flows.spec.ts`
przechodzi obie ścieżki **końcem-końcem** (prośba → link → nowe hasło → logowanie nowym hasłem).

Przy okazji złapany błąd bramki anty-botowej: klient odliczał minimalny czas wypełniania
formularza od WYSŁANIA żądania o wyzwanie, a serwer od jego UTWORZENIA — o całą latencję sieci
później. Na wolniejszym łączu poprawne rozwiązanie bywało odrzucane jako `TOO_FAST`.

## ✅ S16 — Portal pełen życia (ZROBIONE 2026-08-13)

`prisma/seed-demo-social.ts`: 13 wpisów portalowych (5 z obrazami, 2 z cytowaniem), 4 dyskusje
w grupach z komentarzami, 18 relacji obserwowania, reakcje. Obrazy rysowane u nas
(gradient z podpisem w SVG), zero stocków.

**Zasada, którą trzymamy w seedach:** przechodzimy prawdziwą ścieżką kodu. Obrazy idą przez
`filesService.store()`, oś aktywności buduje `socialService.onSocialPostPublished` — ten sam
konsument, którego wywołuje worker. Punkty nalicza prawdziwy serwis ladder.

**Dane demo są na produkcji — decyzja właściciela 13.08.** Zgłoszone ryzyko: fikcyjni Liderzy
z punktami podważają obietnicę ADR-004 („status trzeba zapracować"), jeśli ktoś to odkryje.
Decyzja podtrzymana, wykonana z dwoma bezpiecznikami: druga flaga
`SEED_DEMO_ALLOW_PRODUCTION=1` i `--purge` zdejmujący komplet jedną komendą.
**Przed zaproszeniem pierwszych realnych Liderów trzeba świadomie zdecydować, czy demo zostaje.**

---

## ✅ S17 — Społeczność i grupy (ZROBIONE 2026-08-14)

Cel: to, co dziś jest tylko na feedzie portalowym, ma działać też w grupach — bo grupy są
miejscem, gdzie zdobywa się punkty (Q&A) i gdzie toczy się rozmowa branżowa.

1. ✅ **Obrazy w postach grupowych — ZROBIONE.** `PostImage` wzorowany na `SocialPostImage`,
   własność pliku sprawdzana przed transakcją, odczyt dla całej strony JEDNYM zapytaniem.
   Przy okazji zniknęła duplikacja: logika uploadu wyjechała do `lib/use-image-upload.ts`
   - `components/image-picker.tsx` i jest wspólna dla kompozytora feedu i formularza grupy.
2. ✅ **Tematy (#hashtagi) — ZROBIONE.** Własny model `Topic` (świadomie NIE współdzielony
   z `Tag` z listings: tag przy usłudze to deklaracja o kategorii oferty, temat we wpisie to
   swobodne słowo w rozmowie). Właścicielem jest `social`: tematy wydobywa TEN SAM konsument,
   który buduje oś aktywności. Strona `/tematy/[slug]` jest chronologiczna i łączy wpisy
   portalowe z postami w grupach. Ranking istnieje wyłącznie dla ETYKIET (chipy), nigdy dla treści.
   `#Rekrutacja` i `#rekrutacja` to jeden temat; `#2026` tematem nie jest.
3. ✅ **Zakładki — ZROBIONE.** Prywatna półka nad OBIEMA tabelami treści (wpis portalowy
   i post w grupie), właścicielem jest `social` — tak samo jak przy tematach. Klucz złożony
   daje idempotencję, polimorf świadomie bez klucza obcego. **Bez publicznego licznika**:
   pilnuje tego test czytający SUROWE ciała pięciu odpowiedzi, bo asercja na kształt obiektu
   przepuściłaby pole dołożone kiedyś „bo się przyda". Zero zdarzeń outboxa — jak przy
   onboardingu, brak zdarzenia to brak drogi do laddera. Strona: `/panel/zapisane`.
4. ✅ **Przypięty wątek + moderatorzy grup — ZROBIONE.** Przypinamy POST (nie wątek Q&A:
   `Thread` to pytanie w mentoringu na osobnej podstronie, a przypięcie służy powitaniu
   i zasadom), najwyżej jeden na grupę, wykluczony z listy chronologicznej na wszystkich
   stronach. Moderator grupy: skład, awans/degradacja, wyproszenie (`BANNED` wreszcie
   używany), ukrycie posta wspólną implementacją z moderacją platformy. Degradacja
   ostatniego moderatora → 409.
   **🔴 Przy przechodzeniu na żywo wyszło, że `POST /groups` NIE MIAŁO wejścia w UI** —
   przez cztery sprinty grupę dało się założyć tylko curl-em, więc produkcja miała 10 grup
   systemowych bez ani jednego moderatora. Bez `/grupy/nowa` cały punkt 4 byłby funkcją,
   do której nikt nie ma jak dojść.

**Zastane błędy naprawione przy okazji:** nagłówek nigdy nie czytał sesji (zalogowany widział
„Zaloguj się" na każdej stronie — zgłoszone przy S12), feed miał na sztywno
`initialActive={false}` przy „Doceniam", 48 plików z testów obrazów siedziało w repo.

⚠️ Przy każdej z tych funkcji: **rozszerz ścieżkę w `social/antimlm.integration.test.ts`**.
Test zbiera zdarzenia z outboxa i sprawdza, że żadne nie jest kluczem w `ladderSubscriptions` —
jeśli nowa funkcja nie zostanie dodana do ścieżki, test zazieleni się przez POMINIĘCIE.

## S18 — Marketplace i dopasowanie

1. **Oceny i liczba zrealizowanych zleceń w `/szukaj`.** Wyniki wyszukiwania to dziś jedyne
   miejsce bez śladu zaufania — na `/liderzy` i `/uslugi` jest od dawna.
2. **Licznik zrealizowanych zleceń przy Liderze.** Logika policzona już dla Firmy
   (`reviews.getCompanyPublicStats`), do odbicia po stronie Lidera.
3. **„Nowe zlecenie w Twojej branży"** — powiadomienie **opt-in**. To dopasowanie, nie przynęta:
   bez streaków, bez „wróć do nas", z jednym kliknięciem wyłączenia.
4. **Zapisane wyszukiwania** w katalogu usług i zleceń.

## S19 — Wygląd i mobile

1. Przegląd spójności wizualnej i **stanów pustych** — po S16 widać, które naprawdę zostają puste.
2. Budżet wydajności mobile: LCP < 2,5 s na 4G, `fetchpriority` na hero, lazy na galeriach
   (obrazy w feedzie już mają `loading="lazy"` i stałą proporcję, żeby feed nie skakał).
3. PWA po dołożeniu obrazów: rozmiar cache, zachowanie offline dla feedu.

## Decyzja do podjęcia przed S20 (właściciel)

**Kogo zapraszamy jako pierwszych realnych Liderów** i **czy dane demo zostają na produkcji**,
gdy oni przyjdą. Te dwie decyzje są sprzężone: realny Lider obok fikcyjnego z punktami to
dokładnie ta sytuacja, o którą chodzi w ryzyku R-16.

---

## Czego świadomie NIE MA

- **Grywalizacji, streaków, „wróć do nas".** ADR-010 i brief §6 — nie negocjujemy, nawet gdy
  metryki będą kusić.
- **DM-ów.** Kontakt przez zapytania o usługi i wątki ofert.
- **Zewnętrznych dostawców po API.** Portal nie wykonuje ŻADNEGO wychodzącego wywołania HTTP
  poza SMTP własnej skrzynki. Ta właściwość ma zostać.
- **k6** — dopiero gdy będzie znany realny kształt ruchu.

## Rytm pracy (bez zmian)

`pnpm format && pnpm lint && pnpm typecheck && pnpm -r test` (na realnym MySQL/Redis!) →
`pnpm build` → `bash infra/e2e.sh` → zrzuty 390/1440 px → commit → staging + `run --rm migrate`
→ prod → wpis w HANDOFF. PR tworzy właściciel (brak `gh` na VPS).
