# Checklista go-live Portalu — `leadersofteams.pl`

Kolejność kroków cutover staging → prod. **Ten dokument NIE jest wykonaniem** — go-live to osobna sesja
z osobną zgodą właściciela na każdy krok nieodwracalny. Stan przygotowania: 2026-07-20.

> Integracja Portal↔App **porzucona (2026-07-20)** — nie jest częścią go-live ani żadnego kroku poniżej.

## 0. Warunki wstępne (wejścia właściciela — wymagane przed startem)

- [ ] `BREVO_API_KEY` (e-mail transakcyjny) — sekret prod.
- [ ] Klucze **Cloudflare Turnstile** (prod site key + secret) — aktywacja anty-bota (R-13).
- [ ] **Regulamin + polityka prywatności** — wsad prawny właściciela/prawnika (R-10/R-15).
- [ ] Decyzja o **seedingu**: dane **demo / testowe** (nie realne zaproszenia) — zakres i źródło (R-06).
- [ ] Backup baz + potwierdzony test restore przed cutover (R-07).

## 1. Zdrowie kontenerów staging (GATE — recreate staging, nie prod)

- [ ] Healthcheck `web` (Next.js :3000) i `worker` dodane do `infra/docker-compose.staging.yml`.
      **`worker` nie ma portu HTTP** → healthcheck procesowy/Redis-owy, nie `fetch`.
- [ ] Recreate obu kontenerów staging; wszystkie usługi `(healthy)` w `docker ps`.
- [ ] Analogiczne healthchecki przeniesione do `infra/docker-compose.yml` (prod) przed startem prod.

## 2. Start prod (GATE — nieodwracalne uruchomienie obok App)

- [ ] `infra/docker-compose.yml` — weryfikacja limitów cgroup (R-04: współdzielony VPS z żywym `lot-app-prod`).
- [ ] **Load-test k6** przy działającym prod App — ostrożnie, małe obciążenie, poza szczytem (R-04, bloker).
- [ ] Bull Board (opcjonalnie) — podgląd kolejek.
- [ ] `docker compose -f infra/docker-compose.yml up -d --build` — start prod (nadal za basic-auth).
- [ ] Migracje prod: profil `tools` → `prisma migrate deploy`.
- [ ] Env prod aktywne (Brevo, Turnstile) — runtime, bez rebuildu na same klucze.
- [ ] Smoke test za basic-auth: rejestracja, logowanie, marketplace, Drabinka.

## 3. Seeding (GATE — dane demo/testowe)

- [ ] Import startowych zleceń/treści (demo) wg decyzji właściciela — NIE realne zaproszenia.

## 4. Otwarcie publiczne (GATE — nieodwracalne)

- [ ] **Zdjęcie basic-auth** z routera prod w Traefiku — osobne potwierdzenie.
- [ ] Weryfikacja aktywnego Turnstile na formularzach publicznych.

## 5. DNS cutover (wykonuje WŁAŚCICIEL u rejestratora)

- [ ] Rekordy do wklejenia (dostarczy asystent tuż przed cutover): `leadersofteams.pl`, `www`, `api` →
      A/CNAME na IP VPS, wartości + TTL. **Ja nie mam dostępu do rejestratora.**
- [ ] Propagacja DNS + wystawienie certów Let's Encrypt przez Traefik (reguły prod gotowe).

## 6. Po cutover

- [ ] Smoke test publiczny: `https://leadersofteams.pl`, `https://api.leadersofteams.pl/healthz`.
- [ ] Monitoring per kontener (R-04/R-12), alerty zużycia limitów darmowych tierów.
- [ ] **Rollback plan:** przywrócić basic-auth / cofnąć DNS na poprzedni cel; prod compose down bez utraty wolumenów.

## Blokery (z RISKS.md, przegląd 2026-07-20)

R-04 (k6), R-06 (seeding), R-10 (regulamin/RODO), R-13 (aktywacja Turnstile) — muszą być domknięte przed krokiem 4/5.
