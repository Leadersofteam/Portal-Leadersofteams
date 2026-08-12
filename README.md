# Portal Leaders of Teams

Platforma leadersofteams.pl — marketplace usług B2B (Firmy ↔ Liderzy) połączony ze społecznością: **grupami branżowymi** (posty, case studies, pomysły), **Q&A/mentoringiem** oraz systemem poziomów **Drabinka Lidera**, którego najwyższe szczeble dają wyróżnienie i pierwszeństwo w katalogu Liderów oraz prawo do założenia własnego zespołu w Portalu (rekrutacja ciągła: tworzenie od lvl 7, aplikowanie od lvl 3 — moduł planowany). Integracja z app.leadersofteams.com została porzucona (ADR-003 superseded, 2026-07-20). Koszt operacyjny usług zewnętrznych: **0 zł** (ADR-009).

**Status:** Faza 1 w toku — zrealizowane: fundament (Faza 0), marketplace core (Sprint 1–2), **Drabinka Lidera z antyfraudem** (Sprint 2–3). Następne: grupy branżowe + Q&A (Sprint 4–5). Pełny stan projektu i plan sprintów: **[docs/HANDOFF-OPUS.md](docs/HANDOFF-OPUS.md)**.

## Lokalizacje na VPS (uwaga: dwa różne projekty)

Na VPS działają **dwa odrębne repozytoria** Leaders of Teams. Łatwo je pomylić — poniższa tabela jest rozstrzygająca:

| Ścieżka                        | Repozytorium            | Co to jest                                                             |
| ------------------------------ | ----------------------- | ---------------------------------------------------------------------- |
| `/docker/portal-staging`       | `Portal-Leadersofteams` | **to repo** — Portal (marketplace + Drabinka), wdrożenie **staging**   |
| `/docker/leaders-of-teams-app` | `Leaders-of-Teams-APP`  | osobny projekt — App/CRM, `app.leadersofteams.com`, prod               |
| `/root/lot-sprint41`           | `Leaders-of-Teams-APP`  | worktree **App**, gałąź `sprint-41-design` — **nie należy do Portalu** |

Katalog `/root/lot-sprint41` bywa mylony z Portalem — to `git worktree` repozytorium App.

## Dokumentacja

| Dokument                                                                                              | Zawartość                                                               |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [Brief kontekstowy](brief-leadersofteams-platforma.md)                                                | wizja produktu i rozstrzygnięcia biznesowe (dokument źródłowy)          |
| [Architektura — przegląd](docs/architecture/OVERVIEW.md)                                              | diagramy komponentów, przepływy, odpowiedzi na otwarte pytania briefu   |
| [Model danych](docs/architecture/DATA-MODEL.md)                                                       | encje, ERD, indeksy, strategia dużych tabel                             |
| [ADR-001 — Stack](docs/architecture/adr/ADR-001-stack.md)                                             | TypeScript, Next.js 15/React 19, Fastify, Prisma, MySQL 8, Redis        |
| [ADR-002 — Modular monolith](docs/architecture/adr/ADR-002-modular-monolith.md)                       | granice modułów, zdarzenia domenowe, outbox                             |
| [ADR-003 — Integracja z app](docs/architecture/adr/ADR-003-integracja-oidc-level-sync.md)             | OIDC („Zaloguj przez leadersofteams.pl") + synchronizacja poziomów      |
| [ADR-004 — Ledger punktowy i antyfraud](docs/architecture/adr/ADR-004-ledger-punktowy-i-antyfraud.md) | **anty-MLM egzekwowany architektonicznie**, guardraile                  |
| [ADR-005 — Infrastruktura](docs/architecture/adr/ADR-005-infrastruktura-vps.md)                       | współdzielony VPS, limity zasobów, ścieżka skalowania                   |
| [ADR-006 — Płatności](docs/architecture/adr/ADR-006-platnosci-w-mvp.md)                               | MVP bez przepływu pieniędzy (lead-gen z cyklem życia zlecenia)          |
| [ADR-007 — Cache / kolejki / realtime](docs/architecture/adr/ADR-007-cache-kolejki-realtime.md)       | Redis, BullMQ, outbox, Socket.IO                                        |
| [ADR-008 — CI/CD](docs/architecture/adr/ADR-008-ci-cd.md)                                             | GitHub Actions → GHCR → deploy SSH, rollback                            |
| [ADR-009 — Zero kosztów zewnętrznych](docs/architecture/adr/ADR-009-zero-kosztow-zewnetrznych.md)     | polityka 0 zł: self-hosted OSS + darmowe tiery z fallbackami            |
| [ADR-010 — Grupy, Zespoły, Case Studies](docs/architecture/adr/ADR-010-grupy-zespoly-case-studies.md) | grupy branżowe, zespoły lvl 7 / aplikacje lvl 3+, case studies zespołów |
| [**Handoff / plan sprintów**](docs/HANDOFF-OPUS.md)                                                   | **stan projektu, dług techniczny, rozpisane sprinty 4–9 z DoD**         |
| [Struktura repozytorium](docs/REPO-STRUCTURE.md)                                                      | docelowy układ monorepo (pnpm workspaces)                               |
| [Roadmapa](docs/ROADMAP.md)                                                                           | zakres MVP, fazy 0–3, kamienie decyzyjne                                |
| [Rejestr ryzyk](docs/RISKS.md)                                                                        | ryzyka techniczne i produktowe z mitygacjami                            |
