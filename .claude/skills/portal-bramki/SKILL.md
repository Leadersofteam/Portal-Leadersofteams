---
name: portal-bramki
description: Pełna weryfikacja zmiany w Portalu LoT przed commitem — format, lint z granicami modułów, typecheck, testy na REALNYM MySQL/Redis, build, e2e i odtworzenie bazy dev. Użyj, zanim uznasz cokolwiek za gotowe, przed każdym commitem i wdrożeniem, albo gdy użytkownik mówi „sprawdź", „przetestuj", „bramki", „czy to działa".
---

# Bramki jakości — liczba wykonanych testów, nie kolor

Zielony wynik w tym repo potrafi kłamać na trzy różne sposoby. Ten skill jest po to,
żeby żaden z nich nie przeszedł.

## Kolejność (nie skracaj)

```bash
cd /docker/portal-staging
pnpm format && pnpm lint && pnpm typecheck
```

Potem testy — **koniecznie z infrastrukturą**:

```bash
cd apps/api
DATABASE_URL='mysql://portal:portal@127.0.0.1:3306/portal' \
REDIS_URL='redis://127.0.0.1:6379' pnpm exec vitest run
```

Na koniec build i e2e:

```bash
cd /docker/portal-staging
pnpm build
ss -ltnp | grep -E ':(3000|3001)\b'   # MUSI być pusto — patrz niżej
bash infra/e2e.sh
```

## Trzy sposoby, w jakie zielony kolor kłamie

**1. Testy integracyjne bez infry są POMIJANE, nie uruchamiane.** Każdy ma
`describe.skipIf(!hasInfra)`. Bez `DATABASE_URL`/`REDIS_URL` cała suita świeci na zielono,
nie sprawdzając niczego. **Patrz na LICZBĘ wykonanych testów** i porównaj z poprzednim
przebiegiem (stan na 2026-08-14: **170 testów API, 15 e2e**). Spadek liczby przy zielonym
kolorze to sygnał, nie sukces.

**2. Sierota na porcie = testy przeciwko POPRZEDNIEMU buildowi.** `infra/e2e.sh` sprawdza
porty na wejściu i staje z komunikatem. Jeśli stanie — masz proces po własnym ręcznym
uruchomieniu. **Nie obchodź bramki**, zabij sierotę:

```bash
ss -ltnp | grep :3000        # weź PID
kill -9 <PID>                # `pkill -f "next start"` NIE wystarcza: next-server przeżywa
```

Objaw pominięcia tego kroku: **lawina niezrozumiałych czerwonych testów**. Gdy nagle pada
wiele testów naraz — najpierw sprawdź porty, dopiero potem czytaj kod.

**3. Test może przejść „przez nieobecność".** Nigdy nie opieraj sukcesu w e2e na braku
elementu — element w trakcie nawigacji też jest ukryty. Kotwicz na POZYTYWNYM śladzie
i lokatorem, nie tekstem.

## Po e2e ODTWÓRZ bazę dev

`infra/e2e.sh` robi `down -v` — kasuje bazę razem z wolumenem:

```bash
cd /docker/portal-staging
docker compose -f infra/docker-compose.dev.yml -p portal-dev up -d --wait
cd apps/api
DATABASE_URL='mysql://portal:portal@127.0.0.1:3306/portal' pnpm exec prisma migrate deploy
DATABASE_URL='mysql://portal:portal@127.0.0.1:3306/portal' pnpm exec prisma db seed
```

## Pisząc testy w tym repo

- **Baza dev jest WSPÓŁDZIELONA** między przebiegami i akumuluje resztki po przerwanych
  biegach. Zawężaj wyszukiwania do własnego przebiegu (`const run = Date.now()`)
  i sprzątaj w `afterAll`. Test szukający „pierwszego pasującego rekordu" prędzej czy
  później trafi na cudzą resztkę.
- **Playwright działa w trybie strict.** „Zaloguj się" występuje w nagłówku, treści
  i stopce — zawężaj: `page.getByRole('main').getByRole('link', { name: 'Zaloguj się' })`.
- Każde kliknięcie po nawigacji owijaj w `expect(async () => …).toPass()` — klik przed
  hydracją po prostu przepada.
- **Rola użytkownika jest zamrożona w migawce sesji.** `UPDATE users SET role='MODERATOR'`
  nie zadziała, dopóki test nie zaloguje się PONOWNIE.

## Bramka nie kończy się na zielonym teście

Zrzuty ekranu widzą to, czego test nie widzi (obcięcia CSS, łamanie, gramatyka) —
skill `portal-zrzuty`. A jeśli zmiana ma ścieżkę użytkownika, **przejdź ją**: reset hasła
przez tydzień prowadził w 404 przy komplecie zielonych testów backendu.
