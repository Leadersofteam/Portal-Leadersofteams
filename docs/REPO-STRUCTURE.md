# Struktura repozytorium (docelowa)

Monorepo pnpm workspaces. Poniższa struktura powstanie w fazie 0 (scaffold) — ten dokument jest jej kontraktem.

```
Portal-Leadersofteams/
├── apps/
│   ├── web/                        # Next.js 15 (App Router), React 19
│   │   ├── app/                    #   routing: (public)/ (auth)/ (dashboard)/
│   │   ├── components/
│   │   └── lib/                    #   klient API (generowany z kontraktów)
│   └── api/                        # Fastify — modular monolith (role: api | worker)
│       ├── src/
│       │   ├── modules/
│       │   │   ├── identity/       #   każdy moduł: index.ts (publiczne API),
│       │   │   ├── marketplace/    #   routes/, services/, events/ (konsumenci),
│       │   │   ├── groups/         #   repo/ (dostęp do własnych tabel)
│       │   │   ├── community/
│       │   │   ├── teams/          #   (faza 2)
│       │   │   ├── ladder/
│       │   │   ├── antifraud/
│       │   │   ├── notifications/
│       │   │   └── integration/
│       │   ├── shared/             #   outbox, event-bus (BullMQ), cache, config (Zod), logger
│       │   ├── server.ts           #   rola api: HTTP + Socket.IO
│       │   └── worker.ts           #   rola worker: dispatcher outbox + konsumenci kolejek
│       └── prisma/
│           ├── schema.prisma
│           ├── migrations/
│           └── seed.ts
├── packages/
│   ├── contracts/                  # schematy Zod + typy DTO współdzielone web ↔ api
│   ├── config/                     # wspólne configi: eslint (w tym reguły granic modułów),
│   │                               #   tsconfig, prettier
│   └── ui/                         # (opcjonalnie od fazy 1) współdzielone komponenty React
├── infra/
│   ├── docker-compose.yml          # produkcja (projekt: portal)
│   ├── docker-compose.staging.yml  # staging (projekt: portal-staging)
│   ├── Dockerfile.web
│   ├── Dockerfile.api              # jeden obraz dla ról api i worker (różny command)
│   ├── bootstrap.sh                # jednorazowa konfiguracja VPS (deploy-user, sieć traefik_public)
│   └── backup/                     # skrypty mysqldump → zewnętrzny storage + restore-test
├── .github/
│   └── workflows/
│       ├── ci.yml                  # lint + typecheck + test + e2e + gitleaks + prisma diff
│       ├── deploy-staging.yml      # merge do main
│       └── deploy-prod.yml         # tag v*
├── docs/                           # (ten katalog)
│   ├── architecture/ (OVERVIEW, DATA-MODEL, adr/)
│   ├── REPO-STRUCTURE.md
│   ├── ROADMAP.md
│   ├── RISKS.md
│   └── runbooks/                   # (od fazy 0) deploy, rollback, restore, rotacja sekretów
├── brief-leadersofteams-platforma.md
├── package.json                    # pnpm workspaces, skrypty: dev / build / test / lint
├── pnpm-workspace.yaml
└── README.md
```

## Zasady

1. **Granice modułów** w `apps/api/src/modules/*` egzekwuje ESLint (`import/no-restricted-paths`): import tylko z `modules/<x>/index.ts`, nigdy z wnętrza. Szczegóły: [ADR-002](architecture/adr/ADR-002-modular-monolith.md).
2. **Jeden schemat Prisma** (`apps/api/prisma`) — baza należy do API; web nie ma dostępu do bazy, wyłącznie przez REST.
3. **Kontrakty w `packages/contracts`** — walidacja Zod na wejściu API i typy klienta web z jednego źródła; zmiana kontraktu = zmiana w jednym miejscu, kompilator znajduje wszystkie miejsca użycia.
4. **`infra/` jest jedynym źródłem prawdy o deploymencie** — na VPS nie edytuje się niczego ręcznie; zmiany infra przechodzą przez PR jak kod.
5. Testy trzymane przy kodzie (`*.test.ts` obok plików); e2e w `apps/web/e2e/`.
