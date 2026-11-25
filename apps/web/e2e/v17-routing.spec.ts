import { expect, test } from '@playwright/test';

import { decydujWyglad } from '../lib/v17-routing';

// Decyzja flagi wyglądu V17 (middleware). Web nie ma vitesta, a to czysta funkcja — Playwright
// uruchamia ją bez przeglądarki i bez stacku. Pilnuje obietnicy: P0 domyślnie ON, P1 („Rynek”)
// wyłącznie za jawnym opt-inem — inaczej wdrożenie kodu P1 uczyniłoby go publicznym.

test.describe('flaga wyglądu V17', () => {
  test('P0: /feed bez flagi → v17', () => {
    expect(decydujWyglad('/feed', null, undefined).rewrite).toBe(true);
    expect(decydujWyglad('/drabinka', null, undefined).rewrite).toBe(true);
    expect(decydujWyglad('/profil/ola', null, undefined).rewrite).toBe(true);
  });

  test('P0: ?wyglad=off i ciasteczko off wyłączają', () => {
    expect(decydujWyglad('/feed', 'off', undefined)).toEqual({ rewrite: false, set: 'off' });
    expect(decydujWyglad('/feed', null, 'off').rewrite).toBe(false);
  });

  test('P1: /zlecenia i /uslugi bez flagi → stary wygląd', () => {
    for (const p of ['/zlecenia', '/zlecenia/abc123', '/uslugi', '/uslugi/przeglad-klimatyzacji']) {
      expect(decydujWyglad(p, null, undefined).rewrite, p).toBe(false);
    }
  });

  test('P1: ?wyglad=v17 → v17 i zapis ciasteczka', () => {
    expect(decydujWyglad('/zlecenia', 'v17', undefined)).toEqual({ rewrite: true, set: 'v17' });
    expect(decydujWyglad('/uslugi/x', 'v17', undefined).rewrite).toBe(true);
  });

  test('P1: ciasteczko v17 → v17', () => {
    for (const p of ['/zlecenia', '/zlecenia/abc', '/uslugi', '/uslugi/x']) {
      expect(decydujWyglad(p, null, 'v17').rewrite, p).toBe(true);
    }
  });

  test('P1: ?wyglad=off bije ciasteczko v17', () => {
    expect(decydujWyglad('/zlecenia', 'off', 'v17')).toEqual({ rewrite: false, set: 'off' });
  });

  test('P1: trasy bez makiety zostają w starym wyglądzie mimo flagi', () => {
    for (const p of [
      '/zlecenia/nowe',
      '/zlecenia/branza',
      '/zlecenia/branza/hvac',
      '/uslugi/nowa',
      '/uslugi/branza/hvac',
      '/uslugi/x/edytuj',
    ]) {
      expect(decydujWyglad(p, 'v17', 'v17').rewrite, p).toBe(false);
    }
  });
});
