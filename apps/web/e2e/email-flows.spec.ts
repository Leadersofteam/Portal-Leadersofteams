import { expect, test, type Page } from '@playwright/test';

// Przepływy z e-maila: aktywacja konta i reset hasła — PRZEKLIKANE, nie tylko
// „wysłane".
//
// DLACZEGO TEN PLIK ISTNIEJE: 13.08 uznaliśmy pocztę za zrobioną na podstawie
// tego, że w logach pojawiło się `mail.sent`. Nikt nie kliknął linku. Okazało
// się, że OBIE strony docelowe (`/weryfikacja`, `/reset-hasla`) po prostu nie
// istniały — właściciel dostał 404 przy aktywacji, a reset hasła był martwy
// od początku. Ten test istnieje po to, żeby taka dziura nie mogła wrócić.
//
// Tokenów nie czytamy z maila (na e2e poczta jest no-op), tylko:
//  - reset: z odpowiedzi API, która poza produkcją zwraca `devToken`,
//  - aktywacja: z API po zalogowaniu (ponowna wysyłka zwraca token w devie).

const PASSWORD = 'super-tajne-haslo-1';
const NEW_PASSWORD = 'zupelnie-inne-haslo-9';
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

test('reset hasła: prośba z logowania → link → nowe hasło → logowanie', async ({ page }) => {
  const email = `reset-${stamp}@test.local`;
  await register(page, 'Zapominalski Testowy', email);

  // Wylogowanie — wchodzimy w buty osoby, która nie pamięta hasła.
  await page.getByRole('button', { name: /Wyloguj/ }).click();
  await page.waitForURL(/\/(logowanie)?$/, { timeout: 30_000 });

  // 1. Z ekranu logowania MUSI dać się dojść do resetu. Do S15 tego linku nie było.
  await page.goto('/logowanie');
  await page.getByRole('link', { name: 'Nie pamiętam hasła' }).click();
  await page.waitForURL('**/nie-pamietam-hasla', { timeout: 30_000 });

  // 2. Prośba o link. Odpowiedź jest zawsze taka sama (brak enumeracji kont),
  //    więc token przechwytujemy z odpowiedzi API — poza produkcją API oddaje
  //    go jako `devToken` właśnie po to, żeby dało się to przetestować.
  const resetResponse = page.waitForResponse(
    (r) => r.url().includes('/auth/request-password-reset') && r.status() === 200,
  );
  await page.getByLabel('E-mail').fill(email);
  await page.getByRole('button', { name: 'Wyślij link' }).click();
  const token = ((await (await resetResponse).json()) as { devToken?: string }).devToken;
  expect(
    token,
    'API nie oddało devToken — bez niego nie da się przejść ścieżki w e2e',
  ).toBeTruthy();

  // Kotwiczymy na POZYTYWNYM śladzie, nie na zniknięciu formularza.
  await expect(page.getByRole('heading', { name: 'Sprawdź skrzynkę' })).toBeVisible();

  // 3. Klik w link z maila. TO JEST KROK, KTÓREGO ZABRAKŁO 13.08.
  await page.goto(`/reset-hasla?token=${token}`);
  await expect(page.getByRole('heading', { name: 'Ustaw nowe hasło' })).toBeVisible();

  await page.getByLabel('Nowe hasło (min. 10 znaków)').fill(NEW_PASSWORD);
  await page.getByLabel('Powtórz hasło').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Ustaw hasło' }).click();
  await expect(page.getByRole('heading', { name: 'Hasło ustawione' })).toBeVisible();

  // 4. Nowe hasło naprawdę działa — i o to w całej tej ścieżce chodzi.
  await page.goto('/logowanie');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Hasło').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Zaloguj się' }).click();
  await page.waitForURL('**/panel', { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: /Cześć/ })).toBeVisible();
});

test('aktywacja: baner w panelu → ponowna wysyłka → link potwierdza adres', async ({ page }) => {
  const email = `aktywacja-${stamp}@test.local`;
  await register(page, 'Niepotwierdzony Testowy', email);

  // Baner widoczny dla konta bez potwierdzonego adresu.
  await expect(page.getByRole('heading', { name: 'Potwierdź adres e-mail' })).toBeVisible();

  const resend = page.waitForResponse(
    (r) => r.url().includes('/auth/resend-verification') && r.status() === 200,
  );
  await page.getByRole('button', { name: 'Wyślij link ponownie' }).click();
  const token = ((await (await resend).json()) as { devToken?: string }).devToken;
  expect(token, 'brak devToken przy ponownej wysyłce aktywacji').toBeTruthy();

  // Link z maila prowadzi na DZIAŁAJĄCĄ stronę, nie w 404 (regresja z 13.08).
  await page.goto(`/weryfikacja?token=${token}`);
  await expect(page.getByText('Twój adres e-mail jest potwierdzony')).toBeVisible({
    timeout: 30_000,
  });

  // Po potwierdzeniu baner znika — stan czytany z bazy, nie z migawki sesji.
  await page.goto('/panel');
  await expect(page.getByRole('heading', { name: 'Potwierdź adres e-mail' })).toHaveCount(0);
});

test('zły token nie udaje sukcesu i tłumaczy, co robić dalej', async ({ page }) => {
  await page.goto('/weryfikacja?token=oczywiscie-nieprawidlowy-token-12345');
  await expect(page.getByText(/nieprawidłowy, już zużyty albo wygasł/)).toBeVisible({
    timeout: 30_000,
  });
  // Ślepy zaułek jest tu największym ryzykiem — z tego ekranu MUSI być wyjście.
  // Zawężone do `main`: „Zaloguj się" jest też w nagłówku i w stopce, więc
  // niezawężony lokator łamie tryb strict.
  await expect(page.getByRole('main').getByRole('link', { name: 'Zaloguj się' })).toBeVisible();
});
