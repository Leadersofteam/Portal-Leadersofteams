#!/usr/bin/env node
/**
 * Film klatek sceny 3D — jedyny sposób, żeby ZOBACZYĆ przejście, a nie zgadywać.
 *
 * Przewija stronę co `krok` pikseli od kotwicy i robi zrzut po każdym kroku,
 * po czym składa arkusz z podpisem przesunięcia. Na arkuszu widać, czy kształt
 * STOI przy swoim tekście (spec.hold) i czy przelewa się w przerwie.
 *
 *   node .claude/skills/lot-scena-3d/film.mjs <url> <prefiks> [szer] [wys] [od] [do] [krok]
 *   ANCHOR='#loop' node … film.mjs http://127.0.0.1:5180/ /tmp/film 1512 900 0 1650 150
 *   REDUCE=1 …   # to samo przy prefers-reduced-motion: reduce
 *   NATURAL=1 …  # bez wymuszenia — tak, jak zobaczy to bramka i użytkownik
 *
 * Domyślnie WYMUSZA kontekst WebGL (zdejmuje failIfMajorPerformanceCaveat),
 * żeby zrzut pokazał scenę także na maszynie bez GPU. Uwaga: pomiar z 2026-10-20
 * pokazał, że headless Chromium z SwiftShaderem i tak NIE odmawia — wymuszenie
 * jest zabezpieczeniem na inne wersje przeglądarki, nie obejściem bramki.
 *
 * Arkusz składa Python + Pillow (jest w kontenerach sesji); bez nich zostają
 * pojedyncze klatki `<prefiks>-NN.png`.
 */
/* global process, console, document, window, scrollY, HTMLCanvasElement */
// Globale zadeklarowane jawnie: Portal lintuje też `.claude/`, a kod w `evaluate`
// i `addInitScript` biegnie w przeglądarce, nie w Node.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

// Playwright szukany od BIEŻĄCEGO katalogu, nie od pliku: w pnpm (Portal) pakiet leży
// w `apps/web/node_modules`, a w npm (.com, App) w korzeniu. Uruchamiaj z katalogu
// pakietu, który ma Playwrighta w zależnościach.
const req = createRequire(path.join(process.cwd(), 'package.json'));
const load = (name) => {
  try {
    return req(name);
  } catch {
    return null;
  }
};
const pw = load('playwright') ?? load('@playwright/test');
if (!pw) {
  console.error(
    'Brak playwright ani @playwright/test w ' + process.cwd() + ' — uruchom z katalogu pakietu.',
  );
  process.exit(2);
}
const { chromium } = pw;

const [url, out, w = '1440', h = '900', from = '0', to = '1800', step = '150'] =
  process.argv.slice(2);
if (!url || !out) {
  console.error('użycie: film.mjs <url> <prefiks> [szer] [wys] [od] [do] [krok]');
  process.exit(2);
}
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const ctx = await browser.newContext({
  viewport: { width: +w, height: +h },
  reducedMotion: process.env.REDUCE ? 'reduce' : 'no-preference',
});
if (!process.env.NATURAL) {
  await ctx.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
      if (attrs && attrs.failIfMajorPerformanceCaveat)
        attrs = { ...attrs, failIfMajorPerformanceCaveat: false };
      return orig.call(this, type, attrs);
    };
  });
}
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500); // wejście sceny trwa 1,7 s
const base = process.env.ANCHOR
  ? await page.evaluate(
      (s) => document.querySelector(s).getBoundingClientRect().top + scrollY,
      process.env.ANCHOR,
    )
  : 0;
const frames = [];
for (let y = +from, n = 0; y <= +to; y += +step, n++) {
  await page.evaluate((v) => window.scrollTo(0, v), base + y);
  await page.waitForTimeout(900); // lerp sceny dojeżdża w ~0,5 s
  const file = `${out}-${String(n).padStart(2, '0')}.png`;
  await page.screenshot({ path: file });
  frames.push([file, y]);
}
await browser.close();
console.log(
  `klatki: ${frames.length}`,
  errors.length ? `\nbłędy konsoli:\n  ${errors.slice(0, 5).join('\n  ')}` : '· konsola czysta',
);
try {
  execFileSync(
    'python3',
    [
      '-c',
      `
import sys, json
from PIL import Image, ImageDraw
fr = json.loads(sys.argv[1]); out = sys.argv[2]
ims = [Image.open(f) for f, _ in fr]
W, H = ims[0].size; s = 480 / W; tw, th = int(W*s), int(H*s)
cols = 3; rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (tw*cols, th*rows))
for i, (im, (_, y)) in enumerate(zip(ims, fr)):
    t = im.resize((tw, th)); ImageDraw.Draw(t).text((8, 8), '+%dpx' % y, fill=(255, 255, 0))
    sheet.paste(t, ((i % cols)*tw, (i // cols)*th))
sheet.save(out + '-arkusz.png'); print('arkusz:', out + '-arkusz.png')
`,
      JSON.stringify(frames),
      out,
    ],
    { stdio: 'inherit' },
  );
} catch {
  console.log('(bez arkusza — brak python3/Pillow)');
}
