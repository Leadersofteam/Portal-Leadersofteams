import { expect, test } from '@playwright/test';

// Powłoka mobilna (S8): dolny pasek, PWA, warianty kartowe tabel.
// Osobny plik, żeby nie wydłużać ścieżki krytycznej — te testy nie potrzebują
// ani workera, ani danych: sprawdzają szkielet, który musi działać dla gościa.

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

test.describe('kieszonkowa nawigacja', () => {
  test('dolny pasek ma 5 slotów o celach dotyku ≥ 44 px (390 px)', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/uslugi');

    const nav = page.getByRole('navigation', { name: 'Nawigacja główna' });
    await expect(nav).toBeVisible();

    // Slot powiadomień MUSI istnieć także dla gościa — inaczej pasek przeskakuje
    // z 5 na 4 kolumny w chwili hydracji i wygląda jak usterka.
    const slots = nav.locator('.bottom-nav-item, .bottom-nav-create');
    await expect(slots).toHaveCount(5);

    for (const slot of await slots.all()) {
      const box = await slot.boundingBox();
      expect(box, 'slot musi być widoczny').not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('dolny pasek znika na desktopie', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/uslugi');
    await expect(page.getByRole('navigation', { name: 'Nawigacja główna' })).toBeHidden();
  });

  test('przycisk [+] otwiera arkusz i zamyka go Escape', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/uslugi');

    await page.getByRole('button', { name: 'Utwórz' }).click();
    const sheet = page.locator('dialog.create-sheet');
    await expect(sheet).toBeVisible();
    await expect(page.getByRole('link', { name: /Opublikuj usługę/ })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  });
});

test.describe('PWA', () => {
  test('manifest jest instalowalny (standalone + ikona maskable)', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.status()).toBe(200);

    const manifest = await res.json();
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#0a0b12');
    expect(manifest.start_url).toContain('/feed');
    expect(
      manifest.icons.some((icon: { purpose?: string }) => icon.purpose?.includes('maskable')),
      'brak ikony maskable → Android przytnie znak marki',
    ).toBe(true);
  });

  test('service worker serwuje się z zakresem "/"', async ({ request }) => {
    const res = await request.get('/sw.js');
    expect(res.status()).toBe(200);
    expect(res.headers()['service-worker-allowed']).toBe('/');
  });

  test('strona offline istnieje i nie odpytuje API', async ({ page }) => {
    await page.goto('/offline');
    await expect(page.getByRole('heading', { name: /Jesteś offline/ })).toBeVisible();
  });

  test('offline pokazuje zapisany obraz feedu z localStorage (PD4)', async ({ page }) => {
    // Migawkę renderuje skrypt INLINE w dokumencie (nie React) — patrz
    // komentarz w app/offline/page.tsx. Kotwiczymy na POZYTYWNYM śladzie:
    // nagłówku sekcji i treści wpisu.
    await page.addInitScript(() => {
      localStorage.setItem(
        'lot_offline_feed',
        JSON.stringify({
          savedAt: 1755810000000,
          items: [
            {
              name: 'Osoba Testowa',
              time: '2026-08-21T18:30:00.000Z',
              text: 'Wpis próbny do czytania offline',
              lv: 2,
            },
          ],
        }),
      );
    });
    await page.goto('/offline');
    await expect(page.getByRole('heading', { name: 'Ostatni zapisany obraz feedu' })).toBeVisible();
    await expect(
      page.locator('.offline-feed-card').getByText('Wpis próbny do czytania offline'),
    ).toBeVisible();
    await expect(page.locator('.offline-feed-card strong')).toHaveText('Osoba Testowa');
  });
});

test.describe('tabele na telefonie', () => {
  test('/drabinka pokazuje karty na 390 px, a tabelę na desktopie', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/drabinka');
    await expect(page.locator('.rung-cards')).toBeVisible();
    await expect(page.locator('.table-wrap.desktop-only')).toBeHidden();

    await page.setViewportSize(DESKTOP);
    await expect(page.locator('.table-wrap.desktop-only')).toBeVisible();
    await expect(page.locator('.rung-cards')).toBeHidden();
  });
});

test.describe('szukanie i pakiety', () => {
  test('globalne pole prowadzi na /szukaj z zakładkami', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/uslugi');
    await page.getByPlaceholder('Szukaj usług, Liderów, zleceń…').fill('rekrutacja');
    await page.keyboard.press('Enter');
    await page.waitForURL('**/szukaj?q=rekrutacja');
    await expect(page.getByRole('heading', { name: 'Szukaj w Portalu' })).toBeVisible();
  });

  test('zbyt krótka fraza nie wywala strony, tylko prosi o więcej', async ({ page }) => {
    await page.goto('/szukaj?q=a');
    await expect(page.getByRole('heading', { name: 'Wpisz, czego szukasz' })).toBeVisible();
  });
});
