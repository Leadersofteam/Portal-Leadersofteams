/**
 * Harness wyprawy — journey-testy Portalu na prawdziwych danych.
 *
 * Lustro harnessa z repo App (audyt/harness/harness.mjs): te same nazwy
 * funkcji (otworz / zaloguj / zrzut / raport / spis), żeby wiedza przenosiła
 * się między repozytoriami. Dołożone rzeczy specyficzne dla Portalu:
 * `zarejestruj()` przechodzi bramkę anty-bot (proof-of-work) po stronie
 * Node'a — dzięki temu zakładanie kont testowych nie zależy od
 * `crypto.subtle` przeglądarki (mina: działa tylko w secure context,
 * czyli NIGDY po IP kontenera — patrz docs/MINY.md).
 *
 * Konta wyprawy są PERSONAMI na żywej produkcji (decyzja właściciela
 * 22.08): zostają po sesji, a ich listę utrzymujemy w wyprawa/KONTA.md —
 * to jedyne miejsce, po którym odróżnia się je od realnych ludzi.
 */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, readdirSync } from 'node:fs';

// pnpm nie hoistuje playwright-core do apps/web/node_modules — rozwiązujemy
// przez pakiet @playwright/test, który apps/web ma zadeklarowany wprost.
const require = createRequire('/docker/portal-staging/apps/web/noop.js');
const { chromium } = require('@playwright/test');

export const BASE = process.env.WYPRAWA_BASE || 'https://leadersofteams.pl';
export const API = `${BASE}/api/v1`;
const STAN = '/tmp/wyprawa-stan';
mkdirSync(STAN, { recursive: true });

// Rejestr kont wyprawy. Hasła celowo w repo — to konta testowe-persony,
// ta sama konwencja co audyt/harness App. Pełny opis person: wyprawa/KONTA.md.
export const KONTA = {
  lider: {
    email: 'k.jaworowski@jaworowski-consulting.pl',
    haslo: 'Wyprawa2026!lider',
    nazwa: 'Konrad Jaworowski',
  },
  firma1: {
    email: 'biuro@kwiatkowscy-wnetrza.pl',
    haslo: 'Wyprawa2026!firma1',
    nazwa: 'Alicja Kwiatkowska',
  },
  firma2: {
    email: 'kontakt@stalmet-konstrukcje.pl',
    haslo: 'Wyprawa2026!firma2',
    nazwa: 'Tomasz Stalmach',
  },
  firma3: { email: 'hello@brandpoint.agency', haslo: 'Wyprawa2026!firma3', nazwa: 'Ewa Brandys' },
  pytajacy: {
    email: 'm.wisniowski@interim-managers.pl',
    haslo: 'Wyprawa2026!pytajacy',
    nazwa: 'Michał Wiśniowski',
  },
};

function chromiumPath() {
  const cacheDir = '/root/.cache/ms-playwright';
  // Sort NUMERYCZNY po wersji — leksykalny pęknie przy chromium-1300 vs 999.
  const dir = readdirSync(cacheDir)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]))
    .pop();
  return `${cacheDir}/${dir}/chrome-linux64/chrome`;
}

