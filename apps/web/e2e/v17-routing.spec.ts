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

  const OPTIN = [
    '/zlecenia/nowe',
    '/zlecenia/branza/hvac',
    '/uslugi/nowa',
    '/uslugi/branza/hvac',
    '/uslugi/x/edytuj',
    '/oferty/abc',
    '/zapytania/abc',
    '/porownanie/oferteo',
    '/firmy/abc',
    '/firma/nowa',
    '/dla-firm',
  ];

  test('reszta P1: bez flagi i z „off” zostają dzisiejsze ekrany', () => {
    for (const p of OPTIN) {
      expect(decydujWyglad(p, null, undefined).rewrite, p).toBe(false);
      expect(decydujWyglad(p, null, 'off').rewrite, p).toBe(false);
      expect(decydujWyglad(p, 'off', 'v17').rewrite, p).toBe(false);
    }
  });

  test('reszta P1: ?wyglad=v17 i ciasteczko v17 włączają', () => {
    for (const p of OPTIN) {
      expect(decydujWyglad(p, 'v17', undefined), p).toEqual({ rewrite: true, set: 'v17' });
      expect(decydujWyglad(p, null, 'v17').rewrite, p).toBe(true);
    }
  });

  test('reszta P1: opt-in nie łapie tras bez makiety', () => {
    for (const p of ['/zlecenia/branza', '/uslugi/branza', '/porownanie', '/firma', '/oferty']) {
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

// P6 + P5 (strona główna, dokumenty, logowanie) — osobny opt-in; bez niego użytkownik widzi dzisiejsze ekrany.
const P6 = [
  '/',
  '/start',
  '/regulamin',
  '/prywatnosc',
  '/wypis-digest',
  '/logowanie',
  '/rejestracja',
  '/nie-pamietam-hasla',
  '/reset-hasla',
];

test.describe('opt-in v17p6', () => {
  test('bez opt-inu żaden adres P6 nie jest przepisywany', () => {
    for (const p of P6) {
      for (const cookie of [undefined, 'v17', 'off']) {
        expect(decydujWyglad(p, null, cookie).rewrite, `${p} ${cookie}`).toBe(false);
      }
    }
  });

  test('?wyglad=v17p6 i ciasteczko prowadzą na /v17p6; P0 i P1 zostają włączone', () => {
    expect(decydujWyglad('/', 'v17p6', undefined)).toEqual({
      rewrite: true,
      cel: '/v17p6',
      set: 'v17p6',
    });
    for (const p of P6.slice(1)) {
      expect(decydujWyglad(p, null, 'v17p6').cel, p).toBe(`/v17p6${p}`);
    }
    expect(decydujWyglad('/feed', null, 'v17p6')).toEqual({ rewrite: true });
    expect(decydujWyglad('/liderzy', null, 'v17p6').rewrite).toBe(false);
  });

  test('?wyglad=off i ?wyglad=v17 zdejmują opt-in', () => {
    expect(decydujWyglad('/logowanie', 'off', 'v17p6')).toEqual({ rewrite: false, set: 'off' });
    expect(decydujWyglad('/logowanie', 'v17', 'v17p6')).toEqual({ rewrite: false, set: 'v17' });
  });

  test('bez flagi dzisiejsze ekrany; z flagą nowe', async ({ page: bezFlagi, browser }) => {
    let page = bezFlagi;
    for (const p of ['/', '/logowanie', '/regulamin', '/nie-ma-takiej-strony']) {
      await page.goto(p);
      await expect(page.locator('.site-header'), p).toBeVisible();
      await expect(page.locator('.v17p'), p).toHaveCount(0);
    }
    // Świeży kontekst: strony ISR mają stale-while-revalidate, więc przeglądarka raz pokazałaby kopię sprzed opt-inu.
    page = await (await browser.newContext()).newPage();
    await page.goto('/logowanie?wyglad=v17p6');
    await expect(page.locator('.v17p')).toBeVisible();
    await expect(page.locator('.site-header')).toBeHidden();
    for (const p of ['/', '/regulamin', '/rejestracja', '/reset-hasla', '/nie-ma-takiej-strony']) {
      await page.goto(p);
      await expect(page.locator('.v17p'), p).toBeVisible();
    }
    await page.goto('/?wyglad=off');
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(page.locator('.v17p')).toHaveCount(0);
  });

  test('telefon: menu i arkusz „Utwórz” mają styl i dają się zamknąć', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?wyglad=v17p6');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    // Prerender widzi ścieżkę /v17p6/…, przeglądarka publiczną — aktywny slot nie może zginąć.
    await page.goto('/logowanie');
    await expect(
      page
        .getByRole('navigation', { name: 'Nawigacja dolna' })
        .getByRole('link', { name: 'Zaloguj' }),
    ).toHaveAttribute('aria-current', 'page');
    await page.goto('/');
    const menu = page.getByRole('navigation', { name: 'Menu', exact: true });
    await expect(async () => {
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      await expect(menu).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect(menu).toHaveCSS('position', 'fixed');
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await page.getByRole('button', { name: 'Utwórz' }).click();
    const arkusz = page.getByRole('dialog', { name: 'Co dziś tworzysz?' });
    await expect(arkusz).toHaveCSS('position', 'fixed');
    await page.keyboard.press('Escape');
    await expect(arkusz).toBeHidden();
  });

  test('strona główna P6: bez noindex, canonical na /', async ({ request }) => {
    const res = await request.get('/', { headers: { cookie: 'lot_wyglad=v17p6' } });
    const html = await res.text();
    expect(html).toContain('v17p-landing');
    expect(html).not.toContain('noindex');
    expect(html).toMatch(/rel="canonical" href="[^"/]*\/\/[^"/]+\/?"/);
    expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /v17p6');
  });

  test('3440: strona główna ma własne rozmiary, pozostałe ekrany P6 skalę 1,3', async ({
    page,
  }) => {
    // Ogólny zoom ram V17 (v17-szerokie.css) nie może dołożyć się do rozmiarów strony głównej.
    await page.setViewportSize({ width: 3440, height: 1440 });
    for (const [adres, zoom] of [
      ['/?wyglad=v17p6', '1'],
      ['/logowanie', '1.3'],
    ] as const) {
      await page.goto(adres);
      await expect(page.locator('.v17p')).toBeVisible();
      await expect(page.locator('html'), adres).toHaveCSS('zoom', zoom);
    }
  });
});
