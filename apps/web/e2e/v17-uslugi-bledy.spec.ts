import { expect, test, type Page } from '@playwright/test';

// Dwa zastane błędy usług, w obu wyglądach (dzisiejszym i V17 za opt-inem):
// „Edytuj” przy szkicu kończyło się 404, a ponowne kliknięcie po nieudanej publikacji tworzyło drugi szkic.

const PASSWORD = 'super-tajne-haslo-1';
const stamp = Date.now();

async function lider(page: Page, email: string) {
  await page.goto('/rejestracja');
  await page.getByLabel('Imię i nazwisko (lub nazwa)').fill('E2E Usługi');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel(/^Hasło/).fill(PASSWORD);
  await page.getByRole('button', { name: 'Utwórz konto' }).click();
  await page.waitForURL('**/start', { timeout: 30_000 });
  const { industries } = (await (await page.request.get('/api/v1/industries')).json()) as {
    industries: Array<{ id: string; name: string }>;
  };
  const industry = industries.find((i) => i.name === 'IT i programowanie') ?? industries[0]!;
  const profil = await page.request.post('/api/v1/me/leader-profile', {
    data: { industryId: industry.id, headline: 'Wdrożenia i integracje', isVisible: true },
  });
  expect(profil.status()).toBe(201);
  return industry;
}

async function mojeUslugi(page: Page) {
  const res = await page.request.get('/api/v1/me/listings');
  return ((await res.json()) as { listings: Array<{ title: string; status: string }> }).listings;
}

for (const wyglad of ['off', 'v17'] as const) {
  test(`usługi (${wyglad}): szkic da się edytować, ponowna publikacja nie dubluje`, async ({
    page,
  }) => {
    const industry = await lider(page, `uslugi-${wyglad}-${stamp}@e2e.local`);
    const tytul = `Wdrożę obieg faktur ${wyglad} ${stamp}`;

    // Publikacja pada raz (jak limit świeżego konta), szkic zostaje zapisany.
    await page.route('**/api/v1/listings/*/publish', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'QUOTA', message: 'Dzienny limit publikacji.' } }),
      }),
    );
    await page.goto(`/uslugi/nowa?wyglad=${wyglad}`);
    const form = page.locator('main form, .v17 form').first();
    const przycisk = form.getByRole('button', { name: /^Opublikuj/ });
    await expect(async () => {
      await form.getByLabel(/^Tytuł usługi/).fill(tytul);
      await form.getByLabel(/^Branża/).selectOption(industry.id);
      await form
        .getByLabel(/^Opis/)
        .fill('Ustawiam odczyt danych z faktur, akceptację w dwóch krokach i eksport do biura.');
      await form.getByPlaceholder('np. Audyt / Wdrożenie / Wdrożenie + opieka').fill('Audyt');
      const liczby = form.locator('input[type="number"], input[inputmode="numeric"]');
      await liczby.nth(0).fill('1200');
      await liczby.nth(1).fill('5');
      await form
        .locator('textarea')
        .last()
        .fill('Mapa dzisiejszego obiegu i lista miejsc do automatyzacji.');
      await przycisk.click({ timeout: 1_500 });
      await expect(page.getByText(/Szkic zapisany, ale nie opublikowany/)).toBeVisible({
        timeout: 4_000,
      });
    }).toPass({ timeout: 45_000 });
    await expect(przycisk).toHaveText(/Opublikuj ponownie/);
    expect((await mojeUslugi(page)).filter((l) => l.title === tytul)).toHaveLength(1);

    // Druga próba (limit „minął”) publikuje TEN SAM szkic.
    await page.unroute('**/api/v1/listings/*/publish');
    await przycisk.click();
    await page.waitForURL((url) => /\/uslugi\/(?!nowa)[^/]+$/.test(url.pathname), {
      timeout: 30_000,
    });
    const moje = (await mojeUslugi(page)).filter((l) => l.title === tytul);
    expect(moje).toHaveLength(1);
    expect(moje[0]!.status).toBe('PUBLISHED');

    // „Edytuj” przy szkicu (dawniej 404).
    const created = await page.request.post('/api/v1/listings', {
      data: {
        industryId: industry.id,
        title: `${tytul} szkic`,
        description:
          'Szkic do poprawienia przed publikacją — opis ma więcej niż pięćdziesiąt znaków.',
        tags: [],
        packages: [
          {
            tier: 'BASIC',
            name: 'Audyt',
            priceDeclared: 500,
            scope: 'Przegląd i krótki raport',
            deliveryDays: 3,
          },
        ],
        imageFileIds: [],
      },
    });
    const { slug } = (await created.json()) as { slug: string };
    const res = await page.goto(`/uslugi/${slug}/edytuj`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Edytuj usługę' })).toBeVisible();
    await expect(page.getByLabel(/^Tytuł usługi/)).toHaveValue(`${tytul} szkic`);
  });
}
