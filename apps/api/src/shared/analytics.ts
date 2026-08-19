// Analityka za 0 zł (ADR-009), bez cookies, bez skryptu zewnętrznego dostawcy
// i bez danych osobowych. Zliczamy WYŁĄCZNIE zagregowane odsłony ścieżek —
// polityka prywatności (/prywatnosc) obiecuje brak zewnętrznej analityki, więc
// nie wolno tu wprowadzić niczego, co identyfikuje osobę.
//
// ŚWIADOMIE NIE liczymy unikalnych użytkowników. Wymagałoby to haszowania
// IP+User-Agent, czyli rozmowy o danych osobowych; przy obecnej skali surowe
// odsłony odpowiadają na pytanie „czy ktokolwiek tu wszedł" tak samo dobrze.
//
// W Redisie trzymamy TYLKO to, czego nie ma w bazie. Rejestracje i publikacje
// liczy moduł analytics zapytaniem po `createdAt` — licznik byłby drugim,
// gorszym źródłem prawdy (ginie przy flushu, nie da się policzyć wstecz).
import type { Redis } from './redis';

const KEY_PREFIX = 'portal:analytics:v1:views:';
// 35 dni: pokrywa miesięczny przegląd z zapasem, a jednocześnie sprawia, że
// dane same znikają — brak archiwum to też forma minimalizacji danych.
const RETENTION_SECONDS = 35 * 24 * 60 * 60;

/** Klucz dobowy w UTC — spójny z `dayKey()` po stronie odczytu. */
export function viewsKey(day: string): string {
  return `${KEY_PREFIX}${day}`;
}

