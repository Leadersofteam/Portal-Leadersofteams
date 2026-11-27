import { mkdirSync, writeFileSync } from 'node:fs';

import { expect, test, type Browser, type Page } from '@playwright/test';

// „Rynek — reszta” (11 ekranów V17 za opt-inem): przejście na prawdziwych danych. Pilnuje tego, czego nie widać
// w typach: 200, nagłówek makiety, brak przewijania w poziomie na 390 px, cele ≥ 44 px i brak opt-inu bez flagi.
// Z ZRZUTY=<katalog> ten sam przebieg zapisuje zrzuty 390 / 1512 / 3440 (para makieta–aplikacja).

const PASSWORD = 'super-tajne-haslo-1';
const stamp = Date.now();
const ZRZUTY = process.env.ZRZUTY;

async function konto(browser: Browser, displayName: string, email: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/rejestracja');
  await page.getByLabel('Imię i nazwisko (lub nazwa)').fill(displayName);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel(/^Hasło/).fill(PASSWORD);
  await page.getByRole('button', { name: 'Utwórz konto' }).click();
  await page.waitForURL('**/start', { timeout: 30_000 });
  return page;
}

async function api<T = Record<string, never>>(page: Page, url: string, data?: unknown): Promise<T> {
  const res = await page.request.post(`/api/v1${url}`, data === undefined ? {} : { data });
  expect(res.ok(), `${url} → ${res.status()} ${await res.text()}`).toBe(true);
  return (await res.json()) as T;
}
const idZ = (r: unknown): string => {
  const o = r as Record<string, { id?: string } | string>;
  if (typeof o.id === 'string') return o.id;
  const w = Object.values(o).find((v) => typeof v === 'object' && v?.id) as { id: string };
  return w.id;
};

interface Ekran {
  nazwa: string;
  url: string;
  h1: RegExp | string;
  kto?: Page;
}

async function sprawdz(e: Ekran, gosc: Page) {
  const page = e.kto ?? gosc;
  const bledy: string[] = [];
  // Adres przy błędzie: bez niego nie wiadomo, który z przebiegów (szerokość, motyw) go rzucił.
  const naBlad = (err: Error) =>
    bledy.push(`${page.url()} @${page.viewportSize()?.width}: ${err.message}`);
  page.on('pageerror', naBlad);
  // Sporadyczny React #418 (2 z 9 przebiegów 27.11, nieodtworzony w 750 wejściach): po nim React przerysowuje
  // drzewo i ślad znika, więc DOM sprzed hydracji trzeba mieć, zanim błąd się zdarzy.
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      (window as unknown as { __pre: string }).__pre = document.documentElement.outerHTML;
    });
  });
  let zapisane = 0;
  const sep = e.url.includes('?') ? '&' : '?';
  const widoki = ZRZUTY
    ? ([
        [390, 844, 'jasny'],
        [1512, 982, 'jasny'],
        [3440, 1440, 'jasny'],
        [390, 844, 'ciemny'],
        [1512, 982, 'ciemny'],
      ] as const)
    : ([[390, 844, 'jasny']] as const);
  for (const [width, height, motyw] of widoki) {
    await page.setViewportSize({ width, height });
    await page.goto('/regulamin');
    await page.evaluate(
      (t) => localStorage.setItem('lot_theme', t),
      motyw === 'jasny' ? 'light' : 'dark',
    );
    const res = await page.goto(`${e.url}${sep}wyglad=v17`, { waitUntil: 'load' });
    expect.soft(res?.status(), e.nazwa).toBe(200);
    // Puste stany („Najpierw dodaj firmę”) mają w makiecie sam nagłówek komunikatu.
    await expect
      .soft(page.locator('.v17.rs h1, .v17.rs .komunikat h2').first(), e.nazwa)
      .toHaveText(e.h1, { timeout: 5_000 });
    await page.waitForTimeout(700);
    if (bledy.length > zapisane) {
      zapisane = bledy.length;
      const slad = (n: string) => test.info().outputPath(`${e.nazwa}-${width}-${motyw}-${n}`);
      writeFileSync(slad('serwer.html'), (await res?.text().catch(() => '')) ?? '');
      writeFileSync(
        slad('przed-hydracja.html'),
        await page.evaluate(() => (window as unknown as { __pre?: string }).__pre ?? ''),
      );
      writeFileSync(slad('po.html'), await page.content());
    }
    if (ZRZUTY) {
      const baza = `${ZRZUTY}/v17-kod-reszta-${e.nazwa}-${motyw}-${width}`;
      if (width !== 1512) await page.screenshot({ path: `${baza}-ekran.png` });
      // Dolny pasek w zrzucie pełnostronicowym zasłania treść (portal-zrzuty) — unieruchamiamy go.
      const styl = await page.addStyleTag({
        content: '.v17 .dolny,.v17 .fab{position:static!important}',
      });
      await page.screenshot({ path: `${baza}.png`, fullPage: width !== 3440 });
      await styl.evaluate((n) => (n as HTMLElement).remove());
    }
    if (width === 390 && motyw === 'jasny') {
      const m = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        male: [...document.querySelectorAll('.v17 a, .v17 button, .v17 select, .v17 summary')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            if (!r.width || s.visibility === 'hidden' || el.closest('.nav, .sr, [data-cel-ok]'))
              return false;
            const po = getComputedStyle(el, '::after');
            const h =
              po.content !== 'none' && po.position === 'absolute' ? parseFloat(po.height) || 0 : 0;
            return Math.max(r.height, h) < 43.5;
          })
          .map((el) => `${el.className}:${el.textContent?.trim().slice(0, 30)}`),
      }));
      expect.soft(m.sw, `${e.nazwa}: przewijanie w poziomie`).toBeLessThanOrEqual(390);
      expect.soft(m.male, `${e.nazwa}: cele < 44 px`).toEqual([]);
    }
  }
  page.off('pageerror', naBlad);
  expect.soft(bledy, `${e.nazwa}: błędy JS`).toEqual([]);
}

