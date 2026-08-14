// STRAŻNIK KONTRAKTU web ↔ API (S18).
//
// Powód istnienia tego pliku jest jeden i bardzo konkretny: mina „trasa API bez
// wejścia w interfejsie" wystąpiła w tym repo TRZY RAZY.
//   1. `POST /groups` — pełna bramka i testy od Sprintu 4, przez CZTERY sprinty
//      ani jednego linku; grupę dało się założyć wyłącznie curl-em, więc na
//      produkcji były same grupy systemowe, bez założyciela i bez moderatora.
//   2. `GET /me/export` i `DELETE /me` — obowiązek prawny (RODO, R-10) żyjący
//      wyłącznie w backendzie, przy polityce prywatności twierdzącej, że
//      „w panelu konta możesz pobrać komplet swoich danych".
//   3. `GET /me/favorites` — gwiazdka w katalogu usług działała, ale ulubionych
//      nie dało się nigdzie zobaczyć.
// Wspólna cecha: WSZYSTKIE testy backendu były zielone. Nikt nie dostawał 404,
// więc nic nie krzyczało. Ten test krzyczy.
//
// Testy są STRUKTURALNE i czytają pliki `apps/web` przez `fs`, bez importów —
// granice modułów (ADR-002) zostają nietknięte, bo to nie jest zależność kodu,
// tylko odczyt repozytorium. Świadomie BEZ infrastruktury: suity integracyjne
// bez DATABASE_URL zielenią się przez POMINIĘCIE, a strażnik miny musi wykonać
// się zawsze.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import { normalizePath, OTHER_PATH } from './analytics';

const REPO_ROOT = resolve(import.meta.dirname, '../../../..');
const API_MODULES_DIR = join(REPO_ROOT, 'apps/api/src/modules');
const WEB_DIR = join(REPO_ROOT, 'apps/web');

const IGNORED_DIRS = new Set(['node_modules', '.next', 'test-results', 'playwright-report']);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// --- Trasy API ---------------------------------------------------------------

