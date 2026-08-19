---
name: portal-stan-zastany
description: Weryfikacja stanu zastanego Portalu LoT przed kodowaniem i przed uznaniem czegokolwiek za zrobione albo brakujące — git log -S, grep w kodzie, zapytanie do bazy, przejście ścieżki. Użyj na starcie sesji, przed podjęciem pozycji z roadmapy oraz przed napisaniem „zamknięte" w raporcie.
---

# Dokumenty kłamią. Kod, baza i kliknięcie — nie.

W jednej sesji tego repo zdarzyło się to TRZY razy: „digest do zrobienia" (był
zrobiony), „ślad zaufania do zrobienia" (był), „anty-bot gotowy, brakuje kluczy"
(klucz nie miał jak trafić do obrazu). Osobna klasa: „backend gotowy" ≠ „funkcja
działa" — reset hasła był martwy przez tydzień przy zielonych testach API.

## Zanim uznasz, że czegoś BRAKUJE

```bash
git log --oneline -8 -S"<fraza-z-zadania>" -- apps/ packages/
grep -rn "<nazwa-funkcji-albo-trasy>" apps/api/src apps/web packages --include="*.ts" --include="*.tsx"
```

Trafienie = przeczytaj commit i kod, zanim napiszesz choć linijkę.

## Zanim uznasz, że coś jest ZROBIONE

1. **Skutek w bazie**, nie log wysyłki:
   ```bash
   docker exec -i portal-prod-mysql-1 sh -c \
     'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -N' <<< "SELECT COUNT(*) FROM ...;"
   ```
   Licząc realnych użytkowników odfiltruj DWIE domeny: `@demo.leadersofteams.pl`
   ORAZ `deleted-%@deleted.invalid`. Analityka mówi prawdę dopiero od 2026-08-15.
2. **Ścieżka użytkownika end-to-end** — łącznie z KLIKNIĘCIEM linku z maila,
   jeśli funkcja go wysyła. Log `mail.sent` to nie dowód (patrz martwy reset hasła).
3. **Strażnik tras**: trasa API bez literału w `apps/web` = funkcja bez wejścia —
   `shared/web-contract.test.ts` łapie to strukturalnie, ale tylko gdy trasa już
   istnieje; przy planowaniu sprawdź ręcznie, czy „gotowy backend" ma stronę.

## Pułapka, którą złapaliśmy 19.08 (dopisuj kolejne)

- Testy `app.inject` NIE idą przez fetch przeglądarki: zdublowany nagłówek
  `Content-Type`/`content-type` w kliencie dawał 415 na produkcji przy komplecie
  zielonych testów. Wniosek: integracja API ≠ przejście ścieżki w przeglądarce.
- Zielona suita bez infry to suita POMINIĘTA (`describe.skipIf(!hasInfra)`) —
  patrz na LICZBĘ wykonanych testów (bazowo: 211 API, 17 e2e po 19.08).

## Wyjście skilla

Tabela: pozycja → stan faktyczny (kod/commit/liczba/zrzut) → rozjazd z dokumentem.
Rozjazdy poprawiaj w dokumencie od razu — to one kosztowały tu całe sesje.