/** YYYY-MM-DD w UTC. UTC, nie czas lokalny, żeby zmiana czasu nie gubiła doby. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Biała lista prefiksów ścieżek. To NIE jest kosmetyka, tylko bariera pamięciowa:
// klucz dobowy jest hashem Redisa, więc każda niesprowadzona ścieżka to nowe pole.
// Bot skanujący /wp-admin, /.env i tysiąc innych adresów rozsadziłby go w jedną noc.
// Wszystko spoza listy ląduje w jednym wiadrze `/inne`.
//
// Segmenty dynamiczne zapisujemy jako `:id` — id treści to nie jest informacja
// potrzebna do odpowiedzi „gdzie ludzie odpadają", a bywa danymi o osobie
// (np. /profil/[handle]).
// ⚠️ Ta lista MUSI nadążać za `apps/web/app/**/page.tsx`. Do S18 nie nadążała
// o dwa sprinty i siedem istniejących stron (m.in. `/reset-hasla`, `/weryfikacja`,
// `/tematy/:id`) wpadało do `/inne` — czyli sygnał „ktoś zaczął odzyskiwać hasło"
// był niepoliczalny. Pilnuje tego teraz test strukturalny `shared/web-contract.test.ts`.
const KNOWN_PATHS = new Set([
  '/',
  '/drabinka',
  '/feed',
  '/firma/nowa',
  '/firmy/:id',
  '/grupy',
  '/grupy/nowa',
  '/grupy/:id',
  '/grupy/:id/post/:id',
  '/grupy/:id/pytania',
  '/liderzy',
  '/liderzy/:id',
  '/logowanie',
  '/nie-pamietam-hasla',
  '/offline',
  '/panel',
  '/panel/analityka',
  '/panel/konto',
  '/panel/moderacja',
  '/panel/oferty',
  '/panel/profil',
  '/panel/punkty',
  '/panel/ulubione',
  '/panel/uslugi',
  '/panel/uzytkownicy',
  '/panel/zapisane',
  '/panel/zlecenia',
  '/powiadomienia',
  '/profil/:id',
  '/prywatnosc',
  '/regulamin',
  '/rejestracja',
  '/reset-hasla',
  '/start',
  '/szukaj',
  '/tematy/:id',
  '/uslugi',
  '/uslugi/nowa',
  '/uslugi/:id',
  '/watki/:id',
  '/weryfikacja',
  '/wpisy/:id',
  '/wypis-digest',
  '/zapytania/:id',
  '/zlecenia',
  '/zlecenia/nowe',
  '/zlecenia/:id',
]);

export const OTHER_PATH = '/inne';

// Segmenty statyczne, które NIGDY nie są identyfikatorem — bez tej listy
// „/uslugi/nowa" zwinęłoby się do „/uslugi/:id" i zlało z kartą usługi,
// czyli formularz dodawania byłby nieodróżnialny od jej oglądania.
const STATIC_SEGMENTS = new Set(['nowa', 'nowe', 'pytania', 'post']);

// Rodzice, których NASTĘPNY segment jest zawsze identyfikatorem — nawet jeśli
// nie wygląda na identyfikator (S18). Heurystyka niżej rozpoznaje cuid, uuid,
// cyfry i długie ciągi, więc radzi sobie z `/zlecenia/<cuid>`, ale MILCZAŁA
// przy trzech realnych przypadkach:
//   • `/tematy/hr`      — temat to hashtag, bywa dwuznakowy,
//   • `/profil/macix`   — uchwyt to `displayName` przycięty do 24 znaków BEZ
//                         sufiksu (identity/service.ts), więc realny uchwyt jest
//                         zwykle KRÓTSZY niż próg 24; istniejący test przechodził
//                         wyłącznie dlatego, że użyto w nim 27-znakowej atrapy,
//   • `/uslugi/seo-audyt-a1b2c3` — slug to nazwa + 6 znaków hex, czyli często
//                         poniżej progu (listings/service.ts).
// Bez tej listy wszystkie trzy lądowały w `/inne`, czyli najczęściej odwiedzane
// strony treści były niepoliczalne. STATIC_SEGMENTS ma pierwszeństwo, więc
// `/uslugi/nowa` dalej jest formularzem, a nie kartą usługi.
const DYNAMIC_PARENTS = new Set(['profil', 'tematy', 'uslugi']);

function isIdentifierSegment(segment: string, parent: string | undefined): boolean {
  if (STATIC_SEGMENTS.has(segment)) return false;
  if (parent !== undefined && DYNAMIC_PARENTS.has(parent)) return true;
  // cuid (c…), uuid, ciąg cyfr, slug usługi z sufiksem id, @handle.
  return (
    /^c[a-z0-9]{20,}$/i.test(segment) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
    /^\d+$/.test(segment) ||
    segment.length > 24
  );
}

/**
 * Sprowadza URL do jednej z policzalnych ścieżek. Czysta funkcja — testowana
 * jednostkowo, bez infrastruktury (testy integracyjne bez DATABASE_URL zielenią
 * się przez POMINIĘCIE, więc logika krytyczna nie może zależeć tylko od nich).
 */
export function normalizePath(rawPath: string): string {
  const withoutQuery = rawPath.split('?')[0]?.split('#')[0] ?? '';
  if (!withoutQuery.startsWith('/')) return OTHER_PATH;

  const segments = withoutQuery.split('/').filter(Boolean);
  if (segments.length === 0) return '/';
  // Ochrona przed absurdalnie głębokimi adresami (skanery) zanim cokolwiek liczymy.
  if (segments.length > 6) return OTHER_PATH;

  // Rodzic liczy się WYŁĄCZNIE dla drugiego segmentu: `/uslugi/:id` to karta
  // usługi, ale gdyby kiedyś powstało `/grupy/:id/uslugi/cennik`, „uslugi"
  // w środku ścieżki nie może nagle zjeść kolejnego segmentu.
  const normalized = `/${segments
    .map((s, index) =>
      isIdentifierSegment(s, index === 1 ? segments[0]?.toLowerCase() : undefined)
        ? ':id'
        : s.toLowerCase(),
    )
    .join('/')}`;
  return KNOWN_PATHS.has(normalized) ? normalized : OTHER_PATH;
}

/** Inkrementuje licznik odsłony. Cichy przy błędzie — licznik nie jest funkcją. */
export async function recordView(redis: Redis, rawPath: string, now = new Date()): Promise<string> {
  const path = normalizePath(rawPath);
  const key = viewsKey(dayKey(now));
  // EXPIRE przy każdym zapisie zamiast tylko przy pierwszym: jedna dodatkowa
  // komenda w pipeline jest tańsza niż ryzyko klucza bez TTL po awarii.
  await redis.pipeline().hincrby(key, path, 1).expire(key, RETENTION_SECONDS).exec();
  return path;
}

/** Odczyt odsłon dla jednej doby: ścieżka → liczba. */
export async function readViews(redis: Redis, day: string): Promise<Record<string, number>> {
  const raw = await redis.hgetall(viewsKey(day));
  const out: Record<string, number> = {};
  for (const [path, count] of Object.entries(raw)) {
    const n = Number.parseInt(count, 10);
    if (Number.isFinite(n)) out[path] = n;
  }
  return out;
}
