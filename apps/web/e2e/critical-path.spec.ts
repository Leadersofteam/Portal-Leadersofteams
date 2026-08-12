import { expect, test, type Locator, type Page } from '@playwright/test';

// Ścieżka krytyczna marketplace end-to-end przez UI (ADR-008, D5):
// rejestracja → firma → zlecenie → oferta → przyznanie → cykl realizacji →
// obustronna ocena → naliczenie punktów Drabinki. Dwaj aktorzy w osobnych
// kontekstach (własne sesje). Zakłada zaseedowane branże (base seed) i
// URUCHOMIONY worker (punkty naliczają się przez outbox → konsument ladder).
//
// Turnstile jest OFF (brak sekretu) — rejestracja bez tokenu, zgodnie z
// domyślnym stanem. Selektory: role/label (brak data-testid w UI).

const PASSWORD = 'super-tajne-haslo-1';
const stamp = Date.now();
const uniq = (p: string) => `${p}-${stamp}@e2e.local`;

// Klik przycisku akcji cyklu + oczekiwanie na nowy stan, z ponowieniem: chroni
// przed wyścigiem „widoczny, ale jeszcze niezhydratowany" przycisk (onClick nie
// podpięty). Jeśli przycisk zniknął (akcja się udała) — tylko sprawdzamy stan.
async function clickUntil(page: Page, buttonName: string, expected: string | RegExp) {
  await expect(async () => {
    const btn = page.getByRole('button', { name: buttonName });
    // W stanie „pending" etykieta zmienia się na „…", więc przycisk o tej nazwie
    // znika — nie klikamy wtedy ponownie, tylko czekamy na docelowy stan (tekst).
    if (await btn.isVisible().catch(() => false))
      await btn.click({ timeout: 1_500 }).catch(() => {});
    await expect(page.getByText(expected, { exact: false }).first()).toBeVisible({
      timeout: 2_000,
    });
  }).toPass({ timeout: 30_000 });
}

// Wysłanie oceny z ponowieniem (odporne na wyścig hydracji).
//
// SUKCES = POZYTYWNY ślad zapisanej oceny na stronie, nigdy „zniknięcie
// formularza". Nieobecność elementu jest prawdziwa także wtedy, gdy strona
// jest w trakcie nawigacji albo jeszcze się nie wyrenderowała — na tym właśnie
// łapał się poprzedni wariant: helper meldował sukces, choć ocena nie poleciała,
// a test padał dopiero kilka kroków dalej, w miejscu niezwiązanym z przyczyną.
//
// `success` podaje wołający jako LOKATOR, bo ślad zależy od kolejności: pierwsza
// oceniająca strona widzi „czeka na ocenę drugiej strony", druga — opublikowaną
// sekcję ocen. Lokator, nie tekst: fraza „Oceny publikują się symultanicznie…"
// stoi w opisie SAMEGO formularza, więc getByText(/Oceny/) meldowałby sukces,
// zanim cokolwiek poleci (dokładnie ta pułapka wywróciła wcześniejszą wersję).
async function submitReview(page: Page, success: Locator) {
  await expect(async () => {
    const select = page.getByLabel('Ocena');
    if (await select.isVisible().catch(() => false)) {
      await select.selectOption('5').catch(() => {});
      // krótki timeout: gdy trwa wysyłka etykieta = „Wysyłanie…" i przycisk o tej
      // nazwie nie istnieje — klik po prostu odpada, czekamy na zapis.
      await page
        .getByRole('button', { name: 'Wyślij ocenę' })
        .click({ timeout: 1_500 })
        .catch(() => {});
    }
    await expect(success.first()).toBeVisible({ timeout: 6_000 });
  }).toPass({ timeout: 40_000 });
}

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

