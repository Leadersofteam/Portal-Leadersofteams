#!/usr/bin/env node
/**
 * Zapadka tokenowa (P2, sesja 1) — pilnuje, żeby surowe kolory nie wracały do CSS.
 *
 * DLACZEGO: motyw jasny zmienia WYŁĄCZNIE tokeny. Każdy literał `rgb(...)` lub hex
 * poza blokami definicji tokenów to kolor, którego przełącznik motywu nie widzi —
 * czyli przyszły błąd wizualny w jednym z motywów. Wzorzec zapadki przyjęty za
 * repo App/Zodiamo (lint-tokens): licznik może tylko spadać.
 *
 * Zasady:
 *  - liczymy `rgb(`/`rgba(` bez `var(--` w tej samej linii oraz hexy kolorów,
 *  - POZA blokami `:root { ... }` i `[data-theme='...'] { ... }` (tam literały
 *    są definicjami tokenów — to ich jedyne legalne miejsce),
 *  - data-URI (ziarno szumu SVG) jest ignorowane w całości,
 *  - wynik > BASELINE → exit 1; wynik < BASELINE → przypomnienie o obniżeniu.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PLIKI = [
  join(ROOT, 'app/globals.css'),
  ...readdirSync(join(ROOT, 'app/styles'))
    .filter((f) => f.endsWith('.css'))
    .map((f) => join(ROOT, 'app/styles', f)),
];

// Po sweepie P2/S1 jedyne literały żyją w :root/[data-theme] — baseline to ZERO.
const BASELINE = 0;

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
// Literał = rgb()/rgba() z CYFRĄ zaraz po nawiasie; `rgb(var(--x-rgb) / a)` nie łapie się.
const RGB_LITERAL = /rgba?\(\s*\d/g;

let suma = 0;
const znaleziska = [];

for (const plik of PLIKI) {
  // Komentarze wycinamy PRZED analizą (przykłady w komentarzach — jak historia
  // przezroczystych przycisków — nie są kolorami w arkuszu).
  const zrodlo = readFileSync(plik, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m.replace(/[^\n]/g, ' '),
  );
  const linie = zrodlo.split('\n');
  let wewnatrzTokenow = false;
  let nawiasy = 0;

  for (let i = 0; i < linie.length; i++) {
    const linia = linie[i];

    if (!wewnatrzTokenow && /^\s*(:root|\[data-theme=)/.test(linia)) {
      wewnatrzTokenow = true;
      nawiasy = 0;
    }
    if (wewnatrzTokenow) {
      nawiasy += (linia.match(/{/g) ?? []).length - (linia.match(/}/g) ?? []).length;
      if (nawiasy <= 0 && /}/.test(linia)) wewnatrzTokenow = false;
      continue;
    }

    const bezDataUri = linia.replace(/url\("data:[^"]*"\)/g, '');
    const rgbLiteraly = bezDataUri.match(RGB_LITERAL) ?? [];
    const hexy = bezDataUri.match(HEX) ?? [];

    const trafienia = rgbLiteraly.length + hexy.length;
    if (trafienia > 0) {
      suma += trafienia;
      znaleziska.push(`${relative(ROOT, plik)}:${i + 1}: ${linia.trim().slice(0, 100)}`);
    }
  }
}

if (suma > BASELINE) {
  console.error(
    `lint-tokens: ${suma} surowych kolorów poza blokami tokenów (baseline ${BASELINE}):`,
  );
  for (const z of znaleziska) console.error('  ' + z);
  console.error('Użyj tokenów z :root (rgb(var(--x-rgb) / a), var(--on-accent), …).');
  process.exit(1);
}
if (suma < BASELINE) {
  console.log(
    `lint-tokens: ${suma} < baseline ${BASELINE} — obniż BASELINE w scripts/lint-tokens.mjs.`,
  );
}
console.log(`lint-tokens: OK (${suma}/${BASELINE}).`);