/** Otwiera przeglądarkę z sesją konta (jeśli była zapisana). */
export async function otworz({ konto, mobile = true } = {}) {
  const browser = await chromium.launch({ executablePath: chromiumPath() });
  const statePath = konto ? `${STAN}/state-${konto}.json` : undefined;
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: mobile ? 2 : 1,
    locale: 'pl-PL',
    ...(statePath && existsSync(statePath) ? { storageState: statePath } : {}),
  });
  const page = await context.newPage();
  const siec = [];
  const konsola = [];
  page.on('response', async (r) => {
    const u = r.url();
    if (!u.includes('/api/')) return;
    const wpis = { metoda: r.request().method(), sciezka: new URL(u).pathname, status: r.status() };
    if (r.status() >= 400) {
      try {
        wpis.tresc = (await r.text()).slice(0, 300);
      } catch {
        /* strumień */
      }
    }
    siec.push(wpis);
  });
  page.on('console', (m) => {
    if (m.type() === 'error') konsola.push(m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => konsola.push('pageerror: ' + e.message.slice(0, 300)));
  return { browser, context, page, siec, konsola, konto, statePath };
}

export async function czyZalogowany(page) {
  return page.evaluate(async (api) => {
    const r = await fetch(`${api}/auth/me`, { credentials: 'include' });
    if (r.status !== 200) return { status: r.status };
    const d = await r.json();
    return { status: 200, email: d.user?.email, nazwa: d.user?.displayName };
  }, API);
}

/** Logowanie formularzem (raz) + cache sesji w /tmp/wyprawa-stan. */
export async function zaloguj(s) {
  const k = KONTA[s.konto];
  if (!k) throw new Error(`Nieznane konto wyprawy: ${s.konto}`);
  await s.page.goto(`${BASE}/logowanie`, { waitUntil: 'load' });
  const kto = await czyZalogowany(s.page);
  if (kto.status === 200 && kto.email === k.email)
    return { zalogowany: true, sposob: 'sesja z pliku', kto };
  await s.page.goto(`${BASE}/logowanie`, { waitUntil: 'load' });
  await s.page.fill('input[type="email"]', k.email);
  await s.page.fill('input[type="password"]', k.haslo);
  await s.page.locator('form button[type="submit"]').first().click();
  await s.page.waitForTimeout(2500);
  const po = await czyZalogowany(s.page);
  if (po.status !== 200)
    throw new Error(`Logowanie ${k.email} nie powiodło się (auth/me=${po.status})`);
  if (s.statePath) await s.context.storageState({ path: s.statePath });
  return { zalogowany: true, sposob: 'formularz', kto: po };
}

/**
 * Rejestracja konta przez API z przejściem bramki anty-bot po stronie Node'a.
 * Protokół: GET /auth/challenge → znajdź n: sha256(salt+n)===target →
 * ODCZEKAJ ≥2,3 s licząc od ODEBRANIA odpowiedzi (serwer mierzy od utworzenia
 * wyzwania; liczenie od wysłania żądania gubi latencję i daje TOO_FAST) →
 * POST /auth/register z humancheck:{id,number}. Honeypot `nazwaFirmy`
 * zostawić NIEOBECNY. Zwraca cookie sesji — zapisujemy je do stanu konta.
 */
export async function zarejestruj(konto) {
  const k = KONTA[konto];
  if (!k) throw new Error(`Nieznane konto wyprawy: ${konto}`);
  const chRes = await fetch(`${API}/auth/challenge`);
  if (!chRes.ok) throw new Error(`challenge ${chRes.status}`);
  const odebrano = Date.now();
  const { challenge } = await chRes.json();
  let number = -1;
  for (let n = 0; n <= challenge.maxNumber; n += 1) {
    if (createHash('sha256').update(`${challenge.salt}${n}`).digest('hex') === challenge.target) {
      number = n;
      break;
    }
  }
  if (number < 0) throw new Error('nie znaleziono rozwiązania wyzwania');
  const zostalo = 2300 - (Date.now() - odebrano);
  if (zostalo > 0) await new Promise((r) => setTimeout(r, zostalo));
  const reg = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: k.email,
      password: k.haslo,
      displayName: k.nazwa,
      humancheck: { id: challenge.id, number },
    }),
  });
  const tresc = await reg.text();
  if (reg.status === 409) return { istnieje: true };
  if (reg.status !== 201) throw new Error(`register ${reg.status}: ${tresc.slice(0, 200)}`);
  return { utworzone: true, cookie: reg.headers.get('set-cookie') };
}

/** Wywołanie API w kontekście zalogowanej strony (cookie sesji idzie samo). */
export async function api(s, metoda, sciezka, body) {
  return s.page.evaluate(
    async ({ api, metoda, sciezka, body }) => {
      const r = await fetch(`${api}${sciezka}`, {
        method: metoda,
        credentials: 'include',
        headers: body ? { 'content-type': 'application/json' } : {},
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      let dane = null;
      try {
        dane = await r.json();
      } catch {
        /* pusta odpowiedź */
      }
      return { status: r.status, dane };
    },
    { api: API, metoda, sciezka, body },
  );
}

export async function zrzut(page, nazwa) {
  const sciezka = `/docker/portal-staging/wyprawa/zrzuty/${nazwa}.png`;
  await page.screenshot({ path: sciezka, fullPage: true });
  return sciezka;
}

/** Spis z natury: wszystkie widoczne elementy interaktywne — surowiec inwentarza. */
export async function spis(page) {
  return page.evaluate(() => {
    const els = [
      ...document.querySelectorAll('a[href], button, input, select, textarea, [role="button"]'),
    ];
    return els
      .filter((e) => e.offsetParent !== null)
      .map((e) => ({
        tag: e.tagName.toLowerCase(),
        typ: e.getAttribute('type') || undefined,
        tekst: (e.innerText || e.getAttribute('aria-label') || e.getAttribute('placeholder') || '')
          .trim()
          .slice(0, 60),
        href: e.getAttribute('href') || undefined,
        wylaczony: e.disabled || undefined,
      }))
      .filter((e) => e.tekst || e.href);
  });
}

/** Wypisuje sieć /api i błędy konsoli, po czym CZYŚCI bufory. */
export function raport(s, tytul = '') {
  console.log(`\n===== ${tytul} =====`);
  console.log(`URL: ${s.page.url()}`);
  console.log('--- SIEC (/api, tylko nie-200 i zapisy) ---');
  for (const w of s.siec) {
    if (w.status >= 400 || w.metoda !== 'GET') {
      console.log(`  ${w.metoda} ${w.sciezka} -> ${w.status}${w.tresc ? '  ' + w.tresc : ''}`);
    }
  }
  console.log('--- KONSOLA (errors) ---');
  for (const k of s.konsola) console.log('  ' + k);
  if (s.konsola.length === 0) console.log('  (brak)');
  s.siec.length = 0;
  s.konsola.length = 0;
}