test('Rynek — reszta: 11 ekranów V17 na prawdziwych danych, bez flagi dzisiejsze', async ({
  browser,
}) => {
  test.setTimeout(ZRZUTY ? 600_000 : 240_000);
  if (ZRZUTY) mkdirSync(ZRZUTY, { recursive: true });
  const firma = await konto(browser, 'Anna Dąbek', `reszta-firma-${stamp}@e2e.local`);
  const lider = await konto(browser, 'Ewa Cis', `reszta-lider-${stamp}@e2e.local`);
  const gosc = await (await browser.newContext()).newPage();

  const { industries } = (await (await gosc.request.get('/api/v1/industries')).json()) as {
    industries: Array<{ id: string; name: string; slug: string }>;
  };
  const br = industries.find((i) => i.name === 'IT i programowanie') ?? industries[0]!;
  const pusta = industries.find((i) => i.id !== br.id)!;

  const companyId = idZ(
    await api(firma, '/companies', {
      name: 'Meblarnia Dębowy Kąt',
      nip: '5252248481',
      description:
        'Producent mebli kuchennych na wymiar. Zlecamy to, czego nie robimy sami: procesy, integracje i marketing.',
    }),
  );
  await api(lider, '/me/leader-profile', {
    industryId: br.id,
    headline: 'Prowadzenie projektów w małych zespołach',
    isVisible: true,
  });

  const zlecenie = async (title: string, min: number, max: number) => {
    const id = idZ(
      await api(firma, '/orders', {
        companyId,
        industryId: br.id,
        title,
        description:
          'Mamy sześciu handlowców, oferta powstaje tydzień. Chcemy jednego procesu i szablonu wyceny.',
        budgetMin: min,
        budgetMax: max,
        minLevel: 0,
      }),
    );
    await api(firma, `/orders/${id}/publish`);
    return id;
  };
  const oferta = async (orderId: string) =>
    idZ(
      await api(lider, `/orders/${orderId}/offers`, {
        message:
          'Zaczynam od dwóch spotkań z handlowcami, potem piszę proces i szablon wyceny. Przez miesiąc prowadzę przegląd.',
        proposedBudget: 10400,
        proposedDays: 30,
      }),
    );

  // Jedno zlecenie przez pełny cykl (oceny na profilu firmy), jedno z żywą rozmową.
  const zrobione = await zlecenie('Plan produkcji na trzy zmiany', 6000, 9000);
  const oZrobione = await oferta(zrobione);
  await api(firma, `/offers/${oZrobione}/accept`);
  await api(lider, `/orders/${zrobione}/start`);
  await api(lider, `/orders/${zrobione}/deliver`);
  await api(firma, `/orders/${zrobione}/confirm`);
  await api(firma, `/orders/${zrobione}/reviews`, { rating: 5, comment: 'Jasny zakres.' });
  await api(lider, `/orders/${zrobione}/reviews`, {
    rating: 5,
    comment: 'Jasny zakres od pierwszego dnia, decyzje w ciągu doby.',
  });

  const otwarte = await zlecenie(
    'Uporządkowanie procesu ofertowania w dziale sprzedaży',
    8000,
    12000,
  );
  const ofertaId = await oferta(otwarte);
  const pustaOferta = await oferta(await zlecenie('Panel zamówień dla handlowców', 28000, 45000));
  await api(firma, `/offers/${ofertaId}/messages`, {
    body: 'Czy w cenie jest szkolenie dla dwóch osób i jedna wizyta u nas?',
  });
  await api(lider, `/offers/${ofertaId}/messages`, {
    body: 'Tak, szkolenie jest w cenie. Pierwsze spotkanie robię na miejscu.',
  });

  const usluga = async (title: string, publikuj: boolean) => {
    const r = await api<{ id: string; slug: string }>(lider, '/listings', {
      industryId: br.id,
      title,
      description:
        'Faktury przestają krążyć mailem. Ustawiam odczyt danych, akceptację i eksport, a na koniec szkolę dwie osoby.',
      tags: ['automatyzacja', 'faktury'],
      packages: [
        {
          tier: 'BASIC',
          name: 'Audyt obiegu',
          priceDeclared: 1200,
          scope: 'Mapa obiegu faktur i lista miejsc do automatyzacji.',
          deliveryDays: 5,
        },
        {
          tier: 'STANDARD',
          name: 'Wdrożenie',
          priceDeclared: 4800,
          scope: 'Odczyt faktur, akceptacja w dwóch krokach, eksport.',
          deliveryDays: 21,
        },
      ],
      imageFileIds: [],
    });
    if (publikuj) await api(lider, `/listings/${r.id}/publish`);
    return r;
  };
  const opublikowana = await usluga(`Wdrożę automatyzację obiegu faktur ${stamp}`, true);
  const szkic = await usluga(`Porządek w skrzynkach i uprawnieniach ${stamp}`, false);
  const zapytanie = idZ(
    await api(firma, `/listings/${opublikowana.id}/inquiries`, {
      companyId,
      packageTier: 'STANDARD',
      message: 'Dzień dobry, mamy około 120 faktur miesięcznie. Czy wdrożenie obejmuje eksport?',
    }),
  );
  await api(lider, `/inquiries/${zapytanie}/messages`, {
    body: 'Tak. Potrzebuję tylko przykładowego pliku, który program przyjmuje.',
  });

  const ekrany: Ekran[] = [
    { nazwa: 'zlecenie-nowe', url: '/zlecenia/nowe', h1: 'Nowe zlecenie', kto: firma },
    {
      nazwa: 'zlecenie-nowe-gosc',
      url: '/zlecenia/nowe',
      h1: 'Opisz, co ma powstać',
    },
    {
      nazwa: 'zlecenie-nowe-bez-firmy',
      url: '/zlecenia/nowe',
      h1: /./,
      kto: lider,
    },
    { nazwa: 'usluga-nowa', url: '/uslugi/nowa', h1: 'Nowa usługa', kto: lider },
    {
      nazwa: 'usluga-edycja-szkic',
      url: `/uslugi/${szkic.slug}/edytuj`,
      h1: 'Edytuj usługę',
      kto: lider,
    },
    {
      nazwa: 'usluga-edycja',
      url: `/uslugi/${opublikowana.slug}/edytuj`,
      h1: 'Edytuj usługę',
      kto: lider,
    },
    { nazwa: 'branza-zlecen', url: `/zlecenia/branza/${br.slug}`, h1: /^Zlecenia: / },
    { nazwa: 'branza-zlecen-pusty', url: `/zlecenia/branza/${pusta.slug}`, h1: /^Zlecenia: / },
    { nazwa: 'branza-uslug', url: `/uslugi/branza/${br.slug}`, h1: /^Usługi Liderów: / },
    { nazwa: 'oferta', url: `/oferty/${ofertaId}`, h1: 'Rozmowa o ofercie', kto: firma },
    {
      nazwa: 'oferta-wyslana',
      url: `/oferty/${ofertaId}?wyslana=1`,
      h1: 'Rozmowa o ofercie',
      kto: lider,
    },
    { nazwa: 'oferta-pusty', url: `/oferty/${pustaOferta}`, h1: 'Rozmowa o ofercie', kto: firma },
    { nazwa: 'zapytanie', url: `/zapytania/${zapytanie}`, h1: /^Zapytanie: /, kto: firma },
    { nazwa: 'zapytanie-lider', url: `/zapytania/${zapytanie}`, h1: /^Zapytanie: /, kto: lider },
    { nazwa: 'porownanie', url: '/porownanie/oferteo', h1: /^Oferteo a Leaders of Teams/ },
    { nazwa: 'firma', url: `/firmy/${companyId}`, h1: 'Meblarnia Dębowy Kąt', kto: lider },
    { nazwa: 'firma-nowa', url: '/firma/nowa', h1: 'Dodaj firmę', kto: lider },
    { nazwa: 'firma-nowa-gosc', url: '/firma/nowa', h1: /./ },
    { nazwa: 'dla-firm', url: '/dla-firm', h1: /Opisz, co ma powstać/ },
  ];
  // Gość nie może nosić ciasteczka z poprzedniego ekranu przy sprawdzeniu „bez flagi” — osobny kontekst niżej.
  for (const e of ekrany) await test.step(e.nazwa, () => sprawdz(e, gosc));

  const bezFlagi = await (await browser.newContext()).newPage();
  for (const url of ['/dla-firm', `/firmy/${companyId}`, '/porownanie/oferteo', '/zlecenia/nowe']) {
    await bezFlagi.goto(url);
    await expect(bezFlagi.locator('.v17'), url).toHaveCount(0);
  }
  // Nieistniejące adresy dają 404, nie 200 (mina loading.tsx nad segmentem dynamicznym).
  const flaga = await (await browser.newContext()).newPage();
  for (const url of ['/firmy/brak', '/porownanie/brak', '/zlecenia/branza/brak']) {
    const res = await flaga.goto(`${url}?wyglad=v17`);
    expect(res?.status(), url).toBe(404);
  }
});
