# ADR-010: Moduły społecznościowe — Grupy branżowe, Zespoły, Case Studies

**Status:** Zaakceptowany (zaktualizowany 2026-08-11 — patrz „Aktualizacja" niżej)
**Data:** 2026-07-05
**Decydenci:** Maciej Kucharski (wymagania), Fable 5 (projekt)

> **Aktualizacja 2026-08-22 (decyzja właściciela — nagroda wraca do briefu założycielskiego):**
> nagrodą poziomów z `unlocksAppAccess` (L5+) jest ponownie **dostęp do aplikacji LOT**
> (app.leadersofteams.com), a `unlocksTeamCreation` (L7) — **własny zespół prowadzony w tej
> aplikacji**. Zakres MINIMALNY, bez wskrzeszania ADR-003: żadnego OIDC, żadnej synchronizacji
> poziomów, żadnych zmian w schemacie App — Portal pokazuje odblokowaną nagrodę na
> `/panel/punkty` (panel z linkiem do rejestracji w App; App ma rejestrację otwartą, więc
> „dostęp" jest dziś honorowy — ewentualne bramkowanie po stronie App to osobna, przyszła
> decyzja). Copy `/drabinki` i landingu wróciło do prawdy briefu. Fragment o nagrodach
> „Portal-native" z aktualizacji 2026-08-11 (wyróżnienie w katalogu, zespół w Portalu) jest
> tym samym **nieaktualny**; moduł `teams` w Portalu pozostaje niezaimplementowany i nieobiecywany.
> Nagroda nie emituje zdarzeń i nie daje punktów — ADR-004 nietknięty (asercja w
> `antimlm.integration.test.ts`).

> **Aktualizacja 2026-08-11 (po porzuceniu integracji Portal↔App, ADR-003 superseded):**
> wszystkie fragmenty tego ADR odwołujące się do app.leadersofteams.com (wymaganie 2 w Kontekście,
> `Team.appTeamRef` i „powiązanie z zespołem w app" w Decyzji 2, Decyzja 3 w części „zespoły z app")
> są **nieaktualne**. Moduł `teams` pozostaje w planach jako **wyłącznie portalowy**: zespół tworzy
> Lider lvl 7 w Portalu, case studies publikują zespoły portalowe i indywidualni Liderzy, pole
> `appTeamRef` nie powstanie. Nagrody najwyższych poziomów Drabinki są Portal-native: wyróżnienie
> i pierwszeństwo w katalogu Liderów, prawo tworzenia zespołu (lvl 7), w przyszłości malejąca
> prowizja transakcyjna (ADR-013). Decyzje 1 i 4 obowiązują bez zmian.

## Kontekst

Właściciel rozszerzył zakres portalu o trzy wymagania:

1. Portal ma działać także jak Facebook: **grupy/kategorie** dotyczące różnych sektorów i branż biznesu.
2. **Zespoły z app.leadersofteams.com** mają dzielić się na portalu case studies, doświadczeniami i pomysłami.
3. **Moduł Zespołów z rekrutacją ciągłą**: Lider **lvl 7** tworzy zespół; Liderzy **od lvl 3** mogą aplikować do zespołów (przykład: „Maciej Kucharski | Zespół Zodiamo | Poszukujemy lidera ds. marketingu — dołącz do naszego projektu i zarabiaj od wyników"). To coś innego niż jednorazowe zlecenia z marketplace — to stałe pozycje w przedsięwzięciach.

## Decyzja 1: Moduł `groups` — grupy branżowe (warstwa „jak Facebook")

- **Group** — grupa tematyczna powiązana z sektorem/branżą (słownik `Industry`) lub przekrojowa (np. „AI w biznesie"); typy członkostwa: `OPEN` (każdy dołącza) i `MODERATED` (dołączenie po akceptacji). Grupy startowe zakłada administrator (kuratorowana lista sektorów); tworzenie grup przez użytkowników — od zdefiniowanego poziomu Drabinki (parametr konfiguracyjny, start: lvl 2), żeby uniknąć spamu grupowego przy otwartej rejestracji.
- **Post** — wpis w grupie, z typem: `DISCUSSION` (dyskusja), `CASE_STUDY` (studium przypadku), `IDEA` (pomysł), `QUESTION` (odsyła do modułu Q&A — patrz niżej). Posty mają komentarze (**Comment**, wątkowanie 1 poziom) i reakcje (**Reaction**, jeden typ „doceniam" — celowo bez palety emocji, to portal pracy, nie medium społecznościowe).
- **Spójność z modułem `community` (Q&A/mentoring):** wątki Q&A są **zakotwiczone w grupach** (`Thread.groupId`) — pytanie zadaje się w grupie branżowej, dzięki czemu jest jedna przestrzeń społecznościowa, a nie dwa rozłączne światy. Mechanika punktowa Q&A (akceptacje, kwalifikowane głosy) pozostaje bez zmian w module `community`/`ladder`.
- Role w grupie: `MEMBER`, `MODERATOR` (moderatorzy grup to pierwsza linia moderacji treści), właścicielem grup systemowych jest platforma.
- **Anty-engagement zgodnie z briefem:** feed grupy chronologiczny z klasyczną paginacją (bez algorytmicznego rankingu i infinite scroll), powiadomienia zbiorcze (digest), zero mechanik „streak".

## Decyzja 2: Moduł `teams` — Zespoły i rekrutacja ciągła

- **Team** — zespół na portalu. Tworzyć może wyłącznie użytkownik z **poziomem 7** Drabinki (egzekwowane w domenie: warunek na `LadderState.level`). Zespół ma profil publiczny: nazwa, misja, branża, skład, portfolio case studies. W fazie 2 zespół może zostać **powiązany z zespołem w app.leadersofteams.com** (`Team.appTeamRef` przez integrację OIDC/webhook — ADR-003); powiązanie odblokowuje publikowanie w imieniu zespołu z app (Decyzja 3).
- **TeamOpening** — ogłoszenie rekrutacyjne zespołu: rola (np. „lider ds. marketingu"), opis, wymagany minimalny poziom (domyślnie 3, zespół może podnieść), **model współpracy**: `RESULTS_BASED` (od wyników), `FIXED` (stałe), `EQUITY` (udziały), `HYBRID` — wyłącznie jako deklaracja; portal nie procesuje wynagrodzeń (ADR-006/009). Status: `OPEN/PAUSED/CLOSED`.
- **TeamApplication** — aplikacja Lidera do ogłoszenia: wymaga **poziomu ≥ 3** (egzekwowane w domenie — poziom z `LadderState`, nie deklaratywny) + wiadomość motywacyjna; statusy `SUBMITTED/WITHDRAWN/ACCEPTED/REJECTED`; akceptacja tworzy `TeamMember`.
- Różnica vs marketplace: `Order` to jednorazowa transakcja Firma→Lider z cyklem życia i oceną; `TeamOpening` to stała pozycja w przedsięwzięciu Lidera lvl 7. Oba moduły są rozłączne (osobne encje, osobne przepływy) — świadomie nie modelujemy tego jako „typ zlecenia".

## Decyzja 3: Case studies Zespołów z app.leadersofteams.com

- Case study to `Post(type=CASE_STUDY)` publikowany w grupie branżowej, opcjonalnie **w imieniu zespołu** (`Post.teamId`) — wtedy widnieje jako publikacja zespołu (np. „Zespół Zodiamo") i buduje publiczne portfolio zespołu na jego profilu.
- Zespoły istniejące w app.leadersofteams.com uzyskują tożsamość na portalu przez powiązanie (Decyzja 2, faza 2); do czasu integracji case studies publikują zespoły utworzone na portalu oraz indywidualni Liderzy.

## Decyzja 4: Granica z Drabinką — rozszerzenie zasady anty-MLM

**Żadna aktywność z modułów `groups` i `teams` nie generuje punktów Drabinki.** Zamknięty enum `PointEventType` (ADR-004) pozostaje bez zmian: posty, komentarze, reakcje, członkostwo w grupie, założenie zespołu, rekrutacja, aplikowanie i przyjęcie do zespołu = **0 punktów**. To domyka wektor MLM-owy: budowanie „struktury" (zespołu) jest nagrodą za poziom i narzędziem pracy, nigdy źródłem awansu; nie da się „wygrywać Drabinki" przez zapraszanie ludzi do zespołów ani produkcję treści. Jedyne źródła punktów pozostają: ocenione zlecenia (marketplace) i uznany mentoring (Q&A w `community`).

Konsekwencja architektoniczna: moduły `groups` i `teams` **nie emitują żadnych zdarzeń konsumowanych przez `ladder`** — reguła granic egzekwowana w rejestrze subskrypcji zdarzeń (worker `ladder` subskrybuje wyłącznie zdarzenia `marketplace.*` i `community.*`) i testowana automatycznie.

## Umiejscowienie w planie

- **MVP (faza 1):** moduł `groups` w pełni (grupy, posty, komentarze, reakcje, Q&A w grupach) — to warstwa „portal jak Facebook" i nośnik ścieżki mentoringowej.
- **Faza 2:** moduł `teams` — wymaga realnie istniejących poziomów (nikt nie osiągnie lvl 7 w pierwszych tygodniach) oraz integracji z app dla powiązania zespołów; budowany równolegle z OIDC/webhookami.

## Konsekwencje

- (+) Jedna spójna przestrzeń społecznościowa (grupy) zamiast rozproszonych modułów; zespoły jako naturalne przedłużenie nagrody lvl 7 z briefu.
- (+) Zasada anty-MLM wzmocniona i testowalna (zero krawędzi zdarzeń groups/teams → ladder).
- (−) Grupy przy otwartej rejestracji to największy wektor spamu — ryzyko R-13 (RISKS.md): moderatorzy grup, rate-limity, Turnstile, heurystyki treści, próg poziomu dla zakładania grup.
- (−) Więcej zakresu w MVP (+0,5–1 sprint) — zaktualizowane w ROADMAP.md.
