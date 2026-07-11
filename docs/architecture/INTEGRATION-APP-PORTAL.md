# Architektura integracji: Portal (leadersofteams.pl) ↔ App (app.leadersofteams.com)

**Status:** projekt zatwierdzony (2026-07-11) — do realizacji w **Fazie 2** (sprinty 7–10), świadomie
PO Fazie 1 (nikt nie osiągnie progu unlock w pierwszych tygodniach — naturalny runway).
**Źródła:** brief §4 (rozstrzygnięcia biznesowe), ROADMAP „Faza 2", ADR-010 (Zespoły).

## Cel i zasady (nienaruszalne, z briefu §4)

Osiągnięcie odpowiedniego poziomu w Drabince odblokowuje **darmowy dostęp do app.leadersofteams.com
i możliwość założenia własnego zespołu**. Twarde ustalenia:

- **Dwie osobne bazy, dwa osobne konta** — BEZ wspólnego konta/rekordu użytkownika.
- **Portal = Identity Provider** („Zaloguj przez leadersofteams.pl", jak „Zaloguj przez Google").
- **Portal = źródło prawdy** o poziomie i uprawnieniach. App = konsument nagrody (nie liczy poziomów).
- „Założenie zespołu" = własny profil firmowy w App + zapraszanie innych Liderów.

## Punkt wyjścia (stan obu systemów)

| | Portal | App |
|---|---|---|
| Auth | cookie sesyjny (Redis), Fastify | **JWT** (jsonwebtoken), Express |
| Model | `User`, `LadderState`, `LevelDefinition`, `LevelAchievement` | `User`, `Team`/`TeamMember` (multi-tenant, `currentTeamId`), `Subscription` (Stripe) |
| Zdarzenia | **transactional outbox** (`OutboxEvent`) + worker BullMQ | konsumenci wewnętrzni, webhooki Stripe |
| Progi (`ladder/rules.ts`) | L5 „Mentor" (3000) → `unlocksAppAccess`; L7 „Architekt Zespołów" (12000) → `unlocksTeamCreation` | — |

## Rozwiązanie — trzy filary

```
 Portal (źródło prawdy)                                   App (konsument)
 ─────────────────────────                                ───────────────────────
 [A] OIDC Provider  ── Auth Code + PKCE ──▶  ID token {sub,email,name,lot_level,lot_unlocks}
     (node-oidc-provider, JWKS)                           „Zaloguj przez leadersofteams.pl"
                                                           (openid-client) → upsert po `sub`
 [B] on LevelAchievement → OutboxEvent
     'level.changed' ── webhook HMAC ──────▶  POST /internal/lot/level-changed
     (retry/backoff, DLQ, WebhookDelivery)                → grant planu LOT_LADDER / bramka teams
 [C] GET /api/v1/internal/entitlements  ◀──── nocny job rekoncyliacji (App) + refresh przy loginie
```

### [A] SSO — Portal jako OIDC Provider
- **Dlaczego OIDC, nie własny podpisany JWT:** ekosystem LoT ma więcej marek (HydroSpark, Zodiamo,
  Transforme) — prawdziwy IdP zwraca się przy 3.–4. kliencie; standard + sprawdzone biblioteki.
  Bierzemy **lean subset**: authorization code + PKCE, **statyczna** rejestracja 2–3 klientów
  first-party (bez dynamic client registration, bez cudzych integratorów).
- **Portal:** `node-oidc-provider` na `auth.leadersofteams.pl` (lub ścieżce), reużywa istniejącą sesję
  Portalu jako login session (`apps/api/src/shared/session.ts`). Claims ID tokenu: `sub` (id usera
  Portalu — trwały), `email`, `name`, **`lot_level`** (int), **`lot_unlocks`** `{appAccess, teamCreation}`.
  JWKS z rotacją kluczy.
