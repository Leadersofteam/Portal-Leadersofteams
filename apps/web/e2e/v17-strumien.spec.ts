import { expect, test, type Page } from '@playwright/test';

// Strumień V17 (domyślny wygląd od 25.11): wpis z kompozytora trafia do strumienia (potrzebny worker),
// akcje wpisu, menu konta z motywem i wylogowaniem, migawka offline, pisanie na telefonie.
// Błąd, który ten plik ma trzymać: 25–26.11 strumień V17 nie pytał o /feed i wpis znikał autorowi.

const PASSWORD = 'super-tajne-haslo-1';
const stamp = Date.now();
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNoLvyCFTEMLQkAj0l6AWscurkAAAAASUVORK5CYII=',
  'base64',
);

async function register(page: Page, displayName: string, email: string) {
  await page.goto('/rejestracja');
  await page.getByLabel('Imię i nazwisko (lub nazwa)').fill(displayName);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel(/^Hasło/).fill(PASSWORD);
  await page.getByRole('button', { name: 'Utwórz konto' }).click();
  await page.waitForURL('**/start', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Pomiń kreator' }).click();
  await page.waitForURL('**/panel', { timeout: 30_000 });
}

test('wpis z kompozytora V17 pojawia się w strumieniu; cytat; motyw; offline; wylogowanie', async ({
  page,
}) => {
  const body = `Wpis V17 ${stamp}: zdjęcie z odbioru i wnioski.`;
  await register(page, 'E2E Strumień', `strumien-${stamp}@e2e.local`);
  await page.goto('/feed');

  const okno = page.locator('.v17 form.kompozytor');
  await expect(async () => {
    await okno.getByRole('button', { name: /Napisz, co dziś zrobiliście/ }).click({
      timeout: 1_500,
    });
    await expect(okno.getByLabel('Treść wpisu')).toBeVisible({ timeout: 1_500 });
  }).toPass({ timeout: 30_000 });
  await okno.getByLabel('Treść wpisu').fill(body);
  await expect(okno.getByText(`Zostało ${600 - body.length}`)).toBeVisible();
  await page
    .getByTestId('v17-zdjecia')
    .setInputFiles({ name: 'odbior.png', mimeType: 'image/png', buffer: PNG });
  await expect(okno.getByRole('button', { name: 'Zdjęcie · 1 z 4' })).toBeVisible();
  await okno.locator('.rodzaje .vbtn.dol').click();

  const wiersz = page.locator('.v17 article.wpis', { hasText: body });
  await expect(async () => {
    await page.goto('/feed?filtr=wpisy&zakres=wszyscy');
    await expect(wiersz.first()).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 45_000 });
  await expect(wiersz.first().locator('.zdjecia img')).toHaveCount(1);
  await expect(wiersz.first().getByRole('link', { name: /Otwórz wpis/ })).toHaveAttribute(
    'href',
    /\/wpisy\//,
  );

  // Docenienie bez licznika (ADR-010).
  await expect(async () => {
    await wiersz.first().getByRole('button', { name: 'Doceniam' }).click({ timeout: 1_500 });
    await expect(wiersz.first().getByRole('button', { name: 'Cofnij docenienie' })).toBeVisible({
      timeout: 3_000,
    });
  }).toPass({ timeout: 30_000 });
  await expect(wiersz.first().getByRole('button', { name: 'Cofnij docenienie' })).toHaveText('');

  // Migawka offline: tylko publiczne pola.
  const migawka = await page.evaluate(() => localStorage.getItem('lot_offline_feed'));
  expect(migawka).toContain(body);
  expect(migawka).not.toMatch(/viewer|doceniony|zapisany/);
  await page.goto('/offline');
  await expect(page.getByText('Jesteś offline', { exact: true })).toBeVisible();
  await expect(page.getByText(body)).toBeVisible();

  // „Podaj dalej” otwiera kompozytor z cytatem.
  await page.goto('/feed?filtr=wpisy&zakres=wszyscy');
  await expect(async () => {
    await wiersz.first().getByRole('button', { name: 'Podaj dalej' }).click({ timeout: 1_500 });
    await expect(okno.locator('.bcyt-szkic')).toContainText(body, { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });

  // Menu konta: motyw przeżywa przeładowanie, Esc zamyka i oddaje fokus.
  await page.goto('/feed');
  const karta = page.locator('.v17 .nav button.ja');
  const menu = page.getByRole('dialog');
  await expect(async () => {
    await karta.click({ timeout: 1_500 });
    await expect(menu).toBeVisible({ timeout: 1_500 });
  }).toPass({ timeout: 30_000 });
  for (const nazwa of [
    'Panel',
    'Zapisane',
    'Moje punkty',
    'Liderzy',
    'Grupy branżowe',
    'Droga Lidera',
    'Dla firm',
  ])
    await expect(menu.getByRole('link', { name: nazwa })).toBeVisible();
  // Widoczność to za mało: menu bez stylów też jest „widoczne” (wyszło poza `.v17`, złapane na zrzucie).
  await expect(menu).toHaveCSS('position', 'fixed');
  await expect(menu).toHaveCSS('width', '320px');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(karta).toBeFocused();
  await karta.click();
  await menu.getByRole('radio', { name: 'Jasny' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await expect(async () => {
    await karta.click({ timeout: 1_500 });
    await expect(menu).toBeVisible({ timeout: 1_500 });
  }).toPass({ timeout: 30_000 });
  await menu.getByRole('button', { name: 'Wyloguj się' }).click();
  await page.waitForURL((u) => u.pathname === '/', { timeout: 30_000 });
  expect(await page.evaluate(() => localStorage.getItem('lot_offline_feed'))).toBeNull();
  await page.goto('/panel');
  await page.waitForURL('**/logowanie', { timeout: 30_000 });
});

test('telefon: FAB otwiera pełnoekranowy kompozytor, Esc zamyka i oddaje fokus', async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await register(page, 'E2E Telefon', `telefon-${stamp}@e2e.local`);
  await page.goto('/feed');
  const fab = page.getByRole('button', { name: 'Napisz wpis' });
  const okno = page.getByRole('dialog', { name: 'Nowy wpis' });
  await expect(async () => {
    await fab.click({ timeout: 1_500 });
    await expect(okno).toBeVisible({ timeout: 1_500 });
  }).toPass({ timeout: 30_000 });
  await expect(okno.getByLabel('Treść wpisu')).toBeFocused();
  await expect(okno.getByText('Zamiast wpisu:')).toBeVisible();
  const box = await okno.boundingBox();
  expect(box?.width).toBe(390);
  expect(box?.height).toBe(844);
  await page.keyboard.press('Escape');
  await expect(okno).toHaveCount(0);
  await expect(fab).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

  // Awatar w górnym pasku otwiera menu konta.
  await page.getByRole('button', { name: 'Konto i ustawienia' }).first().click();
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Panel' })).toBeVisible();
  await ctx.close();
});

test('gość: menu bez pozycji konta, 390 px bez przewijania w poziomie', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await ctx.newPage();
  await page.goto('/feed');
  await expect(page.locator('.v17 .zakres')).toHaveCount(0);
  const menu = page.getByRole('dialog');
  await expect(async () => {
    await page
      .getByRole('banner')
      .getByRole('button', { name: 'Konto i ustawienia' })
      .click({ timeout: 1_500 });
    await expect(menu).toBeVisible({ timeout: 1_500 });
  }).toPass({ timeout: 30_000 });
  await expect(menu.getByRole('link', { name: 'Dla firm' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Panel' })).toHaveCount(0);
  await expect(menu.getByRole('button', { name: 'Wyloguj się' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await ctx.close();
});
