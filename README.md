# Portal Leaders of Teams

Platforma leadersofteams.pl — marketplace usług B2B (Firmy ↔ Liderzy) połączony ze społecznością mentoringową i systemem poziomów **Drabinka Lidera**, którego najwyższe szczeble odblokowują darmowy dostęp i własny zespół w [app.leadersofteams.com](https://app.leadersofteams.com).

**Status:** etap projektowania architektury (przed implementacją).

## Dokumentacja

| Dokument | Zawartość |
|---|---|
| [Brief kontekstowy](brief-leadersofteams-platforma.md) | wizja produktu i rozstrzygnięcia biznesowe (dokument źródłowy) |
| [Architektura — przegląd](docs/architecture/OVERVIEW.md) | diagramy komponentów, przepływy, odpowiedzi na otwarte pytania briefu |
| [Model danych](docs/architecture/DATA-MODEL.md) | encje, ERD, indeksy, strategia dużych tabel |
| [ADR-001 — Stack](docs/architecture/adr/ADR-001-stack.md) | TypeScript, Next.js 15/React 19, Fastify, Prisma, MySQL 8, Redis |
| [ADR-002 — Modular monolith](docs/architecture/adr/ADR-002-modular-monolith.md) | granice modułów, zdarzenia domenowe, outbox |
| [ADR-003 — Integracja z app](docs/architecture/adr/ADR-003-integracja-oidc-level-sync.md) | OIDC („Zaloguj przez leadersofteams.pl") + synchronizacja poziomów |
| [ADR-004 — Ledger punktowy i antyfraud](docs/architecture/adr/ADR-004-ledger-punktowy-i-antyfraud.md) | **anty-MLM egzekwowany architektonicznie**, guardraile |
| [ADR-005 — Infrastruktura](docs/architecture/adr/ADR-005-infrastruktura-vps.md) | współdzielony VPS, limity zasobów, ścieżka skalowania |
| [ADR-006 — Płatności](docs/architecture/adr/ADR-006-platnosci-w-mvp.md) | MVP bez przepływu pieniędzy (lead-gen z cyklem życia zlecenia) |
| [ADR-007 — Cache / kolejki / realtime](docs/architecture/adr/ADR-007-cache-kolejki-realtime.md) | Redis, BullMQ, outbox, Socket.IO |
| [ADR-008 — CI/CD](docs/architecture/adr/ADR-008-ci-cd.md) | GitHub Actions → GHCR → deploy SSH, rollback |
| [Struktura repozytorium](docs/REPO-STRUCTURE.md) | docelowy układ monorepo (pnpm workspaces) |
| [Roadmapa](docs/ROADMAP.md) | zakres MVP, fazy 0–3, kamienie decyzyjne |
| [Rejestr ryzyk](docs/RISKS.md) | ryzyka techniczne i produktowe z mitygacjami |
