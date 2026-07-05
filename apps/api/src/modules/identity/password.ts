import argon2 from 'argon2';

// Parametry wg zaleceń OWASP dla argon2id (m=19 MiB, t=2, p=1).
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain).catch(() => false);
}

// Hash-przynęta do wyrównania czasu odpowiedzi, gdy konto nie istnieje
// (utrudnia enumerację e-maili przez timing).
export const DUMMY_HASH_PROMISE = hashPassword('dummy-timing-equalizer');
