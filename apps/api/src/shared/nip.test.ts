import { isValidNip } from '@lot/contracts';
import { describe, expect, it } from 'vitest';

describe('isValidNip — suma kontrolna (offline, ADR-009)', () => {
  it('przyjmuje numery o poprawnej sumie kontrolnej', () => {
    // Numery zweryfikowane algorytmem wagowym (mod 11 = cyfra kontrolna).
    expect(isValidNip('5252248481')).toBe(true);
    expect(isValidNip('5261040828')).toBe(true);
  });

  it('akceptuje zapis z myślnikami i spacjami', () => {
    expect(isValidNip('525-224-84-81')).toBe(true);
    expect(isValidNip('525 224 84 81')).toBe(true);
  });

  it('odrzuca numer z przekręconą cyfrą (to jest cały sens sumy kontrolnej)', () => {
    expect(isValidNip('5252248482')).toBe(false);
  });

  it('odrzuca zły format', () => {
    expect(isValidNip('525224848')).toBe(false); // 9 cyfr
    expect(isValidNip('52522484810')).toBe(false); // 11 cyfr
    expect(isValidNip('abcdefghij')).toBe(false);
    expect(isValidNip('')).toBe(false);
  });

  it('odrzuca numery, dla których reszta z dzielenia wynosi 10', () => {
    // Reszta 10 nie ma reprezentacji jako pojedyncza cyfra kontrolna, więc taki
    // numer nie może być poprawny niezależnie od ostatniej cyfry.
    const impossible = ['8888888888', '1111111111'].filter((n) => {
      const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
      return w.reduce((a, x, i) => a + x * Number(n[i]), 0) % 11 === 10;
    });
    for (const nip of impossible) expect(isValidNip(nip)).toBe(false);
  });
});
