# Handoff dla Claude Code Opus 4.8 — stan projektu i plan sprintów

**Ostatnia aktualizacja:** 2026-07-08 · **Branch roboczy:** `claude/lot-portal-sprints-4-9-szq1jf`
**Wykonawca:** Opus 4.8 (kontynuacja) · **Stan:** ✅ Sprint 4 dostarczony · ▶ następny: **Sprint 5**

Ten dokument jest **jedynym punktem startu** dla kontynuacji prac. Czytaj w kolejności:

1. [Brief kontekstowy](../brief-leadersofteams-platforma.md) — rozstrzygnięcia biznesowe (nienaruszalne),
2. [OVERVIEW architektury](architecture/OVERVIEW.md) + ADR-y 001–013,
3. [Strategia różnicowania i wzrostu](strategy/DIFFERENTIATION-AND-GROWTH.md) — model Trzech Płaszczyzn (anty-MLM), Academy, polecenia (ADR-011/012/013),
4. ten dokument (stan + sprinty),
5. [ROADMAP](ROADMAP.md) i [RISKS](RISKS.md).

> **Uwaga o branchu:** pracuj i pushuj **wyłącznie** na `claude/lot-portal-sprints-4-9-szq1jf`
> (na nim jest cała aktualna praca: Sprint 4 + strategia). PR tworzy właściciel.

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
| D3     | Cache aplikacyjny Redis (cache-aside z ADR-007) nieużywany — listingi/feedy biją prosto w MySQL                  | Sprint 6                                  |
| D4     | E-mail (Brevo) niepodpięty — brak weryfikacji e-maila, resetu hasła, digestów                                    | Sprint 6                                  |
| D5     | Brak e2e Playwright (skrót ścieżki krytycznej z ADR-008 CI)                                                      | Sprint 6                                  |
| D6     | Brak RODO: usunięcie konta (anonimizacja), eksport danych                                                        | Sprint 6                                  |
| D7     | Brak Turnstile i rate-limitów publikacji dla świeżych kont (R-03, R-13)                                          | Sprint 5/6                                |
| D8     | Rating na profilu zlicza oceny wszystkimi kanałami poprawnie, ale brak listy „opinie o Liderze" na profilu       | Sprint 5 (przy grupach) — niski priorytet |
| D9     | `docker-compose` deploy nieprzetestowany na realnym VPS (sekrety GitHub nieustawione — czeka na właściciela)     | Sprint 6 przed launchem                   |
| D10    | Panel Bull Board (wgląd w kolejki) niewdrożony                                                                   | Sprint 6, opcjonalnie                     |

## 3. Rekomendowane kolejne kroki — plan sprintów dla Opus 4.8

Pracuj **sprint po sprincie**: jeden sprint = jeden spójny, zweryfikowany i wypchnięty przyrost. Po każdym sprincie: `pnpm lint && pnpm typecheck && pnpm test` (integracyjne na `infra/docker-compose.dev.yml`), `pnpm build`, ręczny e2e nowej funkcji na zbudowanym API, commit z opisem, push na branch roboczy.

> **▶ TU ZACZYNASZ: Sprint 5** (moduł `community`). Sprint 4 jest zamknięty (niżej, dla kontekstu wzorca). Po sprintach 5–9 (Faza 1/2) wchodzi **Faza Academy + Monetyzacja** (moduły `billing → academy → referral`, ADR-011/012/013) — patrz [ROADMAP](ROADMAP.md).

### ✅ SPRINT 4 — Grupy branżowe + fundament powiadomień (`groups`, `notifications`) — ZROBIONE (`234d30a`)

Dostarczony i zweryfikowany (55 testów, e2e na zbudowanym API + workerem). Trzymaj ten moduł jako **wzorzec** dla kolejnych: `groups`/`notifications` powielają konwencję `marketplace`/`ladder` (index.ts jako publiczne API, serwisy z DI, zdarzenia przez `emitEvent` w transakcji, idempotentni konsumenci, testy przez `buildServer`+`app.inject`). Dispatcher workera obsługuje **wielu konsumentów na jeden typ zdarzenia** (`Record<string, EventHandler[]>`). Oryginalna specyfikacja poniżej — dla odniesienia.

Cel: warstwa „portal jak Facebook" (ADR-010 dec. 1) + zdarzenia przestają lecieć w próżnię.

1. **Prisma v4**: `Group` (industryId?, typ OPEN/MODERATED, createdById), `GroupMembership` (rola MEMBER/MODERATOR, status ACTIVE/PENDING/BANNED, unikat group+user), `Post` (typ DISCUSSION/CASE_STUDY/IDEA, `teamId` nullable — pod fazę 2, status moderacji), `Comment` (parentId 1 poziom), `Reaction` (unikat post+user), `Notification` (userId, typ, payload, readAt). Indeksy: `Post(groupId, createdAt)`, `Comment(postId, createdAt)`, `Notification(userId, readAt, createdAt)`. FULLTEXT na `Post(title, body)`. Seed grup systemowych (po jednej na branżę ze słownika).
2. **Moduł `groups`**: tworzenie grup od lvl 2 (przez `ladder.getLevel` — publiczne API), join/leave (PENDING dla MODERATED, akceptacja przez moderatora grupy), posty/komentarze/reakcja „doceniam", feed chronologiczny z paginacją kursorem (BEZ infinite scroll — ADR-010), listing grup. Zdarzenia outbox: `groups.post_published`, `groups.comment_added`, `groups.membership_requested/accepted`. **ŻADNEJ krawędzi do `ladder`.**
3. **Moduł `notifications`**: tabela + konsument zdarzeń (`marketplace.offer_submitted/accepted`, `marketplace.order_*`, `marketplace.review_published`, `ladder.level_achieved`, `groups.*`) → wpisy `Notification`; API `GET /me/notifications` + `POST /me/notifications/read`; badge w headerze.
4. **Frontend**: `/grupy` (listing), `/grupy/[id]` (feed + formularz posta + komentarze + reakcje + join/leave), `/grupy/[id]/post/[postId]`, dzwonek powiadomień w layoucie.
5. **Testy integracyjne**: cykl grupy (utworzenie od lvl 2 — odmowa dla lvl 0; join MODERATED z akceptacją; post/komentarz/reakcja; unikat reakcji), powiadomienia z realnych zdarzeń, **test anty-MLM: aktywność w grupach nie tworzy żadnego `PointEvent`**.