- **App:** przycisk „Zaloguj przez leadersofteams.pl" → `openid-client` (Auth Code + PKCE) → callback:
  **upsert `User` po `sub`** (nowe pole `User.portalSub`; awaryjny match po ZWERYFIKOWANYM e-mailu z
  jawnym potwierdzeniem linkowania kont) → App wystawia własny JWT jak dziś (bez zmian w wydawaniu
  tokenu, `middleware/auth.middleware.ts`). Logowanie hasłem zostaje równolegle.

### [B] Sync poziomów — push (real-time) na istniejącym outboxie
- Na zmianę poziomu (`LevelAchievement`) Portal zapisuje `OutboxEvent` `level.changed`
  `{eventId, sub, level, unlocks, occurredAt}` w TEJ SAMEJ transakcji (wzorzec już w kodzie).
- Worker dostarcza **webhook z podpisem HMAC** → App `POST /internal/lot/level-changed`; **retry z
  backoffem + DLQ**; nowa tabela `WebhookDelivery` (status/próby/next-attempt). App weryfikuje HMAC.
- **Idempotencja:** `eventId` unikatowy + **last-writer-wins po `occurredAt`** (spóźniony webhook nie
  cofnie nowszego stanu).

### [C] Rekoncyliacja — pull (usuwa rozjazdy; odpowiedź na „co, jeśli webhook nie dotrze")
- **Nocny job na App** woła Portal `GET /api/v1/internal/entitlements?sub=…` (lub bulk), zabezpieczony
  kluczem API + allowlist IP / siecią wewnętrzną dockera, i koryguje dryf.
- **Login = naturalny punkt rekoncyliacji:** `lot_level`/`lot_unlocks` w ID tokenie odświeżają się
  przy każdym logowaniu przez Portal.

Trzy niezależne kanały (login-refresh + webhook + nocny pull) dają odporność bez pojedynczego punktu awarii.

## Egzekucja uprawnień po stronie App
- Migracja Prisma: `User.portalSub` (unikat), `lotLevel`, `lotAppAccessGrantedAt`,
  `lotTeamCreationUnlocked` (lub osobna tabela `LotEntitlement`).
- **„Darmowy dostęp"** = programowa `Subscription` w planie `LOT_LADDER` (z pominięciem Stripe;
  `modules/billing`). Odebranie dostępu (spadek poziomu — jeśli w ogóle możliwy) = degradacja planu.
- **Bramka tworzenia zespołu**: `modules/teams/team.routes.ts` `POST /` sprawdza `lotTeamCreationUnlocked`.
- **Powiązanie zwrotne (Portal, moduł Zespołów — ADR-010):** `Team.appTeamRef` → zespół w App;
  case studies `Post.teamId` linkują do zespołu App; deep-linki w obie strony.

## Bezpieczeństwo / RODO
- HMAC na webhookach, PKCE na OIDC, krótki TTL ID tokenu, rotacja JWKS, endpointy `internal/*` na sieci
  wewnętrznej VPS (niepubliczne). Propagacja **usunięcia konta (RODO)** tym samym kanałem zdarzeń
  (`account.deleted` → App anonimizuje/odbiera dostęp).

## Pliki/moduły do stworzenia lub dotknięcia
- **Portal:** nowy `apps/api/src/modules/oidc`; rozszerzenie outboxu o `level.changed`; `WebhookDelivery`
  w `apps/api/prisma/schema.prisma`; route `internal/entitlements`; delivery w workerze.
- **App:** `modules/auth` (openid-client + callback + mapowanie `portalSub`); `modules/billing` (grant
  `LOT_LADDER`); `modules/teams` (bramka); route `internal/lot/level-changed`; migracja Prisma
  (pola entitlement); nocny job rekoncyliacji.

## Weryfikacja (E2E na obu stagingach)
- S7: „Zaloguj przez leadersofteams.pl" → sesja App zmapowana po `sub` (nowy user i user istniejący).
- S8: awans na Portalu → webhook widoczny w `WebhookDelivery` → App nadaje plan `LOT_LADDER`; symulacja
  utraconego webhooka → nocna rekoncyliacja koryguje stan.
- S10: L7 na Portalu → utworzenie zespołu w App + zaproszenie innego Lidera.
