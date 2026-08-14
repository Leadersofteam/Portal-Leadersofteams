/**
 * Generator ikon PWA z naszego znaku marki (ADR-009: zero zewnętrznych narzędzi).
 *
 * Uruchamiany RĘCZNIE, wynik jest commitowany:
 *   node apps/web/scripts/gen-icons.mjs
 *
 * Dlaczego nie w buildzie: ikony zmieniają się raz na rok, a sharp w obrazie
 * webu byłby zależnością runtime na nic. Plik jest tu, żeby następna osoba
 * wiedziała, skąd te PNG-i się wzięły i jak je odtworzyć.
 *
 * Wariant maskable ma znak w bezpiecznej strefie (60 % kadru) — Android
 * przycina ikonę do dowolnego kształtu i bez tego marginesu zjadłby szczeble.
 */
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// sharp jest zależnością apps/api (uploady obrazów), nie webu — nie dokładamy
// go do package.json frontu tylko po to, żeby raz na rok przerysować ikony.
const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [join(HERE, '..', '..', 'api')] }));

const OUT_DIR = join(HERE, '..', 'public', 'icons');

/** Znak marki: drabinka w gradientowym kwadracie, najwyższy szczebel bursztynowy. */
function markSvg({ size, inset, radius }) {
  const scale = size / 32;
  const inner = size - inset * 2;
  const s = inner / 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#6366f1"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius * scale}" fill="url(#g)"/>
  <g transform="translate(${inset} ${inset})">
    <rect x="${8 * s}" y="${7.5 * s}" width="${16 * s}" height="${3.2 * s}" rx="${1.6 * s}" fill="#fbbf24"/>
    <rect x="${8 * s}" y="${14.4 * s}" width="${16 * s}" height="${3.2 * s}" rx="${1.6 * s}" fill="#ffffff" fill-opacity="0.85"/>
    <rect x="${8 * s}" y="${21.3 * s}" width="${16 * s}" height="${3.2 * s}" rx="${1.6 * s}" fill="#ffffff" fill-opacity="0.5"/>
  </g>
</svg>`;
}

const TARGETS = [
  { file: 'icon-192.png', size: 192, inset: 0, radius: 8 },
  { file: 'icon-512.png', size: 512, inset: 0, radius: 8 },
  // maskable: znak na 60 % kadru, tło wypełnia całość (radius 0 — maska i tak przytnie).
  { file: 'icon-maskable-512.png', size: 512, inset: 102, radius: 0 },
  { file: 'apple-touch-icon-180.png', size: 180, inset: 0, radius: 8 },
];

await mkdir(OUT_DIR, { recursive: true });

for (const target of TARGETS) {
  const svg = markSvg(target);
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(join(OUT_DIR, target.file), png);
  console.log(`✓ ${target.file} (${png.length} B)`);
}