DoD: 55+ testów zielonych; feed grupy działa e2e na zbudowanym API; zero zdarzeń groups.* w subskrypcjach ladder.

### SPRINT 5 — Q&A/mentoring w grupach = druga ścieżka punktowania (moduł `community`)

Cel: domknięcie równowagi obu dróg awansu z briefu (3.3) — najważniejszy brakujący element produktu.

1. **Prisma v5**: `Thread` (groupId, status OPEN/ANSWERED/CLOSED, FULLTEXT title+body), `Answer` (isAccepted — jedna per wątek), `AnswerVote` (unikat answer+user).
2. **Moduł `community`**: wątki w grupach, odpowiedzi, głos „w górę", akceptacja odpowiedzi przez autora pytania (nie można akceptować własnej odpowiedzi na własne pytanie ani głosować na siebie). Zdarzenia: `community.answer_accepted` (payload: answerId, answerAuthorUserId, questionAuthorUserId, groupId, accountAges…), `community.answer_upvoted` (payload z danymi głosującego: wiek konta, własna aktywność).
3. **Ladder — konsument ścieżki community** (rozszerzenie `modules/ladder`): `ANSWER_ACCEPTED` = 50 pkt bazowych; `ANSWER_UPVOTED_QUALIFIED` = 10 pkt za głos **kwalifikowany** (głosujący: konto ≥ 14 dni + ≥ 1 własna aktywność); malejące zwroty od tego samego uznającego (`counterpartyId` = userId uznającego, ta sama krzywa 0.5^n); **czapka tygodniowa** ścieżki community (start: 300 pkt/tydz. — realizuje „progres tygodniowy" z briefu; nadwyżka = wpis 0 pkt z wyjaśnieniem w meta). Wartości do rejestru w `rules.ts` (ruleset pozostaje v1 — to pierwsze wypełnienie zaprojektowanych typów, nie zmiana reguł).
4. **Antifraud**: kwalifikacja głosów + limit szybkości (max N punktowanych zdarzeń community dziennie → nadwyżka HOLD), wzajemna adoracja pary userów (A akceptuje B, B akceptuje A w krótkim oknie → FraudSignal RECIPROCITY_QA + HOLD).
5. **Frontend**: zakładka „Pytania" w grupie, wątek z odpowiedziami/głosami/akceptacją, sekcja Q&A w `/panel/punkty` (rozbicie ścieżek już jest).
6. **Testy**: akceptacja → 50 pkt PENDING; głos niekwalifikowany → brak punktów; kwalifikowany → 10 pkt; czapka tygodniowa; po dojrzeniu obu ścieżek `computeLevel` z wymogiem 20% od L4 działa na realnych danych; wzajemna adoracja → HOLD.

DoD: użytkownik może realnie awansować oboma ścieżkami; testy obu ścieżek + guardów zielone.

### SPRINT 6 — Hardening, bezpieczeństwo, launch (release `v0.1.0`)

1. **E-mail (Brevo, ADR-009)**: weryfikacja adresu przy rejestracji, reset hasła, dzienny digest powiadomień (job w workerze; pojedyncze e-maile tylko dla krytycznych zdarzeń — limit 300/dzień!).
2. **Antybot/antyspam (R-03/R-13)**: Cloudflare Turnstile na rejestracji i pierwszej publikacji; rate-limity publikacji zleceń/postów dla kont < 7 dni; przycisk „zgłoś" (Post/Thread/Order → ModerationCase źródło REPORT).
3. **RODO (R-10)**: `DELETE /me` = anonimizacja User (pseudonim, hash losowy, e-mail zaorany) z zachowaniem ledgera; `GET /me/export` (JSON przez job).
4. **Cache (ADR-007, D3)**: cache-aside Redis dla listingu zleceń, listingu grup, feedów (klucz grupa+kursor), profili publicznych; inwalidacja zdarzeniowa w workerze; NIGDY dla `/me/ladder`.
5. **E2E Playwright w CI** (ścieżka: rejestracja → zlecenie → oferta → cykl → ocena) + **load test k6** (500 równoczesnych: listing, szczegóły, logowanie) z wynikami w `docs/perf/`.
6. **Deploy produkcyjny**: wykonać `infra/bootstrap.sh` na VPS (wymaga sekretów od właściciela — patrz `docs/runbooks/sekrety.md`), staging → smoke → tag `v0.1.0` → produkcja za flagą; Netdata + Uptime Kuma w compose; Bull Board za rolą ADMIN.

DoD: staging działa na VPS; k6 w budżecie (p95 < 300 ms publiczne z cache); tag `v0.1.0`.

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
