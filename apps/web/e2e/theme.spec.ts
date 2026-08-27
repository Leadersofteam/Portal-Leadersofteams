import { expect, test } from '@playwright/test';

// P2 „Tryb jasny": ciemny zostaje domyślny, przełącznik w stopce, wybór
// przeżywa reload (localStorage + boot-skrypt w layout.tsx), opcja „system"
// idzie za prefers-color-scheme bez reloadu.
//
// Miny (MINY.md): asercje stanu PO hydracji (boot ustawia atrybut przed
// paintem, ale hydracja mogłaby go zdjąć, gdyby ktoś przeniósł logikę z
// atrybutu na wstrzykiwane węzły — dokładnie to złapał PD4); przyciski
// muszą mieć nieprzezroczyste wypełnienie (mina skrótu `background`).

const CIEMNE_TLO = 'rgb(10, 11, 18)';
const JASNE_TLO = 'rgb(246, 247, 251)';

test('domyślnie ciemny: bez atrybutu, ciemne tło', async ({ page }) => {
  await page.goto('/feed');
  await expect(page.getByRole('heading', { name: 'Feed społeczności' })).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
  const tlo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(tlo).toBe(CIEMNE_TLO);
});

test('przełącznik: jasny motyw, sync theme-color, wybór przeżywa reload i hydrację', async ({
  page,
}) => {
  await page.goto('/feed');
  const toggle = page.getByRole('contentinfo').getByRole('radiogroup', {
    name: 'Motyw kolorystyczny',
  });
  await toggle.getByRole('radio', { name: 'Jasny' }).click();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    JASNE_TLO,
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f6f7fb');

  // Reload: boot-skrypt musi odtworzyć wybór PRZED paintem, a stan ma być
  // prawdziwy także PO hydracji — czekamy na element interaktywny (radio
  // zaznaczone = React już żyje), dopiero potem czytamy atrybut i tło.
  await page.reload();
  await expect(toggle.getByRole('radio', { name: 'Jasny' })).toHaveAttribute(
    'aria-checked',
    'true',
    { timeout: 15_000 },
  );
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    JASNE_TLO,
  );

  // Mina przezroczystych przycisków: główne CTA w treści ma mieć wypełnienie.
  const przycisk = page.locator('main .btn:visible').first();
  if ((await przycisk.count()) > 0) {
    const fill = await przycisk.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(fill).not.toBe('rgba(0, 0, 0, 0)');
  }
});

test('opcja „system" idzie za prefers-color-scheme bez reloadu', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/feed');
  const toggle = page.getByRole('contentinfo').getByRole('radiogroup', {
    name: 'Motyw kolorystyczny',
  });
  await toggle.getByRole('radio', { name: 'Systemowy' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
});
