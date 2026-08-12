# Runbook: sekrety i konfiguracja środowisk

Zasady: sekrety wyłącznie w GitHub Secrets (CI) i plikach `.env` na VPS
(chmod 600, właściciel `portal-deploy`) — nigdy w repo ani w obrazach
(pilnuje skan gitleaks w CI). Wzór pliku: `infra/.env.example`.

## GitHub Secrets (wymagane, żeby działały workflows deploy)

Konfiguracja: _Settings → Environments_ — utwórz środowiska `staging`
i `production`, w każdym ustaw:

| Sekret            | Opis                                                               |
| ----------------- | ------------------------------------------------------------------ |
| `VPS_HOST`        | adres VPS (srv1418832.hstgr.cloud)                                 |
| `VPS_USER`        | `portal-deploy` (tworzony przez `infra/bootstrap.sh`)              |
| `VPS_SSH_KEY`     | klucz prywatny ed25519; publiczny → `authorized_keys` deploy-usera |
| `GHCR_PULL_TOKEN` | classic PAT z uprawnieniem `read:packages` (pull obrazów na VPS)   |

Do momentu ustawienia sekretów workflows `deploy-*` będą failować na kroku
SSH — CI (`ci.yml`) działa bez żadnych sekretów.

## Sekrety opcjonalne (funkcje za flagą)

Aplikacja startuje i działa BEZ tych sekretów (0 zł, ADR-009) — funkcje są wtedy
w trybie no-op. Ustawia się je w `/opt/portal/.env` (nie w GitHub Secrets).

| Zmienna                          | Funkcja                                                         | Bez wartości                                  |
| -------------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| `BREVO_API_KEY`                  | Wysyłka e-mail (Brevo, 300/dzień)                               | Brak wysyłki; reset zwraca devToken poza prod |
| `MAIL_FROM`                      | Adres nadawcy                                                   | `no-reply@leadersofteams.pl`                  |
| `APP_BASE_URL`                   | Bazowy URL w linkach e-mail                                     | `https://leadersofteams.pl`                   |
| `TURNSTILE_SECRET_KEY`           | Antybot Turnstile na rejestracji (ZAIMPLEMENTOWANE, flag-gated) | Ochrona OFF (rejestracja przepuszcza)         |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Klucz publiczny widgetu (BUILD-time obrazu web)                 | Brak widgetu na `/rejestracja`                |

## Checklista podłączenia SSH (co dostarcza właściciel)

Zanim uruchomimy pierwszy deploy na VPS, potrzebne są:

1. **Dostęp SSH**: host VPS (`srv1418832.hstgr.cloud`), użytkownik `portal-deploy`
   (tworzy `infra/bootstrap.sh`), klucz prywatny ed25519 (publiczny → `authorized_keys`).
2. **DNS**: rekordy A `leadersofteams.pl`, `www`, `api.leadersofteams.pl` → IP VPS
   (Traefik + Let's Encrypt wystawią TLS automatycznie).
3. **`/opt/portal/.env`** (chmod 600): `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`
   (`openssl rand -base64 24`), opcjonalnie `BREVO_API_KEY`/`MAIL_*`.
4. **Sieć Traefika**: istniejący `traefik_public` (współdzielony ze stackiem app).

Po dostarczeniu powyższego deploy jest turnkey — patrz `deploy.md` (pierwszy deploy).

## Pliki .env na VPS

- `/opt/portal/.env` — produkcja (`MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`; `WEB_IMAGE`/`API_IMAGE` nadpisywane przez deploy).
- `/opt/portal-staging/.env` — staging (jak wyżej + `STAGING_BASIC_AUTH` z `htpasswd -nB user`).

Generowanie haseł: `openssl rand -base64 24`.

## Rotacja

1. **Hasło MySQL:** nowe hasło w `.env` → `ALTER USER 'portal'@'%' IDENTIFIED BY '...'` w kontenerze → `docker compose up -d` (restart api/worker).
2. **Klucz SSH deploy:** wygeneruj nową parę, dopisz publiczny do `authorized_keys`, podmień sekret `VPS_SSH_KEY`, usuń stary wpis.
3. **GHCR_PULL_TOKEN:** nowy PAT → podmień sekret → `docker login` na VPS przy kolejnym deployu nadpisze poświadczenia.

Rotacja rutynowo co 6 miesięcy; natychmiast przy podejrzeniu wycieku.
