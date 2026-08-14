---
name: portal-migracja
description: Wygenerowanie i wdrożenie migracji Prisma w Portalu LoT — bez TTY, expand-only, z pułapką pustego pliku i enuma w MySQL. Użyj przy każdej zmianie w schemacie bazy, gdy trzeba dodać tabelę, kolumnę albo wartość enuma.
---

# Migracja — trzy pułapki, każda kosztowała czas

## `prisma migrate dev` NIE DZIAŁA

Brak TTY na VPS. Migrację generujemy różnicowo:

```bash
cd /docker/portal-staging/apps/api

# 1. Świeża baza-cień
docker exec portal-dev-mysql-1 mysql -uroot -proot \
  -e "DROP DATABASE IF EXISTS portal_shadow; CREATE DATABASE portal_shadow;"

# 2. SQL do pliku POZA katalogiem migracji — patrz pułapka niżej
SQL=/tmp/nowa-migracja.sql
pnpm exec prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url 'mysql://root:root@127.0.0.1:3306/portal_shadow' \
  --script > "$SQL"

# 3. PRZECZYTAJ SQL OCZAMI (patrz: enum), dopiero potem instaluj
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_nazwa
cp "$SQL" prisma/migrations/*_nazwa/migration.sql

DATABASE_URL='mysql://portal:portal@127.0.0.1:3306/portal' pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

## Pułapka 1: pusty plik w `migrations/` blokuje sam siebie

Jeśli przekierujesz `migrate diff` **do pliku wewnątrz** `prisma/migrations/`, powstaje
najpierw pusty plik, `--from-migrations` wciąga go jako część stanu i wynik jest pusty.
`migrate deploy` próbuje wykonać pustą migrację i pada z `1065 Query was empty`,
blokując wszystkie kolejne.

Naprawa, gdy już się stanie:

```bash
DATABASE_URL='…' pnpm exec prisma migrate resolve --rolled-back <nazwa_migracji>
rm -rf prisma/migrations/<nazwa_migracji>
# generuj ponownie, tym razem do /tmp
```

## Pułapka 2: MySQL trzyma ENUM jako LICZBĘ PORZĄDKOWĄ

Nowe wartości dopisuj **wyłącznie na końcu** listy. Wstawienie w środek po cichu przemapuje
istniejące wiersze na sąsiednie wartości — bez błędu, bez ostrzeżenia. **Zawsze przeczytaj
wygenerowany `ALTER … MODIFY … ENUM(...)` i sprawdź, że dotychczasowa kolejność jest nietknięta.**

## Pułapka 3: to musi być expand-only

Nowe tabele, kolumny **nullable albo z domyślną**, wartości enuma dopisane na końcu.
Nigdy: usunięcie kolumny, zwężenie typu, `NOT NULL` bez domyślnej. Powód: rollback aplikacji
nie może wymagać cofania schematu (ADR-008) — poprzednia wersja kodu ma działać na nowym schemacie.

Jeśli zmiana z natury nie jest expand-only, rozbij ją na dwa wdrożenia
(najpierw dodaj i zacznij pisać w oba miejsca, dopiero po jakimś czasie usuń stare).

## Wdrożenie migracji

Na obu środowiskach osobnym krokiem `run --rm migrate` (profil `tools`) — skill `portal-wdrozenie`.
Na produkcji **zawsze po świeżym backupie**.
