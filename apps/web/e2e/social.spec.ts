import { expect, test, type Page } from '@playwright/test';

// Warstwa społecznościowa (X-lite): kompozytor → worker (outbox → projekcja
// feedu) → widoczność w „Całej społeczności" → permalink, docenienie, komentarz.
// Ten test wymaga DZIAŁAJĄCEGO workera: wpis trafia do feedu wyłącznie przez
// konsumenta zdarzenia social.post_published. Jeśli worker nie wstanie, feed
// zostanie pusty — i o tym właśnie ma nam powiedzieć czerwony test, zamiast
// cichej ciszy na produkcji.

const PASSWORD = 'super-tajne-haslo-1';
const stamp = Date.now();

async function register(page: Page, displayName: string, email: string) {
  await page.goto('/rejestracja');
  await page.getByLabel('Imię i nazwisko (lub nazwa)').fill(displayName);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel(/^Hasło/).fill(PASSWORD);
  await page.getByRole('button', { name: 'Utwórz konto' }).click();
  await page.waitForURL('**/panel', { timeout: 30_000 });
}

test('wpis portalowy: kompozytor → feed społeczności → permalink → docenienie', async ({
  browser,
}) => {
  const authorCtx = await browser.newContext();
  const readerCtx = await browser.newContext();
  const author = await authorCtx.newPage();
  const reader = await readerCtx.newPage();

  const body = `Wpis e2e ${stamp}: dziś domykam wdrożenie i dzielę się wnioskami.`;

  await register(author, 'E2E Autor', `autor-${stamp}@e2e.local`);

  // Publikacja z ponowieniem — chroni przed wyścigiem hydracji kompozytora.
  await author.goto('/feed');
  await expect(async () => {
    const field = author.getByPlaceholder(/Co dziś zbudowałeś/);
    if (await field.isVisible().catch(() => false)) {
      await field.fill(body);
      await author
        .getByRole('button', { name: 'Opublikuj' })
        .click({ timeout: 1_500 })
        .catch(() => {});
    }
    await expect(author.getByText(body).first()).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });

  // Obcy czytelnik (inna sesja) widzi wpis w „Całej społeczności" — to znaczy,
  // że worker zmaterializował zdarzenie w osi aktywności.
  await register(reader, 'E2E Czytelnik', `czytelnik-${stamp}@e2e.local`);
  await expect(async () => {
    await reader.goto('/feed?zakres=wszyscy');
    await expect(reader.getByText(body).first()).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 45_000 });

  // Permalink + komentarz + docenienie.
  await reader
    .getByRole('link', { name: /Skomentuj|Komentarze/ })
    .first()
    .click();
  await reader.waitForURL('**/wpisy/**');
  await expect(reader.getByText(body).first()).toBeVisible();

  await reader.getByPlaceholder('Dodaj komentarz…').fill('Gratulacje — jak mierzyłeś efekt?');
  await reader.getByRole('button', { name: 'Skomentuj' }).click();
  await expect(reader.getByText('Gratulacje — jak mierzyłeś efekt?')).toBeVisible({
    timeout: 15_000,
  });

  await reader.getByRole('button', { name: 'Doceniam' }).click();
  await expect(reader.getByRole('button', { name: 'Cofnij docenienie' })).toBeVisible({
    timeout: 15_000,
  });

  await authorCtx.close();
  await readerCtx.close();
});

test('gość widzi feed społeczności bez logowania', async ({ page }) => {
  await page.goto('/feed?zakres=wszyscy');
  // Kluczowe: ŻADNEGO przekierowania na logowanie — pusty rynek nie wybacza
  // ekranu logowania jako pierwszego wrażenia.
  await expect(page).toHaveURL(/\/feed/);
  await expect(page.getByRole('heading', { name: 'Feed społeczności' })).toBeVisible();
  // Zawężone do <main>: „Załóż konto" jest też w stopce na każdej stronie.
  await expect(page.getByRole('main').getByRole('link', { name: 'Załóż konto' })).toBeVisible();
});
