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
  // Po rejestracji ląduje się w kreatorze pierwszej mili (S10), nie od razu
  // w panelu — pomijamy go, bo te testy sprawdzają co innego.
  await page.waitForURL('**/start', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Pomiń kreator' }).click();
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

  // ZAKŁADKA (S17) przechodzona KOŃCEM-KOŃCEM. Sam endpoint już raz w tym repo
  // wystarczył, żeby uznać funkcję za gotową — i przez tydzień prowadziła w 404.
  // Kotwiczymy na pozytywnym śladzie: nazwa przycisku po zapisaniu i treść
  // wpisu na prywatnej półce.
  await reader.getByRole('button', { name: 'Zapisz na później' }).click();
  await expect(reader.getByRole('button', { name: 'Usuń z zapisanych' })).toBeVisible({
    timeout: 15_000,
  });

  await reader.goto('/panel/zapisane');
  await expect(reader.getByRole('heading', { name: 'Zapisane' })).toBeVisible();
  await expect(reader.getByText(body).first()).toBeVisible({ timeout: 15_000 });

  // Zdjęcie z półki działa z samej listy — i wpis z niej znika.
  await reader.getByRole('button', { name: 'Usuń z zapisanych' }).first().click();
  await expect(async () => {
    await reader.goto('/panel/zapisane');
    await expect(reader.getByText(body)).toHaveCount(0);
  }).toPass({ timeout: 20_000 });

  // ADR-010: prywatna półka nie może wyciekać na zewnątrz. Autor wpisu nie widzi
  // ŻADNEGO licznika zapisań pod swoją treścią.
  await author.goto('/feed?zakres=wszyscy');
  await expect(author.getByText(/zapisa(ł|no|ń) \d+/i)).toHaveCount(0);

  await authorCtx.close();
  await readerCtx.close();
});

// ZASTANY BŁĄD naprawiony w S17: nagłówek NIGDY nie czytał sesji, więc
// zalogowana osoba na każdej stronie widziała „Zaloguj się / Dołącz".
// Test celowo patrzy na NAGŁÓWEK (`banner`), a nie na stronę: „Zaloguj się"
// występuje też w treści i w stopce, więc lokator bez zawężenia łamie się
// na trzech dopasowaniach (tryb strict Playwrighta).
test('nagłówek rozpoznaje zalogowanego i gościa', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await guestPage.goto('/');
  await expect(
    guestPage.getByRole('banner').getByRole('link', { name: 'Zaloguj się' }),
  ).toBeVisible({ timeout: 15_000 });

  await register(page, 'E2E Nagłówek', `naglowek-${stamp}@e2e.local`);
  await page.goto('/');
  await expect(page.getByRole('banner').getByRole('link', { name: 'E2E' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('banner').getByRole('link', { name: 'Zaloguj się' })).toHaveCount(0);

  await context.close();
  await guest.close();
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
