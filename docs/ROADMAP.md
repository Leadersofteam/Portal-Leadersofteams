# Roadmapa — zakres MVP i plan faz

Rekomendacja architektoniczna (brief zostawił zakres MVP otwarty — sekcja 5 i 7, pyt. 4). Sprint = 2 tygodnie. Fazy są sekwencyjne; sprinty wewnątrz faz mogą się przesuwać.

> **Status wykonania (2026-07-12):** ✅ Faza 0 (`a6e5a18`) · ✅ Sprint 1–2 (`08a295e`) · ✅ Sprint 2–3 (`1836767`) · ✅ Sprint 4 — grupy + powiadomienia (`234d30a`) · ✅ Strategia/ADR-011–013 (`157522d`) · ✅ **Sprint 5 — moduł `community` (Q&A/mentoring, druga ścieżka punktowa)** — w `main` przez PR #8; **zweryfikowany 2026-07-12** (73 testy zielone, w tym 11 community + anty-MLM `subscriptions`) · ✅ **Deploy STAGING + redesign + 3 fixy runtime** (gałąź `fix/api-tsup-noexternal-workspace`) · ✅ **Sprint 4.5 (stabilizacja: merge gałęzi, seed demo, dług `openssl`, czyszczenie staging)** — zmergowany do `main` (PR #11, `4bcfca6`); higiena git domknięta 2026-07-20 (gałąź `growth/g1-seo-discoverability` wypchnięta, `main` zsynchronizowany). → następny **Sprint 6 (hardening/launch)** — patrz [GO-LIVE-CHECKLIST.md](GO-LIVE-CHECKLIST.md). Architektura integracji App↔Portal: **[INTEGRATION-APP-PORTAL.md](architecture/INTEGRATION-APP-PORTAL.md)**. Szczegóły stanu, długu i sprintów: **[HANDOFF-OPUS.md](HANDOFF-OPUS.md)**.
>
> **Nota o dryfie dok↔kod (2026-07-12):** wcześniejsze wersje tego dokumentu i HANDOFF opisywały Sprint 5 jako „następny". W rzeczywistości moduł `community` był już zaimplementowany i zmergowany do `main` (PR #8 `claude/lot-portal-sprints-5-9-*`) — wskaźnik sprintu nie został zaktualizowany. Zweryfikowano end-to-end i naprawiono opis 2026-07-12.

## Zasada przewodnia zakresu MVP

Do MVP wchodzi wszystko, co jest potrzebne, żeby **pętla wartości Drabinki działała uczciwie od pierwszego użytkownika**: obie ścieżki punktowania (marketplace + mentoring, wymóg równowagi z briefu 3.3), transparentny ledger i guardraile antyfraudowe. Poza MVP zostaje wszystko, czego brak nie psuje tej pętli — w szczególności integracja z app.leadersofteams.com (nikt nie osiągnie progu unlock w pierwszych tygodniach — naturalny runway) i płatności (ADR-006).

## ✅ Faza 0 — Fundament (1 sprint) — ZROBIONE

