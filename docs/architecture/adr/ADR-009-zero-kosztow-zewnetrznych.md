# ADR-009: Polityka zero kosztów zewnętrznych (0 zł)

**Status:** Zaakceptowany
**Data:** 2026-07-04
**Decydenci:** Maciej Kucharski (wymóg biznesowy), Fable 5 (dobór rozwiązań)

## Kontekst

Twardy wymóg właściciela: **koszt użycia aplikacji i wszystkich procesów wewnętrznych = 0 zł**. Wszystkie integracje zewnętrzne muszą być w pełni darmowe. Jedyny akceptowany koszt infrastrukturalny to istniejący VPS (już opłacany dla app.leadersofteams.com) i domeny.

## Decyzja

**Zasada:** każda zależność operacyjna to (a) oprogramowanie open-source self-hosted na VPS, albo (b) darmowy tier usługi zewnętrznej — z udokumentowanym limitem, monitoringiem zużycia i planem awaryjnym na wypadek wyczerpania limitu. Wprowadzenie jakiejkolwiek usługi płatnej wymaga zmiany tego ADR i zgody właściciela.

| Potrzeba                                       | Rozwiązanie                                                                  | Koszt | Limit / plan awaryjny                                                                                                                                                                                                                            |
| ---------------------------------------------- | ---------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Baza, cache, kolejki                           | MySQL 8, Redis 7 (self-hosted, OSS)                                          | 0 zł  | —                                                                                                                                                                                                                                                |
| Runtime, framework                             | Node.js, Fastify, Next.js, Prisma, Socket.IO, BullMQ (OSS)                   | 0 zł  | —                                                                                                                                                                                                                                                |
| TLS / certyfikaty                              | Traefik + Let's Encrypt                                                      | 0 zł  | —                                                                                                                                                                                                                                                |
| **E-mail transakcyjny**                        | WŁASNA skrzynka przez SMTP (opłacona w ramach hostingu domeny)               | 0 zł  | **Zrewidowane 2026-08-13:** pierwotnie zakładaliśmy Brevo; realnie wystarczyła skrzynka, którą właściciel i tak ma. Brevo usunięte jako martwy kod. Własny serwer pocztowy na VPS pozostaje ODRZUCONY (świeże IP = spam, port 25 bywa blokowany) |
| **Backupy poza VPS**                           | rclone → darmowy tier Cloudflare R2 lub Backblaze B2 (10 GB)                 | 0 zł  | dump gzip przy naszej skali <<10 GB przez długi czas; rotacja 14 dni; alarm przy 70% zużycia                                                                                                                                                     |
| **Monitoring**                                 | Netdata (metryki hosta/kontenerów) + Uptime Kuma (dostępność, self-hosted)   | 0 zł  | —                                                                                                                                                                                                                                                |
| **Antybot/antyspam**                           | WŁASNA bramka proof-of-work na Redisie + rate-limity (`@fastify/rate-limit`) | 0 zł  | **Zrewidowane 2026-08-13:** właściciel wykluczył Cloudflare. Wybraliśmy wariant „własne proof-of-work", wymieniony tu od początku jako alternatywa. Zysk uboczny: przy rejestracji przeglądarka gościa nie łączy się z żadną firmą trzecią       |
| **CI/CD**                                      | GitHub Actions (free tier) + GHCR                                            | 0 zł  | repo prywatne: 2000 min/mies. + 500 MB packages; przy wyczerpaniu → wariant build-on-VPS (ADR-008): `git pull` + `docker compose build` na VPS, 0 zł bez limitów                                                                                 |
| **Wyszukiwarka**                               | MySQL FULLTEXT (ngram)                                                       | 0 zł  | upgrade: Meilisearch self-hosted (OSS, 0 zł)                                                                                                                                                                                                     |
| **Błędy / obserwowalność aplikacji**           | pino → pliki/journald + GlitchTip lub Sentry self-hosted (OSS) w fazie ≥ 1   | 0 zł  | —                                                                                                                                                                                                                                                |
| **Pliki użytkowników (portfolio, załączniki)** | wolumen na VPS + serwowanie przez Traefik/API                                | 0 zł  | limity rozmiaru per user; przy wzroście → R2 free tier (10 GB)                                                                                                                                                                                   |

Wykluczone przez tę politykę (przykłady): płatne API AI, płatne SaaS mailingowe, zarządzane bazy danych, płatne narzędzia monitoringu (Datadog itp.), płatny search (Algolia). Płatności za zlecenia i tak są poza MVP (ADR-006) — gdy wejdą w fazie 3+, prowizje PSP płaci przepływ transakcyjny, nie „użycie aplikacji"; to będzie wymagało rewizji tego ADR w zakresie wyjątku.

## Konsekwencje

- (+) Zerowy koszt operacyjny poza istniejącym VPS; pełna suwerenność (self-hosted first).
- (−) Darmowe tiery mają limity → ryzyko R-12 (RISKS.md): monitoring zużycia (e-maile/dzień, GB backupu, minuty Actions) z alertami przy 70%, udokumentowane fallbacki dla każdej pozycji.
- (−) Self-hosted = więcej obowiązków operacyjnych na VPS (aktualizacje, dyski) — mitygacja: wszystko w compose, runbooki, automatyczne restarty.
