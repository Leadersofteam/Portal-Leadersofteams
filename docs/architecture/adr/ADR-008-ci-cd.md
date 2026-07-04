# ADR-008: CI/CD — GitHub Actions → GHCR → deploy SSH na VPS

**Status:** Zaakceptowany
**Data:** 2026-07-04

## Kontekst

Repo na GitHubie, deploy na współdzielony VPS z Docker Compose (ADR-005). Potrzebny powtarzalny, bezpieczny pipeline bez infrastruktury klasy enterprise (bez ArgoCD/K8s).

## Decyzja 1: Pipeline

**CI (każdy PR i push na `main`):**
1. `pnpm install` (cache) → lint (ESLint, w tym reguły granic modułów z ADR-002) → typecheck → testy unit/integration (Vitest; MySQL i Redis jako kontenery serwisowe w Actions) → build.
2. Walidacja migracji Prisma: `prisma migrate diff` przeciwko schematowi — wykrycie dryfu i migracji destrukcyjnych (destrukcyjne wymagają jawnego oznaczenia w PR).
3. E2E (Playwright) na skróconej ścieżce krytycznej: rejestracja → publikacja zlecenia → oferta → ocena → punkty.

**CD (po merge do `main` → staging; tag `v*` → produkcja):**
1. Build obrazów (`portal-web`, `portal-api-worker` — jeden obraz, dwie role przez command) → push do **GHCR** z tagiem = SHA commita + tag semver dla produkcji.
2. Deploy przez SSH (klucz deploy w GitHub Secrets, dedykowany user na VPS bez sudo, ograniczony do katalogu portalu):
   `docker compose pull` → **migracje Prisma jako jednorazowy kontener z lockiem** (`prisma migrate deploy`; advisory lock w MySQL zapobiega równoległym migracjom) → `docker compose up -d` → healthcheck (`/healthz` sprawdza MySQL, Redis, wersję) z timeoutem.
3. **Rollback automatyczny**: jeśli healthcheck nie przejdzie w 120 s → ponowny `up -d` z poprzednim tagiem obrazu (zapisywany w pliku na VPS). Migracje projektujemy jako **expand/contract** (najpierw addytywne, usunięcia w osobnym, późniejszym release) — dzięki temu poprzednia wersja aplikacji zawsze działa na nowym schemacie i rollback nie wymaga cofania migracji.

## Decyzja 2: Środowiska

| Środowisko | Gdzie | Trigger | Dane |
|---|---|---|---|
| `staging` | ten sam VPS, osobny projekt compose (`portal-staging`), subdomena `staging.leadersofteams.pl` za basic-auth w Traefiku, mocno przycięte limity zasobów | merge do `main` | syntetyczne/seed, nigdy kopia produkcji z danymi osobowymi |
| `production` | projekt compose `portal` | tag `v*` (świadome wydanie) | produkcyjne |

## Decyzja 3: Konfiguracja i sekrety

- Konfiguracja przez zmienne środowiskowe (walidowane Zod na starcie procesu — aplikacja nie wstaje z błędną konfiguracją).
- Sekrety: GitHub Secrets (CI) + plik `.env` na VPS poza repo (chmod 600, dostęp tylko deploy-user). Rotacja opisana w runbooku.
- Żadnych sekretów w obrazach ani w repo (skan `gitleaks` w CI).

## Konsekwencje

- (+) Deploy powtarzalny, wersjonowany obrazami; rollback = poprzedni tag; zero ręcznych kroków na VPS poza awariami.
- (+) Staging na tym samym VPS = wierne środowisko bez kosztu drugiej maszyny (świadomy kompromis: obciążenie stagingu widzi produkcja — stąd przycięte limity i wyłączanie stagingu poza godzinami testów, jeśli zajdzie potrzeba).
- (−) Wymaga jednorazowej konfiguracji VPS (deploy-user, sieć Traefika, katalogi) — opisana jako skrypt `infra/bootstrap.sh` w fazie 0.
