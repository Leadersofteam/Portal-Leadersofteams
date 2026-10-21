import { expect, test } from '@playwright/test';

// PL2 „Firma w 90 sekund" (D2): gość opisuje potrzebę BEZ konta, zakłada konto
// i firmę jednym formularzem, wraca do wypełnionego szkicu, zapisuje i publikuje.
// Do 04.09 CTA „Dodaj zlecenie jako Firma" prowadziło do ściany logowania.
// W e2e poczta jest wyłączona, więc bramka „publikacja po potwierdzeniu adresu"
// jest nieaktywna (test integracyjny sprawdza ją z flagą) — tu sprawdzamy
// ścieżkę człowieka od landingu do „Otwarte na oferty".

const stamp = Date.now();

test('gość: opis potrzeby → konto i firma → szkic wraca → publikacja', async ({ page }) => {
  // 1) Gość na formularzu potrzeby — bez przekierowania do logowania.
  await page.goto('/zlecenia/nowe');
  await expect(page.getByRole('heading', { name: 'Opisz, co ma powstać' })).toBeVisible();
  await page.getByLabel(/Tytuł/).fill(`Automatyzacja ofertowania ${stamp}`);
  await page
    .getByLabel(/Opis potrzeby/)
    .fill('Szukamy Lidera, który uporządkuje nasz proces ofertowania i wdroży rytm tygodniowy.');
  await page.getByLabel('Branża').selectOption({ label: 'IT i programowanie' });
  await page.getByLabel('Budżet od (zł)').fill('2000');
  await page.getByLabel('Budżet do (zł)').fill('4000');
  await page.getByRole('button', { name: 'Dalej: konto i firma' }).click();

  // 2) Rejestracja z jednym dodatkowym polem — nazwą firmy.
  await page.waitForURL(/\/rejestracja\?cel=firma/);
  await expect(page.getByRole('heading', { name: 'Konto i firma — jeden krok' })).toBeVisible();
  await page.getByLabel('Imię i nazwisko (lub nazwa)').fill('Alicja Testowa');
  await page.getByLabel('Nazwa firmy', { exact: true }).fill(`Kwiatkowscy E2E ${stamp}`);
  await page.getByLabel('E-mail', { exact: true }).fill(`pl2-firma-${stamp}@e2e.local`);
  await page.getByLabel(/^Hasło/).fill('super-tajne-haslo-1');
  await page.getByRole('button', { name: 'Utwórz konto' }).click();

  // 3) Powrót do formularza — kreator POMINIĘTY, szkic przywrócony.
  await page.waitForURL('**/zlecenia/nowe', { timeout: 30_000 });
  await expect(page.getByTestId('draft-restored')).toBeVisible();
  await expect(page.getByLabel(/Tytuł/)).toHaveValue(`Automatyzacja ofertowania ${stamp}`);
  await expect(page.getByLabel('Firma zlecająca')).toContainText(`Kwiatkowscy E2E ${stamp}`);
  await expect(async () => {
    await page
      .getByRole('button', { name: 'Zapisz szkic zlecenia' })
      .click({ timeout: 1_500 })
      .catch(() => {});
    await expect(page).toHaveURL(/\/zlecenia\/[a-z0-9]+$/, { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });

  // 4) Publikacja ze strony zlecenia — sukces to POZYTYWNY ślad statusu.
  await expect(async () => {
    const btn = page.getByRole('button', { name: 'Opublikuj zlecenie' });
    if (await btn.isVisible().catch(() => false))
      await btn.click({ timeout: 1_500 }).catch(() => {});
    await expect(page.getByText('Otwarte na oferty').first()).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  // 5) Fala 2 (21.10): panel Firmy mówi o JEJ zleceniu, nie o Drabince.
  await page.goto('/panel');
  await expect(page.getByText('Panel firmy')).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole('heading', { name: `„Automatyzacja ofertowania ${stamp}” czeka na oferty` }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Zobacz zlecenie' })).toBeVisible();
});

test('fala 2: Firma jest akcją główną, /szukam-wykonawcy to 308 na /dla-firm', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('.hero-cta').first();
  // Pierwszy przycisk hero (wypełniony) prowadzi do formularza zlecenia.
  await expect(hero.locator('a.btn').first()).toHaveAttribute('href', '/zlecenia/nowe');
  await expect(hero.locator('a.btn').first()).toHaveText('Dodaj zlecenie');

  const res = await page.request.get('/szukam-wykonawcy', { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()['location']).toMatch(/\/dla-firm$/);
  await page.goto('/szukam-wykonawcy');
  await expect(page).toHaveURL(/\/dla-firm$/);
  await expect(page.getByText('Trzy drogi do Lidera')).toBeVisible();
});
