import { expect, test } from '@playwright/test';

import { decydujWyglad } from '../lib/v17-routing';

// Decyzja flagi wyglądu V17 (middleware). Web nie ma vitesta, a to czysta funkcja — Playwright
// uruchamia ją bez przeglądarki i bez stacku. Pilnuje obietnicy: P0 i P1 domyślnie ON, „off” je wyłącza,
// trasy bez makiety zostają w starym wyglądzie.

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

  test('P1: /zlecenia i /uslugi bez flagi → v17', () => {
    for (const p of ['/zlecenia', '/zlecenia/abc123', '/uslugi', '/uslugi/przeglad-klimatyzacji']) {
      expect(decydujWyglad(p, null, undefined).rewrite, p).toBe(true);
    }
  });

  test('P1: ?wyglad=off i ciasteczko off wyłączają', () => {
    expect(decydujWyglad('/zlecenia', 'off', 'v17')).toEqual({ rewrite: false, set: 'off' });
    expect(decydujWyglad('/uslugi/x', null, 'off').rewrite).toBe(false);
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

// Od 25.11 do 26.11 ekrany V17 pod zwykłymi adresami miały „noindex” z v17/layout — żaden test tego nie widział.
test.describe('indeksowanie ekranów V17', () => {
  test('publiczne adresy są indeksowalne, /v17/* poza robotami', async ({ request }) => {
    for (const p of ['/feed', '/drabinka', '/zlecenia', '/uslugi']) {
      const res = await request.get(p);
      expect(res.headers()['x-robots-tag'], p).toBeUndefined();
      const html = await res.text();
      expect(html, p).not.toContain('noindex');
      expect(html, p).toMatch(new RegExp(`rel="canonical" href="[^"]*${p}"`));
    }
    expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /v17/');
  });
});
