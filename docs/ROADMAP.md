# Roadmapa — zakres MVP i plan faz

Rekomendacja architektoniczna (brief zostawił zakres MVP otwarty — sekcja 5 i 7, pyt. 4). Sprint = 2 tygodnie. Fazy są sekwencyjne; sprinty wewnątrz faz mogą się przesuwać.

> **Status wykonania (2026-07-07):** ✅ Faza 0 (`a6e5a18`) · ✅ Sprint 1–2 (`08a295e`) · ✅ Sprint 2–3 (`1836767`) · ▶ następny: Sprint 4 (grupy + powiadomienia). Szczegółowy plan kolejnych sprintów z DoD i listą długu technicznego: **[HANDOFF-OPUS.md](HANDOFF-OPUS.md)**.

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

**▶ Sprint 4–5 · Społeczność: grupy branżowe + Q&A/mentoring — NASTĘPNE ([ADR-010](architecture/adr/ADR-010-grupy-zespoly-case-studies.md), szczegóły: [HANDOFF-OPUS.md](HANDOFF-OPUS.md)):**

- Grupy per sektor/branża (startowy zestaw systemowy + tworzenie od lvl 2), członkostwo OPEN/MODERATED, moderatorzy grup.
- Posty (dyskusje / case studies / pomysły), komentarze, reakcja „doceniam"; feed chronologiczny z paginacją (bez infinite scroll).
- Wątki Q&A zakotwiczone w grupach: odpowiedzi, głosy kwalifikowane, akceptacja; punktacja ścieżki społecznościowej (z guardrailami) — **posty/komentarze/reakcje bez punktów**.
- Powiadomienia in-app + Socket.IO (badge, nowa odpowiedź/oferta/komentarz) + digest e-mail (limit darmowego tieru, ADR-009).

**Sprint 6 · Hardening i launch:**

- Test obciążeniowy k6 (500 równoczesnych przy działającym stacku app na tym samym VPS), strojenie cache/indeksów.
- Audyt bezpieczeństwa własny (OWASP ASVS checklist), rate-limity, RODO (usunięcie konta, eksport), regulamin + polityka prywatności (wsad prawny po stronie właściciela).
- Seeding rynku: import startowych zleceń/treści (decyzja operacyjna właściciela — patrz RISKS R-06).
- **Launch publiczny.**

**Poza MVP świadomie:** płatności, moduł Zespołów (patrz faza 2 — wymaga realnie istniejących poziomów 3+/7), czat 1:1 (kontakt przy zleceniu przez wątek ofertowy), zaawansowany search (Meilisearch), publiczne rankingi, aplikacja mobilna, webinary/artykuły jako źródła punktów.

## Faza 2 — Integracja z app.leadersofteams.com + moduł Zespołów (3–4 sprinty)

- OIDC provider na portalu (`oidc-provider`, tabele grantów, rotacja JWKS) + rejestracja app jako klienta.
- Webhook `level-changed` (HMAC, retry, DLQ) + endpoint rekoncyliacyjny + `WebhookDelivery`.
- **Po stronie app** (skoordynowany zakres, osobne repo): przycisk „Zaloguj przez leadersofteams.pl" (`openid-client`), mapowanie kont po `sub`, konsumpcja `lot_level`, odblokowanie darmowego dostępu + założenia zespołu, nocny job rekoncyliacji.
- **Moduł Zespołów ([ADR-010](architecture/adr/ADR-010-grupy-zespoly-case-studies.md))**: `Team` (tworzenie od lvl 7), profil publiczny zespołu, `TeamOpening` (rekrutacja ciągła, modele współpracy), `TeamApplication` (od lvl 3), powiązanie `Team.appTeamRef` z zespołem w app + publikowanie case studies w imieniu zespołu (`Post.teamId`). Budowany w tej fazie, bo dopiero wtedy istnieją użytkownicy z odpowiednimi poziomami, a tożsamość zespołów z app wymaga integracji.
- E2E całego przepływu unlock + rekrutacji zespołowej na stagingu obu aplikacji.

## Faza 3+ — Rozszerzenia (kolejność do decyzji po danych z launchu)

Monetyzacja (prowizja/premium — wymaga decyzji biznesowej i rewizji ADR-009), płatności/escrow (wzmacnia też antyfraud), sesje mentoringowe 1:1 jako punktowane zdarzenie (`MENTORSHIP_SESSION_RATED`), Meilisearch self-hosted, rankingi opt-in, weryfikacja Firm (KRS/NIP) jako odznaka.

## Kamienie decyzyjne dla właściciela

| Kiedy                 | Decyzja                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| przed fazą 0          | akceptacja tej dokumentacji; parametry VPS (upgrade do 8 vCPU/16 GB, jeśli mniejszy)           |
| faza 1, sprint 2      | kalibracja ruleset v1 (wartości punktowe, progi 7 poziomów) — warsztat na propozycji liczbowej |
| przed launchem        | strategia seedingu rynku + wsad prawny (regulamin, RODO)                                       |
| po 3 mies. od launchu | rewizja decyzji o płatnościach (ADR-006) na danych                                             |
