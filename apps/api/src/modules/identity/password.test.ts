import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password';

describe('hasła (argon2id)', () => {
  it('weryfikuje poprawne hasło', async () => {
    const hash = await hashPassword('bardzo-tajne-haslo-123');
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, 'bardzo-tajne-haslo-123')).resolves.toBe(true);
  });

  it('odrzuca błędne hasło', async () => {
    const hash = await hashPassword('bardzo-tajne-haslo-123');
    await expect(verifyPassword(hash, 'inne-haslo')).resolves.toBe(false);
  });

  it('nie rzuca na uszkodzonym hashu (zwraca false)', async () => {
    await expect(verifyPassword('nie-hash', 'cokolwiek')).resolves.toBe(false);
  });

  it('generuje różne hashe dla tego samego hasła (sól)', async () => {
    const [a, b] = await Promise.all([hashPassword('haslo'), hashPassword('haslo')]);
    expect(a).not.toEqual(b);
  });
});