test('ścieżka krytyczna: rejestracja → zlecenie → oferta → cykl → ocena → punkty', async ({
  browser,
}) => {
  const companyCtx = await browser.newContext();
  const leaderCtx = await browser.newContext();
  const companyPage = await companyCtx.newPage();
  const leaderPage = await leaderCtx.newPage();

  const companyName = `E2E Firma ${stamp}`;
  const orderTitle = `Zlecenie E2E ${stamp}`;

  // 1) Firma: rejestracja + profil firmy.
  await register(companyPage, 'E2E Zlecajaca', uniq('firma'));
  await companyPage.goto('/firma/nowa');
  await companyPage.getByLabel('Nazwa firmy').fill(companyName);
  await companyPage
    .getByRole('button', { name: 'Utwórz firmę' })
    .click({ timeout: 1_500 })
    .catch(() => {});

  // 2) Firma: utworzenie zlecenia. Doprowadzamy do formularza zlecenia odpornie na
  //    jitter (wyścig hydracji przycisku + opóźnienie widoczności firmy w SSR):
  //    jeśli firmy jeszcze nie widać — dosyłamy formularz na /firma/nowa albo
  //    przeładowujemy /zlecenia/nowe, aż pojawi się select „Firma zlecająca".
  await expect(async () => {
    const select = companyPage.getByLabel('Firma zlecająca');
    if (await select.isVisible().catch(() => false)) return;
    const createBtn = companyPage.getByRole('button', { name: 'Utwórz firmę' });
    if (await createBtn.isVisible().catch(() => false)) {
      await companyPage
        .getByLabel('Nazwa firmy')
        .fill(companyName)
        .catch(() => {});
      await createBtn.click({ timeout: 1_500 }).catch(() => {});
    } else {
      await companyPage.goto('/zlecenia/nowe');
    }
    await expect(select).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  await companyPage.getByLabel('Firma zlecająca').selectOption({ label: companyName });
  await companyPage.getByLabel('Tytuł (min. 5 znaków)').fill(orderTitle);
  await companyPage.getByLabel('Branża').selectOption({ label: 'IT i programowanie' });
  await companyPage
    .getByLabel('Opis potrzeby (min. 20 znaków)')
    .fill('Potrzebujemy zbudować prosty panel administracyjny w Next.js. Zakres do ustalenia.');
  await companyPage.getByLabel('Budżet od (zł)').fill('4000');
  await companyPage.getByLabel('Budżet do (zł)').fill('8000');
  await companyPage.getByRole('button', { name: 'Zapisz szkic zlecenia' }).click();
  // Czekamy na stronę SZCZEGÓŁÓW (nagłówek = tytuł zlecenia) — glob `**/zlecenia/**`
  // złapałby przedwcześnie `/zlecenia/nowe`, więc kotwiczymy się na treści detalu.
  await expect(companyPage.getByRole('heading', { name: orderTitle, level: 1 })).toBeVisible({
    timeout: 30_000,
  });
  const orderUrl = companyPage.url();
  expect(orderUrl).toMatch(/\/zlecenia\/[^/]+$/);
  expect(orderUrl).not.toContain('/nowe');

  await clickUntil(companyPage, 'Opublikuj zlecenie', 'Otwarte na oferty');

  // 3) Zlecenie widoczne na publicznym listingu.
  await companyPage.goto('/zlecenia');
  await expect(companyPage.getByRole('link', { name: orderTitle })).toBeVisible();

  // 4) Lider: rejestracja + profil Lidera.
  await register(leaderPage, 'E2E Lider', uniq('lider'));
  await leaderPage.goto('/panel/profil');
  // Jedyne miejsce w tym pliku bez ponowienia — a formularz profilu jest tak samo
  // podatny na wyścig hydracji jak akcje zlecenia (klik przed podpięciem onSubmit
  // po prostu przepada). Ponawiamy w rytmie clickUntil: wypełnij → kliknij →
  // sprawdź, czy przycisk zmienił etykietę na „Zapisz zmiany".
  await expect(async () => {
    const submit = leaderPage.getByRole('button', { name: 'Utwórz profil' });
    if (await submit.isVisible().catch(() => false)) {
      await leaderPage
        .getByLabel('Branża / kompetencja')
        .selectOption({ label: 'IT i programowanie' })
        .catch(() => {});
      await leaderPage
        .getByLabel(/^Nagłówek/)
        .fill('Fullstack developer (Next.js/Node)')
        .catch(() => {});
      await submit.click({ timeout: 1_500 }).catch(() => {});
    }
    await expect(leaderPage.getByText('Zapisz zmiany')).toBeVisible({ timeout: 2_500 });
  }).toPass({ timeout: 30_000 });

  // 5) Lider: złożenie oferty na zlecenie (odporne na wyścig hydracji).
  await leaderPage.goto(orderUrl);
  await expect(async () => {
    const msg = leaderPage.getByLabel(/Wiadomość do firmy/);
    if (await msg.isVisible().catch(() => false)) {
      await msg.fill(
        'Zrealizuję ten panel — mam duże doświadczenie w Next.js i podobnych wdrożeniach.',
      );
      await leaderPage
        .getByRole('button', { name: 'Wyślij ofertę' })
        .click({ timeout: 1_500 })
        .catch(() => {});
    }
    await expect(leaderPage.getByText(/Twoja oferta/).first()).toBeVisible({ timeout: 2_500 });
  }).toPass({ timeout: 30_000 });

  // 6) Firma: akceptacja oferty → zlecenie przyznane.
  await companyPage.goto(orderUrl);
  await expect(companyPage.getByRole('heading', { name: /Oferty/ })).toBeVisible();
  await clickUntil(companyPage, 'Wybierz tę ofertę', 'Wybrano Lidera');

  // 7) Cykl realizacji: Lider rozpoczyna → oddaje; Firma potwierdza.
  await leaderPage.goto(orderUrl);
  await clickUntil(leaderPage, 'Rozpocznij pracę', 'W realizacji');
  await clickUntil(leaderPage, 'Oddaj pracę', 'Dostarczone');

  await companyPage.goto(orderUrl);
  await clickUntil(companyPage, 'Potwierdź wykonanie', 'Zrealizowane');

  // 8) Obustronna ocena (publikacja symultaniczna: druga strona publikuje obie).
  await companyPage.goto(orderUrl);
  await submitReview(companyPage, companyPage.getByText(/czeka na ocenę drugiej strony/));

  // Druga ocena zamyka publikację symultaniczną → obie oceny stają się jawne,
  // więc u Lidera sukcesem jest już NAGŁÓWEK sekcji ocen (nie tekst).
  await leaderPage.goto(orderUrl);
  await submitReview(leaderPage, leaderPage.getByRole('heading', { name: 'Oceny', exact: true }));

  // Obie oceny opublikowane → sekcja „Oceny" widoczna także dla Firmy.
  await companyPage.goto(orderUrl);
  await expect(companyPage.getByRole('heading', { name: 'Oceny', exact: true })).toBeVisible({
    timeout: 30_000,
  });

  // 9) Punkty Drabinki naliczone Liderowi (worker przez outbox → ladder).
  //    Wpis pojawia się w karencji (PENDING → badge „Karencja (7 dni)"). Wartość
  //    zależy od wag (świeża firma = waga dojrzałości 0.5 → 50 pkt z oceny 5/5),
  //    więc kotwiczymy się na FAKCIE naliczenia (badge), nie na kwocie.
  await expect(async () => {
    await leaderPage.goto('/panel/punkty');
    await expect(leaderPage.getByText('Nie masz jeszcze punktów')).toBeHidden({ timeout: 2_000 });
    await expect(leaderPage.getByText('Karencja (7 dni)').first()).toBeVisible({ timeout: 3_000 });
    await expect(leaderPage.getByText(/za zlecenie/).first()).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 45_000 });

  await companyCtx.close();
  await leaderCtx.close();
});
