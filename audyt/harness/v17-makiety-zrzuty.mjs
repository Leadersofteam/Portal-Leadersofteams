// Zrzuty makiet V17 PRO Portalu z lokalnego pliku (bez serwera, bez logowania) — 1512 + 390 × jasny + ciemny. Kopia narzędzia z LoT App.
// Użycie: node audyt/harness/v17-makiety-zrzuty.mjs <plik.html> <nazwa> [stan…] [--out katalog] [--pelna] [--cel 56] [--duzy|--tylko-duzy]
//   stan = wartość ?stan= w makiecie (np. pusty, ladowanie, blad, jak-poszlo); bez stanów = widok domyślny.
// Wynik: <out>/v17-<nazwa>[-<stan>]-<jasny|ciemny>-<1512|390>.png (+ -390-ekran.png = tylko pierwszy ekran telefonu)
// oraz raport: scrollWidth na 390 (musi = 390) i liczba celów dotyku < 44 px w widocznych przyciskach/linkach.
// Math.random jest zasiany → siatka liderów jest powtarzalna (porównanie przed/po bajt w bajt).
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire('/docker/portal-staging/apps/web/package.json');
const { chromium } = require('@playwright/test');
// Chromium z cache Playwrighta (portal-zrzuty: katalog to chrome-linux64, NIE chrome-linux).
const cache = '/root/.cache/ms-playwright';
const chDir = fs
  .readdirSync(cache)
  .filter((d) => d.startsWith('chromium-'))
  .sort()
  .pop();
const executablePath = path.join(cache, chDir, 'chrome-linux64', 'chrome');

const args = process.argv.slice(2);
const opt = (n) => {
  const i = args.indexOf(n);
  if (i < 0) return null;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const out =
  opt('--out') ?? path.resolve(path.dirname(new URL(import.meta.url).pathname), '../zrzuty');
const CEL = +(opt('--cel') ?? 44); // ekipa budowy: --cel 56
const pelna = args.includes('--pelna');
if (pelna) args.splice(args.indexOf('--pelna'), 1);
// --duzy (alias --ultra): dodatkowo 3440×1440 w jasnym (Maciej 26.11: „też większych ekranach”). --tylko-duzy: sam 3440.
const tylkoDuzy = args.includes('--tylko-duzy');
if (tylkoDuzy) args.splice(args.indexOf('--tylko-duzy'), 1);
const flagaDuzy = args.find((x) => x === '--duzy' || x === '--ultra');
const duzy = Boolean(flagaDuzy);
if (flagaDuzy) args.splice(args.indexOf(flagaDuzy), 1);
const [plik, nazwa, ...stany] = args;
if (!plik || !nazwa) {
  console.error('użycie: <plik.html> <nazwa> [stan…]');
  process.exit(2);
}
fs.mkdirSync(out, { recursive: true });
const url0 = 'file://' + path.resolve(plik);
const SEED = `(()=>{let s=17;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})()`;

const b = await chromium.launch({ headless: true, executablePath });
const raport = [];
for (const stan of stany.length ? stany : ['']) {
  for (const motyw of ['jasny', 'ciemny']) {
    const ekrany = tylkoDuzy
      ? []
      : [
          [1512, 982, 1],
          [390, 844, 2],
        ];
    if ((duzy || tylkoDuzy) && motyw === 'jasny') ekrany.push([3440, 1440, 1]);
    for (const [w, h, dsf] of ekrany) {
      const ctx = await b.newContext({
        viewport: { width: w, height: h },
        deviceScaleFactor: dsf,
        reducedMotion: 'reduce',
        hasTouch: w < 500,
        isMobile: w < 500,
      });
      await ctx.addInitScript(SEED);
      const p = await ctx.newPage();
      const bledy = [];
      p.on('pageerror', (e) => bledy.push(e.message));
      const qs = new URLSearchParams({ motyw: motyw === 'ciemny' ? 'dark' : 'light' });
      if (stan) qs.set('stan', stan);
      await p.goto(`${url0}?${qs}`, { waitUntil: 'load' });
      await p.evaluate(() => document.fonts.ready);
      const full0 = w < 500 || pelna;
      await p.addStyleTag({ content: '.stany,.motyw{display:none!important}' });
      await p.waitForTimeout(700);
      const baza = `v17-${nazwa}${stan ? '-' + stan : ''}-${motyw}-${w}`;
      const full = w < 500 || pelna;
      // pierwszy ekran PRZED unieruchomieniem paska — inaczej dolny pasek znika ze zrzutu „-ekran”
      if (w < 500 || w > 3000) await p.screenshot({ path: path.join(out, baza + '-ekran.png') });
      if (full0) {
        await p.addStyleTag({ content: '.dolny,.fab{position:static!important}' });
        await p.waitForTimeout(100);
      }
      await p.screenshot({ path: path.join(out, baza + '.png'), fullPage: full });
      const m = await p.evaluate((CEL) => {
        const male = [
          ...document.querySelectorAll('button,a,[role=button],input,select,.pill[onclick],.lnk'),
        ]
          .filter((e) => {
            const r = e.getBoundingClientRect();
            const s = getComputedStyle(e);
            if (
              !r.width ||
              s.visibility === 'hidden' ||
              s.display === 'none' ||
              e.closest('.nav,.stany,.motyw')
            )
              return false;
            const po = getComputedStyle(e, '::after');
            const hAft =
              po.content !== 'none' && po.position === 'absolute' ? parseFloat(po.height) || 0 : 0; // niewidoczne powiększenie celu
            return (
              Math.min(r.width + (hAft ? 12 : 0), Math.max(r.height, hAft)) < CEL &&
              !e.closest('[data-cel-ok]')
            );
          })
          .map((e) =>
            (e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 24),
          );
        return { sw: document.documentElement.scrollWidth, male };
      }, CEL);
      raport.push(
        `${baza}: scrollWidth=${m.sw}${m.sw > w ? ' ✗ ROZLANIE' : ''}${w < 500 ? ` · cele<${CEL}: ${m.male.length}${m.male.length ? ' [' + m.male.slice(0, 6).join(' | ') + ']' : ''}` : ''}${bledy.length ? ' · BŁĘDY JS: ' + bledy.join('; ') : ''}`,
      );
      await ctx.close();
    }
  }
}
await b.close();
console.log(raport.join('\n'));
