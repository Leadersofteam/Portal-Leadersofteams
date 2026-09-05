import { expect, test } from '@playwright/test';

// PL4: strony, na które da się trafić z wyszukiwarki. Huby branżowe są
// statyczne i mają własną treść; /pytania i /porownanie/* istnieją i mówią
// prawdę o modelu. Sitemap zawiera huby. Wszystko jako gość, bez cookies.
test('hub branżowy: nagłówek z nazwą branży, chipy branż, wejścia siostrzane', async ({ page }) => {
  await page.goto('/uslugi/branza/marketing');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Marketing');
  const chips = page.getByRole('list', { name: 'Branże' });
  await expect(chips).toBeVisible();
  await expect(chips.getByRole('link', { name: 'Marketing' })).toHaveClass(/active/);
  await expect(
    page.getByRole('main').getByRole('link', { name: /Otwarte zlecenia: Marketing/ }),
  ).toBeVisible();
  // Nieznana branża → strona 404, nie pusty hub. Sprawdzamy TREŚĆ, nie kod
  // odpowiedzi: przy streamingu (root `loading.tsx`) Next wysyła nagłówki
  // przed `notFound()` i kod bywa 200 — ta sama cecha, przez którą
  // `/zlecenia/nowe` dla gościa oddawało 200 z przekierowaniem (PL2).
  await page.goto('/uslugi/branza/nie-ma-takiej-branzy');
  await expect(page.getByRole('heading', { name: /404/ })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
});

test('listy główne linkują do hubów chipami branż', async ({ page }) => {
  await page.goto('/zlecenia');
  await expect(
    page.getByRole('list', { name: 'Branże' }).getByRole('link', { name: 'Marketing' }),
  ).toHaveAttribute('href', '/zlecenia/branza/marketing');
  await page.goto('/liderzy');
  await expect(
    page.getByRole('list', { name: 'Branże' }).getByRole('link', { name: 'IT i programowanie' }),
  ).toHaveAttribute('href', '/liderzy/branza/it');
});

test('/pytania i /porownanie/oferteo istnieją i niosą FAQ', async ({ page }) => {
  await page.goto('/pytania');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pytania i odpowiedzi');
  await page.goto('/porownanie/oferteo');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Oferteo');
  await expect(page.getByText(/Kiedy Oferteo/)).toBeVisible();
  await expect(page.getByText(/Kiedy Leaders of Teams/)).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.some((t) => t.includes('"FAQPage"'))).toBe(true);
});

test('sitemap zawiera huby branżowe, /pytania i porównania', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.ok()).toBe(true);
  const xml = await res.text();
  expect(xml).toContain('/uslugi/branza/marketing');
  expect(xml).toContain('/zlecenia/branza/it');
  expect(xml).toContain('/liderzy/branza/hr');
  expect(xml).toContain('/pytania');
  expect(xml).toContain('/porownanie/oferteo');
  expect(xml).toContain('/droga');
});
