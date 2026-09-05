import { expect, test } from '@playwright/test';

// PL5: zaproszenie Lidera przez UI — strona mówi wprost, że nic za to nie ma,
// formularz wysyła i potwierdza. Poczta w e2e wyłączona (no-op), więc dowodem
// jest odpowiedź API i komunikat; brak punktów pilnuje antimlm.integration.test.
const stamp = Date.now();

test('zalogowany zaprasza Lidera: strona bez obietnic, formularz potwierdza wysyłkę', async ({
  page,
}) => {
  await page.goto('/rejestracja');
  await page.getByLabel('Imię i nazwisko (lub nazwa)').fill('Zapraszająca E2E');
  await page.getByLabel('E-mail', { exact: true }).fill(`zapros-${stamp}@e2e.local`);
  await page.getByLabel(/^Hasło/).fill('super-tajne-haslo-1');
  await page.getByRole('button', { name: 'Utwórz konto' }).click();
  await page.waitForURL('**/start', { timeout: 30_000 });

  await page.goto('/panel/zapros');
  await expect(page.getByRole('heading', { name: 'Zaproś Lidera' })).toBeVisible();
  await expect(page.getByText(/Nic za to nie dostajesz/)).toBeVisible();
  await page.getByLabel(/Adres e-mail osoby/).fill(`zaproszony-${stamp}@e2e.local`);
  await page.getByLabel(/Kilka słów od Ciebie/).fill('Zobacz, jak tu liczą punkty.');
  await expect(async () => {
    await page
      .getByRole('button', { name: 'Wyślij zaproszenie' })
      .click({ timeout: 1_500 })
      .catch(() => {});
    await expect(page.getByTestId('invite-sent')).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
});
