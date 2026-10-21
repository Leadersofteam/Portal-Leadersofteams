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

/**
 * Znak marki: drabina w gradientowym kwadracie, najwyższy szczebel bursztynowy.
 * Te same liczby co `components/ui/logo.tsx` (siatka 32) — tu skalowane do rozmiaru
 * pliku. Poręcze zbiegają się ku górze, bursztynowy szczebel wystaje poza nie.
 */
function markSvg({ size, inset, radius }) {
  const scale = size / 32;
  const inner = size - inset * 2;
  const s = inner / 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="${size}" x2="${size}" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="#5b21b6"/>
      <stop offset="1" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius * scale}" fill="url(#g)"/>
  <g transform="translate(${inset} ${inset}) scale(${s})">
    <path d="M9.2 26.5 11.4 5.5h1.9l-1.9 21z" fill="#fff"/>
    <path d="M22.8 26.5 20.6 5.5h-1.9l1.9 21z" fill="#fff"/>
    <rect x="9.78" y="19.7" width="12.45" height="2.6" fill="#fff"/>
    <rect x="10.4" y="13.7" width="11.19" height="2.6" fill="#fff"/>
    <rect x="9.43" y="7.7" width="13.13" height="2.6" fill="#fbbf24"/>
  </g>
</svg>`;
}

const TARGETS = [
  { file: 'icon-192.png', size: 192, inset: 0, radius: 7 },
  { file: 'icon-512.png', size: 512, inset: 0, radius: 7 },
  // maskable: znak na 60 % kadru, tło wypełnia całość (radius 0 — maska i tak przytnie).
  { file: 'icon-maskable-512.png', size: 512, inset: 102, radius: 0 },
  { file: 'apple-touch-icon-180.png', size: 180, inset: 0, radius: 7 },
];

await mkdir(OUT_DIR, { recursive: true });

for (const target of TARGETS) {
  const svg = markSvg(target);
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(join(OUT_DIR, target.file), png);
  console.log(`✓ ${target.file} (${png.length} B)`);
}
