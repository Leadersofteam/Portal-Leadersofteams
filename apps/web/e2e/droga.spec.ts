import { expect, test } from '@playwright/test';

// PL3: /droga jest publiczną opowieścią o siedmiu szczeblach — gość widzi
// wszystkie poziomy z progami (z API /ladder/levels, nie z kopii w kodzie),
// oba źródła punktów i wejście na Drogę. Bez logowania, bez cookies (ISR).
test('gość widzi Drogę Lidera: 7 szczebli z progami, dwa źródła punktów, wejście', async ({
  page,
}) => {
  await page.goto('/droga');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Lidera');
  const rungs = page.locator('.droga-rung');
  await expect(rungs).toHaveCount(7);
  await expect(rungs.first()).toContainText('Adept');
  await expect(rungs.first()).toContainText('100');
  await expect(rungs.last()).toContainText('Architekt Zespołów');
  await expect(rungs.last()).toContainText('12000');
  await expect(page.getByText(/Zero punktów za zapraszanie/i).first()).toBeVisible();
  // Wejście jest dwa razy (hero i domknięcie strony) — to zamierzone,
  // strict mode wymaga wskazania pierwszego.
  await expect(
    page
      .getByRole('main')
      .getByRole('link', { name: /Zacznij od poziomu 0/ })
      .first(),
  ).toBeVisible();
});

// Profil Lidera niesie oś Drogi także na poziomie 0 — „wejście" i pierwszy
// szczebel jako cel, zamiast pustki albo zer.
test('profil Lidera pokazuje oś Drogi z wejściem i następnym szczeblem', async ({ page }) => {
  await page.goto('/liderzy');
  const first = page.getByRole('main').locator('a[href^="/liderzy/"]').first();
  await first.click();
  await page.waitForURL(/\/liderzy\/[a-z0-9]+$/);
  await expect(page.getByRole('heading', { name: 'Droga Lidera' })).toBeVisible();
  await expect(page.locator('.journey-step').first()).toContainText(/Wejście na Drogę|Poziom/);
});
