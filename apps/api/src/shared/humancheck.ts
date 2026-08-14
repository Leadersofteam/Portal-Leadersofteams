// Bramka człowieka (R-03/R-13) — WŁASNA, na naszej infrastrukturze.
//
// Zastępuje Cloudflare Turnstile, wykluczonego decyzją właściciela 2026-08-13.
// Zero zewnętrznych wywołań, zero kluczy od dostawcy, zero danych wysyłanych
// na zewnątrz — wszystko liczy się w naszym Redisie i w przeglądarce gościa.
//
// MECHANIZM (proof-of-work, wariant „zgadnij liczbę"):
//  1. Serwer losuje `salt` i sekretną liczbę n z zakresu [0, maxNumber],
//     odsyła `salt`, `maxNumber` i `target = sha256(salt + n)`.
//  2. Przeglądarka szuka n po kolei od zera — średnio maxNumber/2 haszy.
//  3. Serwer sprawdza przez PORÓWNANIE LICZBY (nie hasza) i kasuje wyzwanie.
//
// DLACZEGO tak, a nie „N zerowych bitów": praca jest tu OGRANICZONA Z GÓRY
// (maxNumber), więc żaden użytkownik nie trafi na pechowe wyzwanie liczone
// minutę. Przy zerach z przodu czas rozwiązania jest zmienną losową o długim
// ogonie — dla nas to niedopuszczalne, bo płaci za to człowiek, nie bot.
//
// UCZCIWA OCENA SKUTECZNOŚCI (nie sprzedajemy tu złudzeń):
// proof-of-work NIE rozpozna człowieka. Podnosi KOSZT jednej próby i tyle.
// Zatrzymuje pętle curl-a i gotowe skrypty spamerskie; NIE zatrzyma kogoś, kto
// napisze solver w C. Realną barierą dla Portalu pozostaje warstwa pod spodem:
// limity IP, limity świeżego konta (`quota.ts`), wymagana weryfikacja e-maila
// i możliwość moderacji treści. Ta bramka to pierwsze sito, nie mur.
import { createHash, randomBytes, randomInt } from 'node:crypto';

import type { Redis } from './redis';

const KEY_PREFIX = 'humancheck:challenge:';
const IP_PREFIX = 'humancheck:ip:';

// Zmierzone w Chromium na tym VPS: crypto.subtle robi ~112 tys. hashy/s.
// Telefon z niskiej półki jest ~5–10× wolniejszy, czyli ~15 tys./s.
// 40 000 → średnio 20 000 haszy → ~0,2 s na laptopie, ~1,3 s na słabym telefonie.
// Rozwiązanie liczy się W TLE, gdy człowiek wypełnia formularz, więc w praktyce
// czeka 0 s. Nie podnosimy tej wartości „na wszelki wypadek": każde podniesienie
// płaci najsłabszy sprzęt, a nie atakujący z serwerownią.
const BASE_MAX_NUMBER = 40_000;

// Wyzwanie żyje 15 minut — tyle, żeby ktoś mógł spokojnie wypełnić formularz,
// odejść od komputera i wrócić. Po wygaśnięciu front pobiera nowe w tle.
const CHALLENGE_TTL_SECONDS = 15 * 60;

// Minimalny czas między wydaniem wyzwania a rejestracją. Człowiek musi wpisać
// e-mail, hasło i nazwę — poniżej dwóch sekund to nie jest człowiek.
// Uwaga: to NIE jest pomiar czasu liczenia PoW (ten bywa krótszy niż 0,2 s),
// tylko czasu wypełniania formularza.
const MIN_ELAPSED_MS = 2_000;

// Eskalacja kosztu dla natrętnych. Tego Turnstile nie dawał nam wcale: my
// widzimy własny licznik po IP i możemy pod niego podnieść cenę biletu.
const ESCALATION = [
  { after: 20, multiplier: 16 },
  { after: 8, multiplier: 4 },
  { after: 3, multiplier: 2 },
] as const;
const IP_WINDOW_SECONDS = 3600;

