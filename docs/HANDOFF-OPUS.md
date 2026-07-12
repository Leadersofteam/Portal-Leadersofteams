# Handoff dla Claude Code Opus 4.8 — stan projektu i plan sprintów

**Ostatnia aktualizacja:** 2026-07-12 · **Branch tej sesji:** `fix/api-tsup-noexternal-workspace`
**Wykonawca:** Opus 4.8 (kontynuacja) · **Stan:** ✅ Sprint 4 · ✅ **Sprint 5 (`community` — Q&A/mentoring)** w `main` (PR #8), **zweryfikowany 2026-07-12** · ✅ **deploy staging + redesign + fixy runtime** · ▶ trwa: **Sprint 4.5 (stabilizacja)** → następny **Sprint 6 (hardening/launch)**

> **⚠️ Dryf dok↔kod naprawiony 2026-07-12:** ten dokument opisywał Sprint 5 jako „następny do zrobienia".
> W rzeczywistości moduł `community` był już w `main` (zmergowany PR #8 `claude/lot-portal-sprints-5-9-*`) —
> tylko wskaźnik sprintu nie został zaktualizowany. Zweryfikowano end-to-end: 73 testy zielone (11 community
> + anty-MLM `subscriptions`), lint/typecheck/build czyste. **Nie odtwarzać Sprintu 5.** Realny następny
> przyrost to Sprint 4.5 (niżej), po nim Sprint 6.

Ten dokument jest **jedynym punktem startu** dla kontynuacji prac. Czytaj w kolejności:

1. [Brief kontekstowy](../brief-leadersofteams-platforma.md) — rozstrzygnięcia biznesowe (nienaruszalne),
2. [OVERVIEW architektury](architecture/OVERVIEW.md) + ADR-y 001–013,
3. [Strategia różnicowania i wzrostu](strategy/DIFFERENTIATION-AND-GROWTH.md) — model Trzech Płaszczyzn (anty-MLM), Academy, polecenia (ADR-011/012/013),
4. ten dokument (stan + sprinty),
5. [ROADMAP](ROADMAP.md) i [RISKS](RISKS.md).

> **Uwaga o branchu (2026-07-11):** praca Sprintu 4 + strategia jest w `main`. Sesja deploy+design
> (poniżej §0) siedzi na `fix/api-tsup-noexternal-workspace` (oparta o `main`) — **do zmergowania do
> `main` w Sprincie 4.5**, potem Sprint 5 z nowej gałęzi. PR tworzy właściciel (brak `gh` na VPS).

---

## 0. Ostatnia sesja (2026-07-11) — deploy staging, fixy runtime, redesign, plan integracji

Wykonane i zweryfikowane w przeglądarce na `https://staging.leadersofteams.pl` (za basic-auth):

- **Deploy STAGING** na VPS (obok App i Zodiamo): `/docker/portal-staging`, projekt compose
  `portal-staging`, sieć Traefika `n8n_default` + resolver `mytlschallenge` (override
  `infra/staging.override.yml`, niecommitowany). Wdrożenie **ręczne** — auto-deploy CI świadomie
  NIE uzbrojony.
- **3 bugi repo (blokowały też produkcję/CD) — naprawione i wypchnięte:**
  1. `apps/api/tsup.config.ts` → `noExternal: [/^@lot\//]` (bez tego prod Node pada
     `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` na `@lot/contracts`).
  2. `infra/Dockerfile.web` → `ENV API_INTERNAL_URL=http://api:3001` przed buildem (cel rewrite'u
     `/api/*` jest zapiekany w build-time; bez tego web proxował do `localhost:3001` → wszystkie /api 500).
  3. `apps/web/next.config.ts` → `skipTrailingSlashRedirect` + dokładna reguła rewrite `/api/socket.io/`
     (Next gubił końcowy ukośnik → handshake Socket.IO 404/500).
- **Redesign UI/UX + responsywność (mobile + hamburger)**: `apps/web/app/globals.css` przebudowany
  w duchu design-systemu App (indigo/Inter/tokeny) + atmosfera/gradienty/hover-lift; `SiteHeader`
  (`apps/web/components/site-header.tsx`) z menu mobilnym; typografia treści (h2/h3/listy/tabele).
  Zweryfikowane desktop+mobile (390px, headless Chromium): home, zlecenia, drabinka, formularze,
  panel zalogowany. Auth/rejestracja działają E2E (register 201, /auth/me 200).
- **Plan strategiczny**: roadmapa sprintów + **architektura integracji App↔Portal** (patrz nowy
  `docs/architecture/INTEGRATION-APP-PORTAL.md`) + mapa funkcji ekosystemu.

**Dług z tej sesji do domknięcia (Sprint 4.5):** merge gałęzi → `main`; **seed danych demo** (pusta
tabela poziomów w `/drabinka`, przykładowe zlecenia/grupy — `apps/api/prisma/seed.ts`); `openssl`
w `Dockerfile.api` (ostrzeżenie Prisma); usunięcie kont testowych z bazy staging; decyzja o
**prod-VPS** (osobny/większy — 8 GB nie udźwignie 3. bazy MySQL + App pod ruchem).

**Sprint 4.5 — postęp (2026-07-12):** ✅ weryfikacja bramek na realnym MySQL/Redis (73 testy, lint,
typecheck, build — potwierdzenie zmergowanego Sprintu 5); ✅ `openssl`+`ca-certificates` w obu
warstwach `infra/Dockerfile.api`; ✅ reconciliacja docs (ten plik + ROADMAP). Kolejno: bogaty
**demo-seed** (`apps/api/prisma/seed-demo.ts`, env-guarded `SEED_DEMO=1`), uruchomienie seedów na
staging + czyszczenie kont testowych, deploy + e2e, przygotowanie merge → `main`.
**Decyzja właściciela o prod-VPS:** zostajemy na obecnym 8 GB, rewizja przy launchu (Sprint 6) —
wtedy twarde limity pamięci prod-MySQL w compose + pilnowanie swapu (4 G).

---

## 1. Stan projektu (co jest ZROBIONE i zweryfikowane)

| Etap                             | Commit    | Zakres                                                                                                                                                                                                                                                                                        |
| -------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architektura                     | `5ad095d` | 10 ADR-ów, model danych, roadmapa, rejestr ryzyk                                                                                                                                                                                                                                              |
| Faza 0 — fundament               | `a6e5a18` | monorepo pnpm, CI/CD (GitHub Actions → GHCR → SSH), infra compose prod/staging/dev, backupy, auth (argon2id, sesje Redis), outbox+worker BullMQ, runbooki                                                                                                                                     |
| Sprint 1–2 — marketplace         | `08a295e` | profile Liderów+portfolio, słownik branż, pełny cykl życia zleceń z blokadą optymistyczną, oferty z bramką `minLevel`, listing z FULLTEXT, frontend                                                                                                                                           |
| Sprint 2–3 — Drabinka            | `1836767` | oceny dwustronne (publikacja symultaniczna), append-only ledger `PointEvent`, ruleset v1, karencja 7 dni, malejące zwroty, detekcja wzajemności → HOLD → moderacja (RBAC), `/drabinka`, `/panel/punkty`                                                                                       |
| Sprint 4 — grupy + powiadomienia | `234d30a` | moduły `groups` (grupy OPEN/MODERATED od lvl 2, posty/komentarze/reakcje, feed kursorem) i `notifications` (konsumenci zdarzeń → in-app, dedupeKey); Socket.IO sygnał-only (ADR-007); dzwonek w headerze; `/grupy`, `/powiadomienia`; **test anty-MLM: aktywność w grupach = 0 `PointEvent`** |
| Strategia — kierunek             | `157522d` | model Trzech Płaszczyzn (anty-MLM), ADR-011 (polecenia — afiliacja 1-poziomowa), ADR-012 (Academy/kursy), ADR-013 (monetyzacja/płatności, rewizja ADR-006/009), aktualizacja ROADMAP/RISKS. **Same dokumenty — zero zmian kodu**                                                              |

**Jakość:** 55 testów (unit + integracyjne na realnym MySQL/Redis), lint z twardymi granicami modułów, typecheck strict, build produkcyjny, ręczne e2e każdego sprintu na zbudowanym API z realnym workerem. CI odpala wszystko na każdym pushu.

**Architektura w pigułce:** modular monolith (Fastify) z modułami `identity / marketplace / ladder / antifraud / groups / notifications` (+ zarezerwowane: `community / teams / integration` oraz zaprojektowane w ADR-011/012/013: `referral / academy / billing`); komunikacja przez outbox→BullMQ; realtime Socket.IO (sygnał-only, ADR-007); Next.js 15 SSR z rewrites do API (same-origin cookies); MySQL 8 + Redis 7; wszystko 0 zł (ADR-009, wyjątek: prowizje PSP przy monetyzacji — ADR-013).

**Kluczowe inwarianty (nie do naruszenia — patrz ADR-002/004/010):**

- import z modułu tylko przez `modules/<x>/index.ts` (lint to egzekwuje),
- `ladder` subskrybuje wyłącznie `marketplace.*`/`community.*` (test `subscriptions.test.ts`),
- zamknięty enum `PointEventType` — dodanie typu = migracja + rewizja ADR-004,
- ledger append-only; wszystkie skutki uboczne mutacji przez outbox w tej samej transakcji,
- każdy punkt wymaga uznania przez innego człowieka; zero punktów za aktywność w groups/teams.

## 2. Zidentyfikowany dług / luki (do domknięcia w najbliższych sprintach)

| #      | Luka                                                                                                             | Gdzie domknąć                             |
| ------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| ~~D1~~ | ✅ **ZROBIONE (Sprint 4)** — moduł `notifications` konsumuje zdarzenia → wpisy in-app + sygnał realtime          | —                                         |
| ~~D2~~ | ✅ **ZROBIONE (Sprint 4)** — Socket.IO sygnał-only (pokój `user:{id}`, handshake sesyjnym cookie, Redis pub/sub) | —                                         |
| ~~D3~~ | ✅ **ZROBIONE** — cache-aside Redis (`shared/cache.ts`, inwalidacja przez wersję namespace; `/me/ladder` NIGDY nie cache'owany). Test w `hardening.integration.test.ts` | —                        |
| ~~D4~~ | ✅ **ZROBIONE (scaffolding)** — warstwa e-mail (`shared/mail.ts`): realny transport Brevo + fallback no-op; weryfikacja adresu, reset hasła (flow `verify-email`/`request-password-reset`/`reset-password`). **Aktywacja wysyłki = podanie `BREVO_API_KEY` przez właściciela** (do launchu). Digest powiadomień: do dołożenia | Aktywacja: launch |
| **D5** | ❌ **GAP** — brak e2e Playwright (skrót ścieżki krytycznej z ADR-008 CI). Backend pokryty testami integracyjnymi, brak testu przeglądarkowego | Sprint 6 (otwarte)       |
| ~~D6~~ | ✅ **ZROBIONE** — RODO: `DELETE /me` = anonimizacja w miejscu (ledger ZACHOWANY, treści `[treść usunięta]`, profil ukryty, sesja unieważniona) + `GET /me/export`. Test w `hardening` | —                        |
| ~~D7~~ | ✅ **ZROBIONE** — rate-limity świeżych kont (`shared/quota.ts`) + „zgłoś" (`POST /reports` → `ModerationCase` REPORT, soft-dedup) + **Turnstile flag-gated** (`shared/turnstile.ts`, wpięty w `/auth/register`, widget na `/rejestracja`; OFF bez kluczy). Aktywacja = klucze Cloudflare przy launchu | — (aktywacja: launch) |
| D8     | Rating na profilu zlicza oceny wszystkimi kanałami poprawnie, ale brak listy „opinie o Liderze" na profilu       | niski priorytet |
| ~~D9~~ | ✅ **CZĘŚCIOWO (2026-07-11)** — STAGING wdrożony i zweryfikowany na VPS (ręcznie, §0). Zostaje: **launch** — prod (decyzja: zostajemy na 8 GB z limitami RAM) + zdjęcie basic-auth | Launch                   |
| **D10**| ❌ **GAP (opcjonalne)** — panel Bull Board (wgląd w kolejki) niewdrożony                                          | Sprint 6, opcjonalnie    |

> **Audyt stanu kodu vs docs (2026-07-12):** przy wejściu w Sprint 6 potwierdzono, że backend Sprintu 6
> jest w większości ZROBIONY i zielony (73 testy): cache-aside (D3), e-mail flag-gated + weryfikacja/reset
> (D4), RODO (D6), rate-limity + „zgłoś" (D7). To kolejny przypadek dryfu dok↔kod (jak Sprint 5) — PR #8
> „sprints-5-9" niósł istotnie więcej niż opisywały docs. **Realne, niezaimplementowane luki:** Turnstile,
> e2e Playwright (D5), load-test k6, Bull Board (D10), oraz aktywacja launchu (sekrety właściciela).

## 3. Rekomendowane kolejne kroki — plan sprintów dla Opus 4.8

Pracuj **sprint po sprincie**: jeden sprint = jeden spójny, zweryfikowany i wypchnięty przyrost. Po każdym sprincie: `pnpm lint && pnpm typecheck && pnpm test` (integracyjne na `infra/docker-compose.dev.yml`), `pnpm build`, ręczny e2e nowej funkcji na zbudowanym API, commit z opisem, push na branch roboczy.

> **▶ TU ZACZYNASZ: Sprint 4.5 (stabilizacja), potem Sprint 6.** Sprinty 4 i 5 są zamknięte (niżej, dla kontekstu wzorca — `groups`/`notifications`/`community` to wzorzec dla kolejnych modułów). Po Sprincie 6 (launch) wchodzą Faza 2 (integracja + `teams`, sprinty 7–9) i **Faza Academy + Monetyzacja** (moduły `billing → academy → referral`, ADR-011/012/013) — patrz [ROADMAP](ROADMAP.md).

### ✅ SPRINT 4 — Grupy branżowe + fundament powiadomień (`groups`, `notifications`) — ZROBIONE (`234d30a`)

Dostarczony i zweryfikowany (55 testów, e2e na zbudowanym API + workerem). Trzymaj ten moduł jako **wzorzec** dla kolejnych: `groups`/`notifications` powielają konwencję `marketplace`/`ladder` (index.ts jako publiczne API, serwisy z DI, zdarzenia przez `emitEvent` w transakcji, idempotentni konsumenci, testy przez `buildServer`+`app.inject`). Dispatcher workera obsługuje **wielu konsumentów na jeden typ zdarzenia** (`Record<string, EventHandler[]>`). Oryginalna specyfikacja poniżej — dla odniesienia.

Cel: warstwa „portal jak Facebook" (ADR-010 dec. 1) + zdarzenia przestają lecieć w próżnię.

1. **Prisma v4**: `Group` (industryId?, typ OPEN/MODERATED, createdById), `GroupMembership` (rola MEMBER/MODERATOR, status ACTIVE/PENDING/BANNED, unikat group+user), `Post` (typ DISCUSSION/CASE_STUDY/IDEA, `teamId` nullable — pod fazę 2, status moderacji), `Comment` (parentId 1 poziom), `Reaction` (unikat post+user), `Notification` (userId, typ, payload, readAt). Indeksy: `Post(groupId, createdAt)`, `Comment(postId, createdAt)`, `Notification(userId, readAt, createdAt)`. FULLTEXT na `Post(title, body)`. Seed grup systemowych (po jednej na branżę ze słownika).
2. **Moduł `groups`**: tworzenie grup od lvl 2 (przez `ladder.getLevel` — publiczne API), join/leave (PENDING dla MODERATED, akceptacja przez moderatora grupy), posty/komentarze/reakcja „doceniam", feed chronologiczny z paginacją kursorem (BEZ infinite scroll — ADR-010), listing grup. Zdarzenia outbox: `groups.post_published`, `groups.comment_added`, `groups.membership_requested/accepted`. **ŻADNEJ krawędzi do `ladder`.**
3. **Moduł `notifications`**: tabela + konsument zdarzeń (`marketplace.offer_submitted/accepted`, `marketplace.order_*`, `marketplace.review_published`, `ladder.level_achieved`, `groups.*`) → wpisy `Notification`; API `GET /me/notifications` + `POST /me/notifications/read`; badge w headerze.
4. **Frontend**: `/grupy` (listing), `/grupy/[id]` (feed + formularz posta + komentarze + reakcje + join/leave), `/grupy/[id]/post/[postId]`, dzwonek powiadomień w layoucie.
5. **Testy integracyjne**: cykl grupy (utworzenie od lvl 2 — odmowa dla lvl 0; join MODERATED z akceptacją; post/komentarz/reakcja; unikat reakcji), powiadomienia z realnych zdarzeń, **test anty-MLM: aktywność w grupach nie tworzy żadnego `PointEvent`**.

DoD: 55+ testów zielonych; feed grupy działa e2e na zbudowanym API; zero zdarzeń groups.* w subskrypcjach ladder.

### ✅ SPRINT 5 — Q&A/mentoring w grupach = druga ścieżka punktowania (moduł `community`) — ZROBIONE (w `main`, PR #8; zweryfikowany 2026-07-12)

Cel: domknięcie równowagi obu dróg awansu z briefu (3.3) — najważniejszy brakujący element produktu.
**Stan:** dostarczone i zmergowane do `main`; 11 testów integracyjnych community zielonych (akceptacja→50 pkt,
głos kwalifikowany/niekwalifikowany, malejące zwroty, czapka tygodniowa 300, awans obiema ścieżkami,
RECIPROCITY_QA→HOLD, RATE_LIMIT_QA→HOLD). Wartości ścieżki w `modules/ladder/rules.ts` (ruleset v1).
Frontend: `apps/web/app/grupy/[id]/pytania/` + `apps/web/app/watki/[id]/`. Specyfikacja poniżej — dla odniesienia.

1. **Prisma v5**: `Thread` (groupId, status OPEN/ANSWERED/CLOSED, FULLTEXT title+body), `Answer` (isAccepted — jedna per wątek), `AnswerVote` (unikat answer+user).
2. **Moduł `community`**: wątki w grupach, odpowiedzi, głos „w górę", akceptacja odpowiedzi przez autora pytania (nie można akceptować własnej odpowiedzi na własne pytanie ani głosować na siebie). Zdarzenia: `community.answer_accepted` (payload: answerId, answerAuthorUserId, questionAuthorUserId, groupId, accountAges…), `community.answer_upvoted` (payload z danymi głosującego: wiek konta, własna aktywność).
3. **Ladder — konsument ścieżki community** (rozszerzenie `modules/ladder`): `ANSWER_ACCEPTED` = 50 pkt bazowych; `ANSWER_UPVOTED_QUALIFIED` = 10 pkt za głos **kwalifikowany** (głosujący: konto ≥ 14 dni + ≥ 1 własna aktywność); malejące zwroty od tego samego uznającego (`counterpartyId` = userId uznającego, ta sama krzywa 0.5^n); **czapka tygodniowa** ścieżki community (start: 300 pkt/tydz. — realizuje „progres tygodniowy" z briefu; nadwyżka = wpis 0 pkt z wyjaśnieniem w meta). Wartości do rejestru w `rules.ts` (ruleset pozostaje v1 — to pierwsze wypełnienie zaprojektowanych typów, nie zmiana reguł).
4. **Antifraud**: kwalifikacja głosów + limit szybkości (max N punktowanych zdarzeń community dziennie → nadwyżka HOLD), wzajemna adoracja pary userów (A akceptuje B, B akceptuje A w krótkim oknie → FraudSignal RECIPROCITY_QA + HOLD).
5. **Frontend**: zakładka „Pytania" w grupie, wątek z odpowiedziami/głosami/akceptacją, sekcja Q&A w `/panel/punkty` (rozbicie ścieżek już jest).
6. **Testy**: akceptacja → 50 pkt PENDING; głos niekwalifikowany → brak punktów; kwalifikowany → 10 pkt; czapka tygodniowa; po dojrzeniu obu ścieżek `computeLevel` z wymogiem 20% od L4 działa na realnych danych; wzajemna adoracja → HOLD.

DoD: użytkownik może realnie awansować oboma ścieżkami; testy obu ścieżek + guardów zielone.

### SPRINT 6 — Hardening, bezpieczeństwo, launch (release `v0.1.0`) — W WIĘKSZOŚCI ZROBIONE (backend); otwarte: Turnstile, e2e, k6, launch

Stan po audycie 2026-07-12 (patrz §2). Backend hardeningu jest w większości dostarczony i zielony.

1. ✅ **E-mail (Brevo, ADR-009)** — weryfikacja adresu, reset hasła (`shared/mail.ts` + flow); realny transport + no-op fallback. **Otwarte:** dzienny digest (job w workerze) + aktywacja `BREVO_API_KEY` (właściciel, przy launchu).
2. **Antybot/antyspam (R-03/R-13):** ✅ rate-limity świeżych kont (`shared/quota.ts`) + ✅ „zgłoś" (`POST /reports` → `ModerationCase` REPORT, soft-dedup) + ✅ **Cloudflare Turnstile flag-gated** (`shared/turnstile.ts`, fail-closed przy ON; `/auth/register` wymaga tokenu; widget na `/rejestracja` gdy `NEXT_PUBLIC_TURNSTILE_SITE_KEY`). Aktywacja: klucze Cloudflare przy launchu (`docs/runbooks/sekrety.md`).
3. ✅ **RODO (R-10)** — `DELETE /me` = anonimizacja w miejscu (ledger ZACHOWANY, `anonymizedAt`, treści `[treść usunięta]`, profil ukryty, sesja unieważniona); `GET /me/export`.
4. ✅ **Cache (ADR-007, D3)** — cache-aside Redis (`shared/cache.ts`) z inwalidacją przez wersję namespace; `/me/ladder` NIGDY nie cache'owany.
5. ❌ **OTWARTE: E2E Playwright w CI** (ścieżka: rejestracja → zlecenie → oferta → cykl → ocena) + **load test k6** (500 równoczesnych) z wynikami w `docs/perf/`. **Uwaga:** k6 na współdzielonym 8 GB VPS ryzykuje kontencją z App-prod/Zodiamo — planować poza szczytem lub na osobnym celu; kamień decyzyjny właściciela.
6. ❌ **OTWARTE: Launch** — prod na obecnym 8 GB (decyzja właściciela) z twardymi limitami RAM MySQL + swap; staging → smoke → tag `v0.1.0` → produkcja za flagą; zdjęcie basic-auth; Netdata + Uptime Kuma; Bull Board (D10) za rolą ADMIN. Sekrety: `docs/runbooks/sekrety.md`.

DoD: staging działa na VPS (✅); Turnstile + e2e + k6 w budżecie (p95 < 300 ms publiczne z cache); tag `v0.1.0`.

### FAZA 2 (sprinty 7–9) — Integracja z app.leadersofteams.com + moduł Zespołów

- **Sprint 7**: OIDC provider (`oidc-provider` na Fastify, tabele grantów, rotacja JWKS, claims `lot_level`/`lot_leader_status`), rejestracja app jako klienta, ekran zgody.
- **Sprint 8**: webhook `level-changed` (HMAC, retry/DLQ na `ladder.level_achieved` — zdarzenie już jest emitowane!), endpoint rekoncyliacyjny `GET /api/integration/levels?since=`, tabela `WebhookDelivery`; kontrakt dla zespołu app w `docs/architecture/INTEGRATION-CONTRACT.md`.
- **Sprint 9**: moduł `teams` (ADR-010 dec. 2): `Team` (tworzenie od lvl 7), profil publiczny, `TeamOpening` (rekrutacja ciągła, modele współpracy — bez pieniędzy), `TeamApplication` (od lvl 3, poziom sprawdzany w momencie aplikacji), `Post.teamId` aktywny (case studies w imieniu zespołu), `Team.appTeamRef`. **Zero punktów za cokolwiek w teams — test.**

### FAZA 3+ (backlog, kolejność po danych z launchu)

Monetyzacja i wzrost — **kierunek już zaprojektowany** (ADR-011 polecenia, ADR-012 Academy, ADR-013 płatności; osobna Faza Academy+Monetyzacja w [ROADMAP](ROADMAP.md)) · Meilisearch self-hosted · rankingi opt-in · weryfikacja Firm (KRS/NIP) jako odznaka · sesje mentoringowe 1:1 (`MENTORSHIP_SESSION_RATED`) · czat przy zleceniu · PWA/mobile.

## 4. Zasady pracy (obowiązują bez wyjątku)

1. **Nie reinterpretuj briefu ani ADR-ów.** Zmiana reguł punktacji = nowa wersja rulesetu + wpis w publicznym changelogu + zgoda właściciela.
2. **Bramki jakości przed każdym pushem**: lint (granice modułów!), typecheck, pełne testy na realnym MySQL/Redis, build, ręczny e2e nowej funkcji na zbudowanym API.
3. **0 zł** (ADR-009) — żadnych płatnych usług; nowe zależności tylko OSS/darmowe tiery z fallbackiem.
4. **Wzorce z kodu są kontraktem**: nowe moduły dokładnie jak `marketplace`/`ladder`/`groups` (index.ts jako publiczne API, serwisy z DI przez argumenty, zdarzenia przez `emitEvent` w transakcji, idempotentni konsumenci, testy integracyjne przez `buildServer` + `app.inject`).
5. **Branch**: `claude/lot-portal-sprints-4-9-szq1jf`, push po każdym sprincie; PR tworzy wyłącznie właściciel.
6. **Kamienie decyzyjne właściciela** (nie blokuj się — pytaj i jedź dalej): kalibracja wartości punktowych community (sprint 5), sekrety deploy + parametry VPS (sprint 6), plan seedingu rynku (przed launchem), monetyzacja/kalibracja prowizji i nagród afiliacyjnych (Faza Academy — ADR-013).

## 5. Szybki start środowiska

```bash
pnpm install
docker compose -f infra/docker-compose.dev.yml up -d --wait
cd apps/api && DATABASE_URL='mysql://portal:portal@localhost:3306/portal' \
  pnpm exec prisma db push && pnpm exec prisma db seed
# testy:
DATABASE_URL='mysql://portal:portal@127.0.0.1:3306/portal' REDIS_URL='redis://127.0.0.1:6379' pnpm test
# dev: apps/api → pnpm dev (port 3001), pnpm dev:worker; apps/web → pnpm dev (port 3000)
```

**Środowisko zdalne (web/CI-sandbox) bez Dockera** — jeśli `docker compose` nie działa (brak
`/var/run/docker.sock`), postaw zależności lokalnie (potwierdzony przepływ ze Sprintu 4):

```bash
redis-server --daemonize yes --save '' --appendonly no        # Redis (zwykle preinstalowany)
DEBIAN_FRONTEND=noninteractive apt-get update -qq && apt-get install -y -qq mysql-server   # MySQL 8 (Ubuntu 24.04)
mysqld --user=mysql --daemonize                               # (raz: mysqld --initialize-insecure --user=mysql)
mysql -uroot -e "CREATE DATABASE IF NOT EXISTS portal; \
  CREATE USER IF NOT EXISTS 'portal'@'%' IDENTIFIED BY 'portal'; \
  GRANT ALL ON portal.* TO 'portal'@'%'; FLUSH PRIVILEGES;"
# dalej jak wyżej: prisma db push --skip-generate + db seed + pnpm test
```

Komendy dotykające bazy/Redis mogą wymagać `dangerouslyDisableSandbox` (sandbox blokuje część I/O).
