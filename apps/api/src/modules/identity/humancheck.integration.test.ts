// Bramka człowieka end-to-end (zastąpiła wykluczonego Cloudflare Turnstile).
//
// Test buduje serwer z HUMANCHECK=on, bo domyślnie w NODE_ENV=test bramka jest
// wyłączona — inaczej wszystkie pozostałe suity musiałyby liczyć proof-of-work
// przy każdej rejestracji. Ta sama konwencja co z limitami zapytań.
import { createHash } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { loadConfig } from '../../shared/config';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

interface Challenge {
  id: string;
  salt: string;
  target: string;
  maxNumber: number;
}

describe.skipIf(!hasInfra)('bramka człowieka — własna, bez zewnętrznego dostawcy', () => {
  let ctx: AppContext;
  const emails: string[] = [];

  // Ten sam algorytm co w przeglądarce, tylko na sha256 z Node.
  function solve(challenge: Challenge): number {
    for (let n = 0; n <= challenge.maxNumber; n += 1) {
      if (createHash('sha256').update(`${challenge.salt}${n}`).digest('hex') === challenge.target) {
        return n;
      }
    }
    throw new Error('nie znaleziono rozwiązania — wyzwanie jest niespójne');
  }

  async function getChallenge(): Promise<Challenge> {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/auth/challenge' });
    expect(res.statusCode).toBe(200);
    const { challenge } = res.json() as { challenge: Challenge | null };
    expect(challenge).not.toBeNull();
    return challenge!;
  }

  function register(payload: Record<string, unknown>) {
    return ctx.app.inject({ method: 'POST', url: '/api/v1/auth/register', payload });
  }

  beforeAll(async () => {
    ctx = await buildServer(
      loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error', HUMANCHECK: 'on' }),
    );
  }, 120_000);

  afterAll(async () => {
    if (!ctx) return;
    if (emails.length > 0) await ctx.prisma.user.deleteMany({ where: { email: { in: emails } } });
    await ctx.close();
  });

  it('bez rozwiązania rejestracja jest ODRZUCONA', async () => {
    const res = await register({
      email: `hc-brak-${run}@test.local`,
      password: 'super-tajne-haslo-1',
      displayName: 'Bez Rozwiązania',
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: { code: string } }).error.code).toBe('HUMANCHECK_FAILED');
  });

  it('z poprawnym rozwiązaniem rejestracja przechodzi', async () => {
    const challenge = await getChallenge();
    const number = solve(challenge);
    const email = `hc-ok-${run}@test.local`;
    emails.push(email);

    // Wyzwanie musi „odleżeć" minimalny czas wypełniania formularza — poniżej
    // dwóch sekund uznajemy, że to nie człowiek wpisywał e-mail i hasło.
    await new Promise((r) => setTimeout(r, 2100));

    const res = await register({
      email,
      password: 'super-tajne-haslo-1',
      displayName: 'Z Rozwiązaniem',
      humancheck: { id: challenge.id, number },
    });
    expect(res.statusCode).toBe(201);
  }, 30_000);

  it('to samo rozwiązanie NIE zadziała drugi raz (jednorazowość)', async () => {
    const challenge = await getChallenge();
    const number = solve(challenge);
    await new Promise((r) => setTimeout(r, 2100));

    const first = `hc-replay-a-${run}@test.local`;
    emails.push(first);
    expect(
      (
        await register({
          email: first,
          password: 'super-tajne-haslo-1',
          displayName: 'Pierwszy',
          humancheck: { id: challenge.id, number },
        })
      ).statusCode,
    ).toBe(201);

    // Bez tego jedno rozwiązane wyzwanie obsłużyłoby tysiąc rejestracji,
    // czyli cała praca proof-of-work poszłaby na marne.
    const replay = await register({
      email: `hc-replay-b-${run}@test.local`,
      password: 'super-tajne-haslo-1',
      displayName: 'Powtórka',
      humancheck: { id: challenge.id, number },
    });
    expect(replay.statusCode).toBe(400);
  }, 30_000);

  it('zła liczba nie przechodzi, nawet z prawidłowym id wyzwania', async () => {
    const challenge = await getChallenge();
    const number = solve(challenge);
    await new Promise((r) => setTimeout(r, 2100));
    const res = await register({
      email: `hc-zla-${run}@test.local`,
      password: 'super-tajne-haslo-1',
      displayName: 'Zła Liczba',
      humancheck: { id: challenge.id, number: number + 1 },
    });
    expect(res.statusCode).toBe(400);
  }, 30_000);

  it('natychmiastowa wysyłka jest odrzucana, choć rozwiązanie jest poprawne', async () => {
    const challenge = await getChallenge();
    const number = solve(challenge);
    // BEZ czekania: człowiek nie wpisze e-maila, hasła i nazwy w ułamek sekundy.
    const res = await register({
      email: `hc-szybko-${run}@test.local`,
      password: 'super-tajne-haslo-1',
      displayName: 'Za Szybko',
      humancheck: { id: challenge.id, number },
    });
    expect(res.statusCode).toBe(400);
  }, 30_000);

  it('wypełnione pole-pułapka odrzuca rejestrację mimo poprawnego rozwiązania', async () => {
    const challenge = await getChallenge();
    const number = solve(challenge);
    await new Promise((r) => setTimeout(r, 2100));
    const res = await register({
      email: `hc-pulapka-${run}@test.local`,
      password: 'super-tajne-haslo-1',
      displayName: 'Automat',
      nazwaFirmy: 'Wypełnione przez bota',
      humancheck: { id: challenge.id, number },
    });
    expect(res.statusCode).toBe(400);
  }, 30_000);

  it('koszt rośnie natrętnym: kolejne wyzwania z tego samego IP są trudniejsze', async () => {
    // Świeży licznik dla tego przebiegu — inaczej test zależałby od reszty suity.
    await ctx.redis.del('humancheck:ip:127.0.0.1');
    const first = await getChallenge();
    for (let i = 0; i < 4; i += 1) await getChallenge();
    const later = await getChallenge();
    expect(later.maxNumber).toBeGreaterThan(first.maxNumber);
  }, 30_000);
});
