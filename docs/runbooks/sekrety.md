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

| Zmienna                                 | Funkcja                                                        | Bez wartości                                  |
| --------------------------------------- | -------------------------------------------------------------- | --------------------------------------------- |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | **Wysyłka e-mail przez WŁASNĄ skrzynkę (droga domyślna)**      | Brak wysyłki; reset zwraca devToken poza prod |
| `SMTP_PORT` / `SMTP_SECURE`             | Port i TLS skrzynki                                            | `465` / `true`                                |
| `BREVO_API_KEY`                         | Alternatywa: Brevo (300/dzień). SMTP ma PIERWSZEŃSTWO          | Nieużywane, gdy skonfigurowany SMTP           |
| `MAIL_FROM`                             | Adres nadawcy — **musi** być adresem uwierzytelnionej skrzynki | `no-reply@leadersofteams.pl`                  |
| `APP_BASE_URL`                          | Bazowy URL w linkach e-mail                                    | `https://leadersofteams.pl`                   |

### E-mail: dlaczego własna skrzynka, a nie dostawca (stan od 2026-08-13)

Produkcja wysyła przez `smtp.hostinger.com` na koncie `kontakt@leadersofteams.com` —
**tę samą skrzynkę, której od dawna używa App**. Jest opłacona w ramach hostingu domeny,
więc to zero nowego kosztu i zero powierzania adresów e-mail użytkowników trzeciej stronie.
Wybór transportu w `shared/mail.ts`: kompletny SMTP → Brevo → no-op.

⚠️ **`MAIL_FROM` musi równać się `SMTP_USER`.** Nadawca z innej domeny niż uwierzytelniona
skrzynka nie przejdzie SPF/DMARC — poczta zostanie odrzucona albo wpadnie do spamu. Dlatego
na produkcji jest `kontakt@leadersofteams.com`, a nie `no-reply@leadersofteams.pl`.

⚠️ **`mailEnabled` wymaga KOMPLETU** host+user+hasło. Sam host bez hasła to najczęstsza
połowiczna konfiguracja — kończy się cichym „connection refused" zamiast jawnego no-opu.

⛔ **Nie stawiać własnego serwera pocztowego na VPS.** Port 25 wychodzący bywa blokowany,
a poczta ze świeżego IP bez historii ląduje w spamie mimo poprawnego SPF/DKIM/DMARC.

**Otwarte do rozważenia:** osobna skrzynka `portal@leadersofteams.pl` — wyrówna domenę
nadawcy z domeną Portalu i rozdzieli reputację od poczty transakcyjnej App. Podmiana to
trzy zmienne. Uwaga na limit wysyłki Hostingera (rzędu setek/dobę) przy dziennym digeście.
| `TURNSTILE_SECRET_KEY` | Antybot Turnstile na rejestracji (ZAIMPLEMENTOWANE, flag-gated) | Ochrona OFF (rejestracja przepuszcza) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Klucz publiczny widgetu (BUILD-time obrazu web) | Brak widgetu na `/rejestracja` |

## Checklista podłączenia SSH (co dostarcza właściciel)

Zanim uruchomimy pierwszy deploy na VPS, potrzebne są:

1. **Dostęp SSH**: host VPS (`srv1418832.hstgr.cloud`), użytkownik `portal-deploy`
   (tworzy `infra/bootstrap.sh`), klucz prywatny ed25519 (publiczny → `authorized_keys`).
2. **DNS**: rekordy A `leadersofteams.pl`, `www`, `api.leadersofteams.pl` → IP VPS
   (Traefik + Let's Encrypt wystawią TLS automatycznie).
3. **`/opt/portal/.env`** (chmod 600): `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`
   (`openssl rand -base64 24`), oraz `SMTP_*`/`MAIL_*` (poczta — patrz wyżej).
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