- Scaffold monorepo wg [REPO-STRUCTURE.md](REPO-STRUCTURE.md); CI (lint, typecheck, testy, gitleaks) od pierwszego commita.
- `infra/`: compose produkcyjny i staging, bootstrap VPS (deploy-user, sieć Traefika, limity zasobów), backup + test restore.
- CD na staging i produkcję (za flagą „coming soon" na domenie), healthchecki, rollback.
- Moduł `identity`: rejestracja (user + firma), logowanie (sesje w Redis), RBAC minimum, szkielet outbox/worker.
- **Definition of done fazy:** pusty, zdeployowany, monitorowany system z działającą rejestracją na staging i produkcji.

## Faza 1 — MVP (5–6 sprintów)

**✅ Sprint 1–2 · Marketplace core — ZROBIONE:**

- Profile: `LeaderProfile` (branża, bio, portfolio), profil `Company`; publiczne strony profili (SSR/ISR).
- Zlecenia: pełny cykl życia (`DRAFT → … → RATED`, spory jako zgłoszenie do moderacji), oferty, `minLevel` (mechanizm „małe zlecenia na start").
- Listing zleceń z filtrami (branża, budżet, poziom) + wyszukiwarka FULLTEXT.

**✅ Sprint 2–3 · Drabinka + oceny (krytyczna ścieżka projektu) — ZROBIONE:**

- `Review` dwustronne z publikacją symultaniczną.
- Moduł `ladder`: ledger `PointEvent`, cykl `PENDING → CONFIRMED`, projekcja `LadderState`, `LevelDefinition` (7 poziomów, ruleset v1), ekran „Moje punkty" (pełna transparentność) i publiczna strona zasad punktacji.
- Moduł `antifraud` v1: malejące zwroty, progi wiarygodności/dojrzałości kont, limity szybkości, detekcja wzajemności (heurystyki par), `ModerationCase` + minimalny panel moderatora.

**Sprint 4–5 · Społeczność: grupy branżowe + Q&A/mentoring ([ADR-010](architecture/adr/ADR-010-grupy-zespoly-case-studies.md), szczegóły: [HANDOFF-OPUS.md](HANDOFF-OPUS.md)):**

- ✅ **Sprint 4 (`234d30a`)** — Grupy per sektor/branża (systemowe + tworzenie od lvl 2), członkostwo OPEN/MODERATED, moderatorzy; posty (dyskusje / case studies / pomysły), komentarze, reakcja „doceniam"; feed chronologiczny z paginacją kursorem (bez infinite scroll); powiadomienia in-app + Socket.IO (badge realtime). Test anty-MLM: aktywność w grupach = 0 punktów.
- ✅ **Sprint 5 (ZROBIONE — w `main` przez PR #8, zweryfikowane 2026-07-12)** — Wątki Q&A zakotwiczone w grupach (moduł `community`): odpowiedzi, głosy kwalifikowane, akceptacja; **druga ścieżka punktowa** ładowana do `ladder` (community.*) z guardrailami (kwalifikacja głosów, czapka tygodniowa 300, wzajemna adoracja → HOLD, limit dobowy → HOLD). Wartości ścieżki w `rules.ts` (ruleset v1, kalibracja zatwierdzona przez właściciela). Frontend: `/grupy/[id]/pytania` + `/watki/[id]`. Test anty-MLM (`subscriptions.test.ts`) zielony. Digest e-mail powiadomień dochodzi w Sprincie 6 (ADR-009).

**Sprint 6 · Hardening i launch:**

- Test obciążeniowy k6 (500 równoczesnych przy działającym stacku app na tym samym VPS), strojenie cache/indeksów.
- Audyt bezpieczeństwa własny (OWASP ASVS checklist), rate-limity, RODO (usunięcie konta, eksport), regulamin + polityka prywatności (wsad prawny po stronie właściciela).
- Seeding rynku: import startowych zleceń/treści (decyzja operacyjna właściciela — patrz RISKS R-06).
- **Launch publiczny.**

**Poza MVP świadomie:** płatności, moduł Zespołów (patrz faza 2 — wymaga realnie istniejących poziomów 3+/7), czat 1:1 (kontakt przy zleceniu przez wątek ofertowy), zaawansowany search (Meilisearch), publiczne rankingi, aplikacja mobilna, webinary/artykuły jako źródła punktów.

## Faza 2 — ~~Integracja z app.leadersofteams.com~~ + moduł Zespołów (3–4 sprinty)

> ⛔ **INTEGRACJA PORZUCONA (2026-07-20).** Decyzją właściciela integracja Portal↔App (OIDC,
> webhook `level-changed`, rekoncyliacja, „Zaloguj przez leadersofteams.pl", odblokowanie
> darmowego dostępu do App) **nie będzie realizowana** — patrz [ADR-003](architecture/adr/ADR-003-integracja-oidc-level-sync.md)
> (SUPERSEDED) i [INTEGRATION-APP-PORTAL.md](architecture/INTEGRATION-APP-PORTAL.md) (porzucone).
> **Konsekwencja do rozstrzygnięcia przez właściciela:** moduł Zespołów (ADR-010) zakładał
> powiązanie `Team.appTeamRef` z zespołem w App i unlock tworzenia zespołu przez poziom Drabinki
> — bez integracji wymaga **przeprojektowania jako funkcja wyłącznie Portalu** (albo rezygnacji).
> Poniższe punkty integracyjne pozostają jako zapis historyczny.

- ~~OIDC provider na portalu (`oidc-provider`, tabele grantów, rotacja JWKS) + rejestracja app jako klienta.~~
- Webhook `level-changed` (HMAC, retry, DLQ) + endpoint rekoncyliacyjny + `WebhookDelivery`.
- **Po stronie app** (skoordynowany zakres, osobne repo): przycisk „Zaloguj przez leadersofteams.pl" (`openid-client`), mapowanie kont po `sub`, konsumpcja `lot_level`, odblokowanie darmowego dostępu + założenia zespołu, nocny job rekoncyliacji.
- **Moduł Zespołów ([ADR-010](architecture/adr/ADR-010-grupy-zespoly-case-studies.md))**: `Team` (tworzenie od lvl 7), profil publiczny zespołu, `TeamOpening` (rekrutacja ciągła, modele współpracy), `TeamApplication` (od lvl 3), powiązanie `Team.appTeamRef` z zespołem w app + publikowanie case studies w imieniu zespołu (`Post.teamId`). Budowany w tej fazie, bo dopiero wtedy istnieją użytkownicy z odpowiednimi poziomami, a tożsamość zespołów z app wymaga integracji.
- E2E całego przepływu unlock + rekrutacji zespołowej na stagingu obu aplikacji.

## Faza Academy + Monetyzacja — nauka, kursy, przychód, wzrost (nowa, po Fazie 1/2)

Kierunek strategiczny (2026-07-08): [strategia różnicowania i wzrostu](strategy/DIFFERENTIATION-AND-GROWTH.md) + [ADR-011](architecture/adr/ADR-011-program-polecen.md)/[ADR-012](architecture/adr/ADR-012-academy-kursy.md)/[ADR-013](architecture/adr/ADR-013-monetyzacja-platnosci.md). Wprowadza dwie nowe płaszczyzny **obok** Drabinki (pieniądz + polecenia), nigdy w niej. **Drabinka pozostaje nietknięta na całej tej ścieżce** (zamknięty enum `PointEventType`, brak krawędzi zdarzeń nowych modułów → `ladder`).

- **Moduł `billing`** (ADR-013): integracja PSP (Przelewy24/Stripe), split payout (bez custodialnego escrow na start), webhooki idempotentne przez outbox, prowizja platformy **malejąca z poziomem Drabinki**.
- **Moduł `academy`** (ADR-012): kursy (darmowe i płatne) — publikacja od progu poziomu, `Enrollment`, `CourseReview` (reputacja autora, nie punkty), `SkillCredential` (odznaka). Sprzedaż przez `billing`. Magnes na aspirujących liderów i lek na cold-start (R-06). **Zero punktów Drabinki.**
- **Moduł `referral`** (ADR-011): afiliacja jednopoziomowa — nagroda za PIERWSZĄ realną transakcję zaproszonego, głębokość = 1 (brak downline), karencja + clawback, guardraile antyfraud. **Zero punktów Drabinki, zero wielopoziomowości.**
- Rozszerzenie `subscriptions.test.ts`: dowód, że `academy.*`/`referral.*`/`billing.*` nie trafiają do `ladder`.

Kolejność wewnątrz fazy: `billing` (fundament płatności) → `academy` (pierwszy przychód) → `referral` (dźwignia wzrostu na działających płatnościach). Wchodzi po dojrzałym MVP i realnych użytkownikach.

## Faza 3+ — Rozszerzenia (kolejność do decyzji po danych z launchu)

Escrow/prowizja od zleceń (wzmacnia też antyfraud), sesje mentoringowe 1:1 jako punktowane zdarzenie (`MENTORSHIP_SESSION_RATED`), Meilisearch self-hosted, rankingi opt-in, weryfikacja Firm (KRS/NIP) jako odznaka, premium dla Firm.

## Kamienie decyzyjne dla właściciela

| Kiedy                 | Decyzja                                                                                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| przed fazą 0          | akceptacja tej dokumentacji; parametry VPS (upgrade do 8 vCPU/16 GB, jeśli mniejszy)                                                                                                               |
| faza 1, sprint 2      | kalibracja ruleset v1 (wartości punktowe, progi 7 poziomów) — warsztat na propozycji liczbowej                                                                                                     |
| przed launchem        | strategia seedingu rynku + wsad prawny (regulamin, RODO)                                                                                                                                           |
| po 3 mies. od launchu | rewizja decyzji o płatnościach (ADR-006) na danych                                                                                                                                                 |
| przed Fazą Academy    | kalibracja monetyzacji (ADR-013): take-rate na poziom, kwota+karencja nagrody afiliacyjnej (ADR-011), wybór PSP produkcyjnego, polityka zwrotów kursów; wsad prawny (VAT/OSS, regulamin sprzedaży) |
