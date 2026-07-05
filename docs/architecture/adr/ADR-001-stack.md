# ADR-001: Stack technologiczny

**Status:** Zaakceptowany
**Data:** 2026-07-04
**Decydenci:** Fable 5 (architekt), Maciej Kucharski (właściciel — decyzja o MySQL)

## Kontekst

Portal leadersofteams.pl powstaje od zera. Ekosystem LoT ma precedens technologiczny (app.leadersofteams.com: TypeScript, Node.js/Express, React 19, Prisma, MySQL, Docker Compose + Traefik na VPS Hostinger). Brief dopuszcza odejście od precedensu, jeśli jest uzasadnione. Wymogi: 10 000 aktywnych użytkowników na współdzielonym VPS, marketplace dwustronny + moduł społecznościowy + system punktowy + realtime.

## Decyzja

| Warstwa                   | Wybór                                                         | Wersja      |
| ------------------------- | ------------------------------------------------------------- | ----------- |
| Język                     | TypeScript (całość, strict mode)                              | 5.x         |
| Monorepo                  | pnpm workspaces                                               | pnpm 9+     |
| Frontend                  | Next.js (App Router) / React 19                               | Next 15     |
| Backend API               | Node.js + Fastify                                             | Node 22 LTS |
| Worker (zadania tła)      | BullMQ (ten sam kod co API, osobny proces/kontener)           | —           |
| ORM                       | Prisma                                                        | 6.x         |
| Baza danych               | **MySQL 8** (osobna instancja/kontener dla portalu)           | 8.4 LTS     |
| Cache / kolejki / pub-sub | Redis                                                         | 7.x         |
| Realtime                  | Socket.IO (adapter Redis)                                     | 4.x         |
| Reverse proxy / TLS       | Traefik (istniejący na VPS)                                   | —           |
| Konteneryzacja            | Docker Compose (osobny projekt compose)                       | —           |
| CI/CD                     | GitHub Actions → GHCR → SSH deploy                            | —           |
| Walidacja                 | Zod (współdzielone schematy web ↔ api w `packages/contracts`) | —           |
| Testy                     | Vitest (unit/integration), Playwright (e2e), k6 (load)        | —           |

## Uzasadnienie

1. **Kontynuacja precedensu LoT** (TypeScript / React 19 / Prisma / Docker + Traefik) minimalizuje koszt poznawczy i operacyjny — jeden zespół utrzymuje dwa systemy w tym samym paradygmacie, współdzieli wzorce, tooling i wiedzę o VPS.
2. **MySQL 8 zamiast PostgreSQL** — decyzja właściciela: na VPS działa już MySQL i to on jest bazą app.leadersofteams.com. Prisma w pełni wspiera MySQL; żaden element architektury (ledger punktowy, outbox, indeksy) nie wymaga funkcji specyficznych dla PostgreSQL. Portal dostaje **własny kontener MySQL z osobnym wolumenem** (wymóg briefu: dwie osobne bazy). Świadomie rezygnujemy z: `LISTEN/NOTIFY` (zastępuje Redis pub/sub), zaawansowanego full-text (na starcie wystarczy MySQL FULLTEXT + `ngram` parser dla polskiego; Meilisearch jako opcja w fazie 3).
3. **Fastify zamiast Express** — ten sam model programowania, ~2–3× wyższa przepustowość na tym samym CPU (istotne na współdzielonym VPS), pierwszorzędne wsparcie TypeScript, wbudowana walidacja schematów, dojrzały ekosystem pluginów (rate-limit, helmet, websocket). Koszt przejścia z Express dla zespołu znającego Express jest bliski zeru.
4. **Next.js 15 (SSR) zamiast czystego SPA** — publiczne treści portalu (profile Liderów, zlecenia, wątki Q&A) to główny darmowy kanał akwizycji przez Google. SPA oddaje ten kanał walkowerem. App Router + React Server Components dodatkowo zmniejszają payload JS, co obniża obciążenie klienta i serwera.
5. **BullMQ na Redis** — kolejka zadań bez dodatkowej infrastruktury (Redis i tak jest potrzebny do cache), z retry/backoff/priorytetami; wystarcza z ogromnym zapasem przy tej skali (dziesiątki tysięcy jobów dziennie, nie milionów).
6. **Socket.IO zamiast surowego WebSocket** — automatyczny fallback (long-polling za restrykcyjnymi proxy firmowymi — realny problem u użytkowników B2B), pokoje (per-user, per-wątek Q&A), adapter Redis daje skalowanie horyzontalne bez sticky sessions.

## Rozważone alternatywy

- **NestJS** — odrzucony: warstwa abstrakcji i DI nadmiarowa przy jednym zespole; granice modułów egzekwujemy strukturą katalogów + regułami ESLint (`import/no-restricted-paths`), nie frameworkiem.
- **tRPC zamiast REST** — odrzucony jako jedyny interfejs: API portalu musi być konsumowalne przez app.leadersofteams.com (webhooki, endpoint rekoncyliacji) i potencjalnie kolejne brandy — REST z OpenAPI jest lingua franca. Wewnętrznie typy i tak współdzielimy przez `packages/contracts` (Zod).
- **PostgreSQL** — technicznie równorzędny lub lepszy, ale przegrywa z realiami operacyjnymi (istniejący MySQL na VPS, spójność z app). Odrzucony decyzją właściciela.
- **Mikroserwisy / osobne API per moduł** — patrz ADR-002.

## Konsekwencje

- (+) Jeden język i jeden zestaw narzędzi w całym ekosystemie LoT.
- (+) Ścieżka skalowania bez zmiany stacku (patrz ADR-005).
- (−) MySQL FULLTEXT jest słabszy dla polszczyzny niż `tsvector` w PG — akceptujemy; upgrade path: Meilisearch jako sidecar (faza 3), bez zmiany bazy.
- (−) Next.js SSR zużywa więcej RAM niż statyczne SPA — mitygacja: cache SSR (ISR/`revalidate`) dla stron publicznych, limity pamięci kontenera.