// Obsługuje trzy realne kształty rejestracji w tym repo:
//   app.get('/x', …)
//   app.put<{ Params: { id: string } }>('/x/:id', …)
//   app.post(            ← argument w kolejnej linii
//     '/x',
// oraz szablon z pętli: app.post(`/listings/:id/${action}`, …)
const ROUTE_RE = /app\.(get|post|put|patch|delete)\s*(?:<[^(]*>)?\s*\(\s*(['"`])([^'"`]+)\2/g;

interface ApiRoute {
  method: string;
  path: string;
  file: string;
}

function collectApiRoutes(): ApiRoute[] {
  const routes: ApiRoute[] = [];
  for (const file of walk(API_MODULES_DIR).filter((f) => f.endsWith('routes.ts'))) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(ROUTE_RE)) {
      routes.push({
        method: match[1]!.toUpperCase(),
        path: match[3]!,
        file: file.slice(REPO_ROOT.length + 1),
      });
    }
  }
  return routes;
}

/** `/orders/:id/offers` i `/listings/:id/${action}` → ten sam kształt co z webu. */
function normalizeApiPath(path: string): string {
  return path
    .replace(/\$\{[^}]*\}/g, ':x')
    .replace(/:[A-Za-z_][A-Za-z0-9_]*/g, ':x')
    .replace(/\/+$/, '');
}

// --- Ścieżki wołane z webu ---------------------------------------------------

// Zbieramy WSZYSTKIE literały zaczynające się od `/`, a nie tylko argumenty
// `apiFetch`/`serverApi`. Powód jest sprawdzony w kodzie, nie teoretyczny:
// `app/zlecenia/[id]/page.tsx` podaje ścieżkę PROPSEM (`<ActionButton path={…}>`),
// więc szukanie po nazwie funkcji przegapiłoby cały cykl życia zlecenia —
// osiem tras, które w interfejsie są klikalnymi przyciskami.
const STRING_LITERAL_RE = /(['"`])(\/[^'"`\n]*)\1/g;

function collectWebPaths(): Set<string> {
  const paths = new Set<string>();
  for (const file of walk(WEB_DIR).filter((f) => /\.(ts|tsx)$/.test(f))) {
    // Testy e2e nie są interfejsem. Trasa, do której dociera wyłącznie test,
    // to nadal trasa, do której użytkownik nie ma jak dojść.
    if (file.includes(`${sep}e2e${sep}`)) continue;
    for (const match of readFileSync(file, 'utf8').matchAll(STRING_LITERAL_RE)) {
      const raw = match[2]!;
      const normalized = raw
        .split('?')[0]!
        .split('#')[0]!
        .replace(/\$\{[^}]*\}/g, ':x')
        // Zagnieżdżony szablon (`/me/bookmarks${cursor ? `?cursor=…` : ''}`)
        // urywa literał w środku wstawki — bierzemy stały prefiks, bo to on
        // jest ścieżką. Bez tego strażnik zgłaszałby fałszywy alarm.
        .replace(/\$\{.*$/, '')
        // Obrazy i pliki idą prosto w `<img src="/api/v1/files/…">`, bez klienta.
        .replace(/^\/api\/v1/, '')
        .replace(/\/+$/, '');
      if (normalized.startsWith('/')) paths.add(normalized);
    }
  }
  return paths;
}

// --- Jawna lista wyjątków ----------------------------------------------------
//
// Każdy wpis MUSI mieć uzasadnienie. Test pilnuje też, żeby lista nie zgniła:
// wyjątek wskazujący na nieistniejącą trasę czerwieni suitę.
const EXCEPTIONS = new Map<string, string>([
  [
    'POST /analytics/hit',
    'Woła middleware Next surowym fetch-em pod `${apiUrl}/api/v1/analytics/hit` — ' +
      'nie przez apiFetch i nie literałem zaczynającym się od `/`.',
  ],
  [
    'PATCH /listings/:x',
    'ZASTANY BRAK (znaleziony przez ten strażnik 2026-08-15): opublikowanej usługi ' +
      'NIE DA SIĘ w Portalu edytować — panel ma tylko publikuj/wstrzymaj/archiwizuj. ' +
      'Świadomie nieuzupełnione w S18 (sprint higieniczny, zero nowych funkcji); ' +
      'edycja usługi jest dopisana do S21 w docs/SPRINTY-S18-S21.md.',
  ],
]);

describe('każda trasa API ma wejście w interfejsie', () => {
  const routes = collectApiRoutes();
  const webPaths = collectWebPaths();

  it('ekstraktor w ogóle coś znalazł', () => {
    // Bezpiecznik przeciw „zielony przez pominięcie": zepsuty regex znalazłby
    // zero tras i cała suita zaświeciłaby się na zielono, nie sprawdzając nic.
    expect(routes.length).toBeGreaterThan(100);
    expect(webPaths.size).toBeGreaterThan(50);
  });

  it('nie ma martwych wyjątków', () => {
    const known = new Set(routes.map((r) => `${r.method} ${normalizeApiPath(r.path)}`));
    const dead = [...EXCEPTIONS.keys()].filter((key) => !known.has(key));
    expect(dead, 'wyjątek wskazuje na trasę, która już nie istnieje — usuń go').toEqual([]);
  });

  // Dopasowanie SEGMENTOWE, nie po całym łańcuchu: `:x` w trasie zastępuje
  // dowolny jeden segment, ale literały muszą się zgadzać. Bez tego
  // `GET /files/:id/:variant` wyglądałby na martwy, choć web woła go
  // z konkretnym wariantem (`/api/v1/files/…/thumb`).
  function hasEntryInUi(routePath: string): boolean {
    const routeSegments = routePath.split('/');
    for (const candidate of webPaths) {
      const segments = candidate.split('/');
      if (segments.length !== routeSegments.length) continue;
      if (routeSegments.every((seg, i) => seg === ':x' || seg === segments[i])) return true;
    }
    return false;
  }

  it('żadna trasa nie jest osiągalna wyłącznie curl-em', () => {
    const missing = routes
      .map((route) => ({ ...route, normalized: normalizeApiPath(route.path) }))
      .filter((route) => !hasEntryInUi(route.normalized))
      .filter((route) => !EXCEPTIONS.has(`${route.method} ${route.normalized}`))
      .map((route) => `${route.method} ${route.path}  (${route.file})`);

    expect(
      missing,
      'Trasa API bez wejścia w UI to funkcja, której nie ma. Dodaj wejście ' +
        'w apps/web ALBO dopisz trasę do EXCEPTIONS z uzasadnieniem.',
    ).toEqual([]);
  });
});

describe('analityka nadąża za stronami', () => {
  // Biała lista `KNOWN_PATHS` była za kodem o dwa sprinty: siedem istniejących
  // stron wpadało do wiadra `/inne`, w tym `/reset-hasla` — czyli dokładnie ten
  // sygnał, którego szukamy przy pierwszej mili.
  const pages = walk(join(WEB_DIR, 'app'))
    .filter((f) => f.endsWith(`${sep}page.tsx`))
    .map((f) => f.slice(join(WEB_DIR, 'app').length + 1, -'/page.tsx'.length))
    .map((route) => (route === 'page.tsx' ? '/' : `/${route}`));

  it('znaleziono strony', () => {
    expect(pages.length).toBeGreaterThan(30);
  });

  it('każda strona jest policzalna (nie wpada do /inne)', () => {
    // Segmenty dynamiczne podstawiamy cuidem — dokładnie tym, co generuje Prisma.
    const uncounted = pages
      .map((page) => page.replace(/\[[^\]]+\]/g, 'clh3k2j9x0000abcdefghijkl'))
      .filter((url) => normalizePath(url) === OTHER_PATH && url !== '/');

    expect(
      uncounted,
      'Strona spoza białej listy w shared/analytics.ts jest liczona jako `/inne`.',
    ).toEqual([]);
  });
});

describe('sonda zdrowia nie jest liczona jako odsłona', () => {
  // 14.08 na produkcji `/` miało 3926 „odsłon" na dobę, a każda inna strona 2–3:
  // healthcheck kontenera `web` uderzał w `/` co 15 s, a filtr botów go nie
  // odsiewał, bo `fetch` z Node przedstawia się jako `node`, nie jako crawler.
  const source = readFileSync(join(WEB_DIR, 'middleware.ts'), 'utf8');
  const raw = /matcher:\s*\[\s*'([^']*)'/.exec(source)?.[1];

  it('matcher middleware daje się odczytać', () => {
    expect(raw, 'nie znalazłem `matcher` w apps/web/middleware.ts').toBeTruthy();
  });

  // W pliku źródłowym backslashe są podwojone (to literał TS) — przed
  // zbudowaniem wyrażenia trzeba je sprowadzić do jednego.
  const matcher = new RegExp(`^${(raw ?? '').replace(/\\\\/g, '\\')}$`);

  it('NIE łapie /healthz', () => {
    expect(matcher.test('/healthz')).toBe(false);
  });

  it('nadal łapie zwykłe strony', () => {
    expect(matcher.test('/')).toBe(true);
    expect(matcher.test('/uslugi')).toBe(true);
    expect(matcher.test('/panel/konto')).toBe(true);
  });
});
