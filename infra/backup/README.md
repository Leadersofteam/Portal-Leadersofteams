# Backupy (0 zł — ADR-009)

Cel: **RPO ≤ 24 h, RTO ≤ 4 h** (ADR-005). Dump nocny MySQL → darmowy tier
Cloudflare R2 lub Backblaze B2 (10 GB) przez rclone.

## Konfiguracja (jednorazowo, na VPS jako `portal-deploy`)

1. Zainstaluj rclone: `curl https://rclone.org/install.sh | sudo bash`
2. Skonfiguruj remote (przykład dla R2):
   `rclone config` → nowy remote `r2` typu `s3`, provider `Cloudflare`,
   klucze z darmowego konta R2; utwórz bucket `portal-backups`.
   _Rekomendacja:_ opakuj remote w `crypt` (szyfrowanie po stronie klienta),
   wtedy `RCLONE_REMOTE=r2crypt:portal-backups`.
3. Cron:
   ```
   30 3 * * * RCLONE_REMOTE=r2:portal-backups /opt/portal/repo/infra/backup/backup.sh >> /var/log/portal-backup.log 2>&1
   ```
4. Alert przy braku świeżego backupu: healthcheck w Uptime Kuma na wiek
   najnowszego pliku (skrypt `rclone lsf --format tp | tail -1`).

## Test odtwarzania (raz na kwartał)

```
RCLONE_REMOTE=r2:portal-backups ./restore-test.sh
```

Wynik odnotuj w runbooku `docs/runbooks/restore.md`.
