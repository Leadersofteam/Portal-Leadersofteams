import { expect, test, type Page } from '@playwright/test';

// RODO ma ścieżkę użytkownika — PRZEKLIKANĄ, nie tylko „endpoint działa".
//
// DLACZEGO TEN PLIK ISTNIEJE: `GET /me/export` i `DELETE /me` powstały w D6,
// miały testy API i przez cały ten czas nie miały w aplikacji ANI JEDNEGO
// wywołania — a polityka prywatności twierdziła, że „w panelu konta możesz
// pobrać komplet swoich danych". Dokładnie ta sama mina co martwy reset hasła:
// zielony backend, zero drogi dla człowieka. Ten test przechodzi drogę.
//
// Test świadomie KOŃCZY SIĘ USUNIĘCIEM konta — to jednocześnie sprzątanie po
// sobie. Konta testowe w tym repo potrafiły zostać na miesiąc i być liczone
// jako realni użytkownicy.

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

test('konto: panel → eksport danych → usunięcie konta z potwierdzeniem', async ({ page }) => {
  const email = `konto-${stamp}@test.local`;
  await register(page, 'Rodo Testowy', email);

  // 1. Do strony konta MUSI dać się dojść z panelu. Trasa bez wejścia w UI to
  //    funkcja, której nie ma — dlatego klikamy link, a nie `goto`.
  await page.getByRole('link', { name: 'Konto i dane' }).click();
  await page.waitForURL('**/panel/konto', { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Konto i dane' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  // 2. Eksport. Kotwiczymy na ZDARZENIU pobrania, nie na zmianie napisu na
  //    przycisku — „sukces przez nieobecność" już raz w tym repo zameldował
  //    powodzenie akcji, która się nie wykonała.
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('button', { name: /Pobierz swoje dane/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^leaders-of-teams-moje-dane-\d{4}-\d{2}-\d{2}\.json$/,
  );

  // Plik ma zawierać realne dane, a nie pustą skorupę.
  const path = await download.path();
  expect(path).toBeTruthy();
  const { readFile } = await import('node:fs/promises');
  const exported = JSON.parse(await readFile(path!, 'utf8')) as {
    user?: { email?: string };
    exportedAt?: string;
  };
  expect(exported.user?.email).toBe(email);
  expect(exported.exportedAt).toBeTruthy();

  // 3. Usunięcie konta. Przycisk jest zablokowany, dopóki nie padnie słowo —
  //    operacji nieodwracalnej nie wolno wyklikać dwoma odruchami.
  const deleteButton = page.getByRole('button', { name: 'Usuń konto na zawsze' });
  await expect(deleteButton).toBeDisabled();
  await page.getByLabel(/Wpisz/).fill('usuwam');
  await expect(deleteButton, 'małe litery nie są potwierdzeniem').toBeDisabled();
  await page.getByLabel(/Wpisz/).fill('USUWAM');
  await expect(deleteButton).toBeEnabled();
  await deleteButton.click();

  // 4. Wylądowaliśmy na stronie głównej jako gość.
  await page.waitForURL(/\/$/, { timeout: 30_000 });
  await page.goto('/panel');
  await page.waitForURL('**/logowanie', { timeout: 30_000 });

  // 5. Najważniejsza asercja: stare dane logowania już NIE działają. Bez niej
  //    test przeszedłby także wtedy, gdyby `DELETE /me` tylko wylogowywał.
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Hasło').fill(PASSWORD);
  await page.getByRole('button', { name: 'Zaloguj się' }).click();
  await expect(page.getByRole('main').getByText(/Nieprawidłow/)).toBeVisible();
});
