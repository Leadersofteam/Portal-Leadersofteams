# Checklista go-live Portalu — `leadersofteams.pl`

Kolejność kroków cutover staging → prod. **Ten dokument NIE jest wykonaniem** — go-live to osobna sesja
z osobną zgodą właściciela na każdy krok nieodwracalny. Stan przygotowania: 2026-07-20,
uzupełnienie po sesji S7: 2026-08-12.

> **Aktualizacja S7 (2026-08-12):** doszły moduły `files` (uploady), `listings`
> (Usługi/zapytania) i `social` (follow/feed/@handle) + 3 migracje
> (`files_uploads`, `service_listings`, `social`). Nowe pozycje w checkliście:
>
> - [ ] **Backup wolumenu `portal_uploads`** (zdjęcia userów) razem z bazą — rozszerzyć skrypt backupu (R-07).
> - [ ] Deploy MUSI kończyć się krokiem `docker compose … run --rm migrate`
>       (serwis za `profiles: [tools]` — NIE startuje sam; objaw pominięcia:
>       błędy P2022 „column does not exist" w logach api).
> - [ ] Szkice `/regulamin` i `/prywatnosc` są w repo — sekcje **[DO UZUPEŁNIENIA]**
>       (dane podmiotu, e-mail reklamacyjny, lista odbiorców danych) wymagają
>       decyzji właściciela przed startem (R-10/R-15).
> - [ ] Po seedzie rynku: uzupełnić usługi Liderów (`SEED_DEMO=1` tworzy 6 przykładowych).

> Integracja Portal↔App **porzucona (2026-07-20)** — nie jest częścią go-live ani żadnego kroku poniżej.

## 0. Warunki wstępne (wejścia właściciela — wymagane przed startem)

- [x] **E-mail transakcyjny — ZROBIONE 2026-08-13**: własna skrzynka przez SMTP
      (`SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`, `MAIL_FROM` = adres skrzynki), a nie Brevo.
      Rejestracja i reset hasła zweryfikowane na produkcji. Szczegóły: `runbooks/sekrety.md`.
- [x] ~~Klucze **Cloudflare Turnstile**~~ — ✅ **NIEPOTRZEBNE od 2026-08-13.** Właściciel
      wykluczył Cloudflare; anty-bot jest teraz WŁASNY (`apps/api/src/shared/humancheck.ts`),
      działa na naszym Redisie, jest **włączony domyślnie** i nie wymaga niczyich kluczy.
      Ta pozycja przestała być blokerem launchu — nie ma na co czekać.
- [ ] **Regulamin + polityka prywatności** — wsad prawny właściciela/prawnika (R-10/R-15).
- [ ] Decyzja o **seedingu**: dane **demo / testowe** (nie realne zaproszenia) — zakres i źródło (R-06).
- [ ] Backup baz + potwierdzony test restore przed cutover (R-07).

## 1. Zdrowie kontenerów staging — ✅ ZROBIONE 2026-08-13 (S12)

- [x] Healthcheck `web` (Next.js :3000) i `worker` w `infra/docker-compose.staging.yml`.
      `worker` nie ma portu HTTP → sonda czyta **puls w Redisie**
      (`portal:worker:heartbeat`, `apps/api/src/shared/heartbeat.ts`), nie `fetch`.
- [x] Recreate staging: `api`, `web`, `worker`, `mysql`, `redis` — wszystkie `(healthy)`.
- [x] Te same healthchecki w `infra/docker-compose.yml` (prod) — prod ma komplet `(healthy)`.
- [x] **Próba awarii wykonana na stagingu:** zamrożenie procesu workera (SIGSTOP z hosta)
      → po ~170 s kontener `unhealthy` (FailingStreak 4), klucz pulsu wygasł (TTL -2);
      po `kill -CONT` powrót do `healthy` w < 45 s. Uwaga: puls jest odnawiany **tylko
      gdy obraca się pętla dispatchera**, więc łapie także workera ŻYWEGO, ale zakleszczonego —
      to jest ten przypadek, w którym `docker ps` pokazuje „Up", a portal po cichu stoi.

## 2. Start prod (GATE — nieodwracalne uruchomienie obok App)

- [ ] `infra/docker-compose.yml` — weryfikacja limitów cgroup (R-04: współdzielony VPS z żywym `lot-app-prod`).
- [ ] **Load-test k6** przy działającym prod App — ostrożnie, małe obciążenie, poza szczytem (R-04, bloker).
- [ ] Bull Board (opcjonalnie) — podgląd kolejek.
- [ ] `docker compose -f infra/docker-compose.yml up -d --build` — start prod (nadal za basic-auth).
- [ ] Migracje prod: profil `tools` → `prisma migrate deploy`.
- [x] Env prod aktywne — poczta (SMTP własnej skrzynki) i anty-bot działają.
      Anty-bot nie ma ŻADNEJ zmiennej do ustawienia: jest włączony domyślnie.
      `HUMANCHECK=off` istnieje wyłącznie jako wyłącznik awaryjny na czas
      diagnozowania rejestracji — nie zostawiaj go włączonego.
- [ ] Smoke test za basic-auth: rejestracja, logowanie, marketplace, Drabinka.

## 3. Seeding (GATE — dane demo/testowe)

- [ ] Import startowych zleceń/treści (demo) wg decyzji właściciela — NIE realne zaproszenia.

## 4. Otwarcie publiczne (GATE — nieodwracalne)

- [ ] **Zdjęcie basic-auth** z routera prod w Traefiku — osobne potwierdzenie.
- [x] Weryfikacja bramki anty-bot na formularzu rejestracji — ✅ zrobiona na produkcji
      13.08 ścieżką przeglądarki: rejestracja bez rozwiązania odrzucona (`HUMANCHECK_FAILED`),
      z rozwiązaniem przechodzi, powtórka tego samego rozwiązania odrzucona.

## 5. DNS cutover (wykonuje WŁAŚCICIEL u rejestratora)

- [ ] Rekordy do wklejenia (dostarczy asystent tuż przed cutover): `leadersofteams.pl`, `www`, `api` →
      A/CNAME na IP VPS, wartości + TTL. **Ja nie mam dostępu do rejestratora.**
- [ ] Propagacja DNS + wystawienie certów Let's Encrypt przez Traefik (reguły prod gotowe).

## 6. Po cutover

- [ ] Smoke test publiczny: `https://leadersofteams.pl`, `https://api.leadersofteams.pl/healthz`.
- [ ] Monitoring per kontener (R-04/R-12), alerty zużycia limitów darmowych tierów.
- [ ] **Rollback plan:** przywrócić basic-auth / cofnąć DNS na poprzedni cel; prod compose down bez utraty wolumenów.

## Blokery (z RISKS.md, przegląd 2026-07-20)

R-04 (k6), R-06 (seeding), R-10 (regulamin/RODO) — muszą być domknięte przed krokiem 4/5.
R-13 (anty-bot) DOMKNIĘTY 2026-08-13 własną bramką, bez zewnętrznego dostawcy.