export interface HumancheckChallenge {
  id: string;
  salt: string;
  target: string;
  maxNumber: number;
}

export interface HumancheckSolution {
  id: string;
  number: number;
}

export type HumancheckFailure =
  'MISSING' | 'UNKNOWN_OR_USED' | 'WRONG_NUMBER' | 'TOO_FAST' | 'HONEYPOT';

export interface HumancheckResult {
  ok: boolean;
  reason?: HumancheckFailure;
}

function hash(salt: string, n: number): string {
  return createHash('sha256').update(`${salt}${n}`).digest('hex');
}

/** Ile pracy nałożyć na to IP — rośnie z liczbą wyzwań pobranych w ostatniej godzinie. */
async function maxNumberForIp(redis: Redis, ip: string): Promise<number> {
  const key = `${IP_PREFIX}${ip}`;
  const count = await redis.incr(key);
  // EXPIRE tylko przy pierwszym trafieniu — inaczej natrętny klient odnawiałby
  // sobie okno w nieskończoność i nigdy nie wszedłby na wyższy próg.
  if (count === 1) await redis.expire(key, IP_WINDOW_SECONDS);
  const step = ESCALATION.find((s) => count > s.after);
  return BASE_MAX_NUMBER * (step?.multiplier ?? 1);
}

export function createHumancheck(redis: Redis, enabled: boolean) {
  return {
    enabled,

    async issue(ip: string): Promise<HumancheckChallenge> {
      const maxNumber = await maxNumberForIp(redis, ip);
      const id = randomBytes(16).toString('hex');
      const salt = randomBytes(16).toString('hex');
      const secret = randomInt(0, maxNumber + 1);
      await redis.set(
        `${KEY_PREFIX}${id}`,
        JSON.stringify({ secret, issuedAt: Date.now() }),
        'EX',
        CHALLENGE_TTL_SECONDS,
      );
      return { id, salt, target: hash(salt, secret), maxNumber };
    },

    /**
     * Sprawdza rozwiązanie i ZUŻYWA wyzwanie. Jednorazowość jest tu barierą
     * na powtórki: bez niej jedno rozwiązane wyzwanie obsłużyłoby tysiąc
     * rejestracji, czyli cała praca poszłaby na marne.
     */
    async verify(
      solution: unknown,
      honeypot: unknown,
      now = Date.now(),
    ): Promise<HumancheckResult> {
      // Pułapka na naiwne boty wypełniające wszystkie pola formularza.
      // Kosztuje nas jedno ukryte pole, a odsiewa cały gatunek automatów.
      if (typeof honeypot === 'string' && honeypot.trim() !== '') {
        return { ok: false, reason: 'HONEYPOT' };
      }
      if (
        typeof solution !== 'object' ||
        solution === null ||
        typeof (solution as HumancheckSolution).id !== 'string' ||
        typeof (solution as HumancheckSolution).number !== 'number'
      ) {
        return { ok: false, reason: 'MISSING' };
      }
      const { id, number } = solution as HumancheckSolution;

      // GETDEL: odczyt i skasowanie w JEDNEJ operacji. Osobne GET + DEL dałoby
      // okno, w którym dwa równoległe żądania zużywają to samo wyzwanie.
      const raw = await redis.getdel(`${KEY_PREFIX}${id}`);
      if (!raw) return { ok: false, reason: 'UNKNOWN_OR_USED' };

      const { secret, issuedAt } = JSON.parse(raw) as { secret: number; issuedAt: number };
      if (number !== secret) return { ok: false, reason: 'WRONG_NUMBER' };
      if (now - issuedAt < MIN_ELAPSED_MS) return { ok: false, reason: 'TOO_FAST' };
      return { ok: true };
    },
  };
}

export type Humancheck = ReturnType<typeof createHumancheck>;

export const HUMANCHECK_LIMITS = {
  BASE_MAX_NUMBER,
  CHALLENGE_TTL_SECONDS,
  MIN_ELAPSED_MS,
};
