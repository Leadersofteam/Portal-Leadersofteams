import { expect, test, type Page } from '@playwright/test';

// P1 „Dom zalogowanego": zalogowany na „/" ląduje w /panel (middleware,
// obecność cookie `lot_sid`), gość dalej widzi landing, a furtka
// `/?widok=landing` zostawia stronę marketingową osiągalną z konta.
//
// Miny, które ten plik świadomie omija (MINY.md):
// - tryb strict: „Zaloguj się" jest w nagłówku, treści i stopce — każda
//   asercja jest zawężona do banner/main/contentinfo;
// - `waitForURL(/regex/)` dopasowuje też BIEŻĄCY adres — po goto('/') u
//   zalogowanego asertujemy `toHaveURL(/\/panel$/)`, którego „/" nie spełnia;
// - sukces przez nieobecność: brak „Zaloguj się" w stopce sprawdzamy dopiero
//   PO pozytywnym pojawieniu się linku „Panel" (hydracja linków klienckich).

const PASSWORD = 'super-tajne-haslo-1';
const stamp = Date.now();

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

test('gość na „/" zostaje na landingu i widzi linki logowania', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/(\?.*)?$/);
  await expect(page.getByRole('heading', { name: /Status, którego nie da się kupić/ })).toBeVisible(
    { timeout: 15_000 },
  );
  await expect(
    page.getByRole('contentinfo').getByRole('link', { name: 'Zaloguj się' }),
  ).toBeVisible({ timeout: 15_000 });
});

test('zalogowany: „/" przekierowuje do /panel, furtka pokazuje landing bez kłamstwa w stopce', async ({
  page,
}) => {
  await register(page, 'E2E Redirect', `redirect-${stamp}@e2e.local`);

  // 1. Klik w logo / wejście na „/" = powrót do domu zalogowanego.
  await page.goto('/');
  await expect(page).toHaveURL(/\/panel$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: /Cześć,/ })).toBeVisible({ timeout: 30_000 });

  // 2. Furtka: landing osiągalny świadomie, a stopka zna zalogowanego.
  await page.goto('/?widok=landing');
  await expect(page.getByRole('heading', { name: /Status, którego nie da się kupić/ })).toBeVisible(
    { timeout: 15_000 },
  );
  const stopka = page.getByRole('contentinfo');
  await expect(stopka.getByRole('link', { name: 'Panel' })).toBeVisible({ timeout: 15_000 });
  await expect(stopka.getByRole('link', { name: 'Zaloguj się' })).toHaveCount(0);

  // 3. Po wylogowaniu „/" znów jest landingiem (cookie wyczyszczone przez API).
  await page.goto('/panel');
  await page.getByRole('button', { name: 'Wyloguj się' }).click();
  await page.waitForURL(/\/(\?.*)?$/, { timeout: 30_000 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Status, którego nie da się kupić/ })).toBeVisible(
    { timeout: 15_000 },
  );
});
