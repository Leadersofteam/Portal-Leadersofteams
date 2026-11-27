import { expect, test } from '@playwright/test';

// Duży ekran V17 (makieta `szerokie.css`, 27.11): od 2400 px cała rama w skali 1,4, poniżej progu bez zmian.
for (const [width, skala] of [
  [1512, '1'],
  [2560, '1.4'],
  [3440, '1.4'],
] as const) {
  test(`rama V17 przy ${width} px: skala ${skala}, bez przewijania w bok`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1440 });
    for (const p of ['/feed', '/drabinka', '/zlecenia', '/uslugi']) {
      await page.goto(p);
      // `first`: przy strumieniowaniu SSR obok treści bywa jeszcze szkielet z tą samą ramą.
      await expect(page.locator('.v17 .rama').first()).toBeVisible();
      const m = await page.evaluate(() => ({
        zoom: getComputedStyle(document.documentElement).zoom,
        nadmiar: document.documentElement.scrollWidth - window.innerWidth,
      }));
      expect(m.zoom, p).toBe(skala);
      expect(m.nadmiar, p).toBeLessThanOrEqual(0);
    }
  });
}

test('stary wygląd nie dostaje skali dużego ekranu', async ({ page }) => {
  await page.setViewportSize({ width: 3440, height: 1440 });
  await page.goto('/regulamin');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).zoom)).toBe('1');
});
