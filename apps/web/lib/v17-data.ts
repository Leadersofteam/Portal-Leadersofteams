// Dane ekranów V17 „Światło” z PRAWDZIWEGO API (zero fixtur). Strumień składamy po stronie serwera
// z feedu społeczności (wpisy, awanse) i publicznych list (zlecenia, pytania, realizacje, usługi),
// i sortujemy chronologicznie (ADR-010: bez rankingu, bez algorytmu).
// Czego API nie niesie (miasto i termin zlecenia, termin zbierania ofert, awatary oferentów,
// liczba powiadomień), tego NIE zmyślamy — komponenty pomijają pole albo pokazują stan pusty.
import type { QuotedPostView } from '@/components/quoted-post';
import type { LevelRule } from '@/lib/levels';
import { serverApi } from '@/lib/server-api';

export interface Aktor {
  name: string;
  handle: string | null;
  level: number;
  avatarFileId: string | null;
}

export type Wpis =
  | {
      k: 'wpis';
      /** Id wpisu portalowego (adres /wpisy/[id] i akcje). */
      id: string;
      at: string;
      autor: Aktor;
      branza: string | null;
      tresc: string;
      zdjecia: string[];
      cytat: QuotedPostView | null;
      komentarze: number;
      doceniony: boolean;
      zapisany: boolean;
    }
  | {
      k: 'awans';
      id: string;
      at: string;
      lider: Aktor;
      branza: string | null;
      /** Szczebel, NA KTÓRY awans nastąpił (nie bieżący autora). */
      szczebel: number;
    }
  | {
      k: 'zlecenie';
      id: string;
      at: string;
      firma: string;
      branza: string;
      zweryfikowana: boolean;
      tytul: string;
      budzetMin: number;
      budzetMax: number;
      minLevel: number;
      oferty: number;
    }
  | {
      k: 'pytanie';
      id: string;
      at: string;
      autor: string;
      grupa: string;
      tytul: string;
      odpowiedzi: number;
      uznana: boolean;
    }
  | {
      k: 'realizacja';
      id: string;
      at: string;
      lider: Aktor;
      firma: string;
      branza: { name: string; slug: string };
      tytul: string;
      ocena: number;
      pkt: number | null;
      waga: number | null;
      dojrzewa: string | null;
    }
  | {
      k: 'usluga';
      id: string;
      at: string;
      lider: Aktor;
      slug: string;
      tytul: string;
      cenaOd: number;
      branza: string;
      ocena: number | null;
      ocen: number;
    };

interface OrderRow {
  id: string;
  title: string;
  industry: { id: string; name: string; slug: string };
  budgetMin: number;
  budgetMax: number;
  minLevel: number;
  publishedAt: string;
  companyName: string;
  companyVerified?: boolean;
  offersCount?: number;
}
interface ThreadRow {
  id: string;
  title: string;
  groupName: string;
  authorName: string;
  answersCount: number;
  hasAcceptedAnswer: boolean;
  createdAt: string;
}
interface RealRow {
  id: string;
  rating: number;
  points: number | null;
  weight: number | null;
  maturesAt: string | null;
  publishedAt: string;
  orderTitle: string;
  industry: { name: string; slug: string };
  company: { name: string };
  leader: {
    displayName: string;
    handle: string | null;
    avatarFileId: string | null;
    level: number;
  };
}
interface ListingRow {
  id: string;
  slug: string;
  title: string;
  priceFrom: number;
  publishedAt?: string | null;
  createdAt?: string;
  industry: { id: string; name: string };
  leader: {
    displayName: string;
    avatarFileId: string | null;
    level: number;
    averageRating: number | null;
    reviewCount: number;
  };
}

export type Filtr =
  'wszystko' | 'wpisy' | 'moja' | 'zlecenia' | 'pytania' | 'realizacje' | 'uslugi';
export const FILTRY: Array<[Filtr, string]> = [
  ['wszystko', 'Wszystko'],
  ['wpisy', 'Wpisy'],
  ['moja', 'Moja branża'],
  ['zlecenia', 'Zlecenia'],
  ['pytania', 'Pytania'],
  ['realizacje', 'Realizacje'],
  ['uslugi', 'Usługi'],
];

/** „Cała społeczność” / „Obserwowani”. */
export type Zakres = 'wszyscy' | 'obserwowani';

export interface FeedRow {
  id: string;
  type: string;
  subjectId: string;
  meta: Record<string, unknown>;
  createdAt: string;
  post?: {
    body: string;
    imageFileIds: string[];
    quoted: QuotedPostView | null;
    comments: number;
    viewerAppreciated: boolean;
    viewerBookmarked: boolean;
  };
  actor: {
    id: string;
    displayName: string;
    handle: string | null;
    avatarFileId: string | null;
    level: number;
    industry?: string | null;
  };
}

export interface Strumien {
  wpisy: Wpis[];
  /** Ile wpisów jest już w oknie pobranych źródeł (M w „N z M”). */
  razem: number;
  /** true, gdy któreś źródło ma jeszcze coś ponad okno — wtedy M jest dolnym ograniczeniem. */
  mozeWiecej: boolean;
  /** Któreś źródło nie odpowiedziało — ekran pokazuje to, a nie udaje, że strumień jest pusty. */
  zrodelBledow: number;
}

interface Okno<T> {
  rows: T[];
  wiecej: boolean;
  blad: boolean;
}

const pusteOkno = { rows: [], wiecej: false, blad: false };

// Źródło czytamy stronami po kursorze, aż uzbieramy `win` PASUJĄCYCH wierszy. Samo `limit=50`
// zatrzymywało „Pokaż więcej” na 50 (przycisk martwy), a filtr po stronie web (branża) zostawiał dziury
// w chronologii. Limit stron to bezpiecznik, nie funkcja — po nim źródło zgłasza „jest więcej”.
async function okno<T>(
  url: string,
  klucz: string,
  win: number,
  pasuje: (row: T) => boolean = () => true,
): Promise<Okno<T>> {
  const rows: T[] = [];
  let cursor: string | null = null;
  for (let strona = 0; strona < 8; strona++) {
    const res: ({ nextCursor: string | null } & Record<string, unknown>) | null = await serverApi(
      `${url}${url.includes('?') ? '&' : '?'}limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    );
    if (!res) return { rows, wiecej: rows.length > 0, blad: true };
    rows.push(...(res[klucz] as T[]).filter(pasuje));
    cursor = res.nextCursor;
    if (!cursor || rows.length >= win) break;
  }
  return { rows: rows.slice(0, win), wiecej: Boolean(cursor) || rows.length > win, blad: false };
}

/** Ile osób widz obserwuje — decyduje o domyślnej zakładce. */
export async function loadObserwowanych(): Promise<number> {
  const d = await serverApi<{ followingCount: number }>('/feed?scope=following&limit=1');
  return d?.followingCount ?? 0;
}

export async function loadStrumien(
  filtr: Filtr,
  pokaz: number,
  industry: { id: string; name?: string; slug: string } | null,
  zakres: Zakres,
): Promise<Strumien> {
  const obserwowani = zakres === 'obserwowani';
  const wszystko = filtr === 'wszystko' || filtr === 'moja';
  const want = (k: Filtr) => wszystko || filtr === k;
  const win = pokaz + 6;
  const moja = filtr === 'moja' && industry;
  const ind = moja ? `&industryId=${encodeURIComponent(industry.id)}` : '';
  // „Moja branża” bez profilu Lidera: wpisów nie przypisujemy do żadnej branży (nie udajemy dopasowania).
  const wBranzy = (a: FeedRow['actor']) =>
    filtr !== 'moja' || !industry || Boolean(industry.name && a.industry === industry.name);

  // Z feedu bierzemy wpisy portalowe i awanse; w „Obserwowanych” także publikacje usług (po nich
  // zawężamy listę usług). Zlecenia, pytania i realizacje nie mają „obserwowania” — tam ich nie ma.
  const typy = [
    ...(filtr === 'wpisy' || wszystko ? ['SOCIAL_POST_PUBLISHED'] : []),
    ...(wszystko ? ['LEVEL_ACHIEVED'] : []),
    ...(obserwowani && want('uslugi') ? ['LISTING_PUBLISHED'] : []),
  ];
  const publiczne = (k: Filtr) => !obserwowani && want(k);

  const [feed, orders, threads, reals] = await Promise.all([
    typy.length
      ? okno<FeedRow>(
          `/feed?scope=${obserwowani ? 'following' : 'all'}&types=${typy.join(',')}`,
          'items',
          win,
          (r) => wBranzy(r.actor),
        )
      : pusteOkno,
    publiczne('zlecenia')
      ? okno<OrderRow>(`/orders${ind ? `?${ind.slice(1)}` : ''}`, 'orders', win)
      : pusteOkno,
    // Wątki nie mają branży — przy „Mojej branży” ich nie mieszamy (nie udajemy dopasowania).
    publiczne('pytania') && filtr !== 'moja'
      ? okno<ThreadRow>('/threads', 'threads', win)
      : pusteOkno,
    publiczne('realizacje')
      ? okno<RealRow>(
          '/realizations',
          'realizations',
          win,
          (r) => !moja || r.industry.slug === industry.slug,
        )
      : pusteOkno,
  ]);
  const obserwowaneUslugi = new Set(
    feed.rows.filter((r) => r.type === 'LISTING_PUBLISHED').map((r) => r.subjectId),
  );
  const lists: Okno<ListingRow> =
    want('uslugi') && (!obserwowani || obserwowaneUslugi.size > 0)
      ? await okno<ListingRow>(
          `/listings?sort=newest${ind}`,
          'listings',
          obserwowani ? obserwowaneUslugi.size : win,
          (l) => !obserwowani || obserwowaneUslugi.has(l.id),
        )
      : pusteOkno;
  const zrodla = [feed, orders, threads, reals, lists];

  const all: Wpis[] = [];
  for (const r of feed.rows) {
    const lider: Aktor = {
      name: r.actor.displayName,
      handle: r.actor.handle,
      level: r.actor.level,
      avatarFileId: r.actor.avatarFileId,
    };
    const branza = r.actor.industry ?? null;
    if (r.type === 'SOCIAL_POST_PUBLISHED' && r.post)
      all.push({
        k: 'wpis',
        id: r.subjectId,
        at: r.createdAt,
        autor: lider,
        branza,
        tresc: r.post.body,
        zdjecia: r.post.imageFileIds,
        cytat: r.post.quoted,
        komentarze: r.post.comments,
        doceniony: r.post.viewerAppreciated,
        zapisany: r.post.viewerBookmarked,
      });
    const szczebel = Number(r.meta.level ?? 0);
    if (r.type === 'LEVEL_ACHIEVED' && szczebel >= 1 && szczebel <= 7)
      all.push({ k: 'awans', id: r.id, at: r.createdAt, lider, branza, szczebel });
  }
  for (const o of orders.rows)
    all.push({
      k: 'zlecenie',
      id: o.id,
      at: o.publishedAt,
      firma: o.companyName,
      branza: o.industry.name,
      zweryfikowana: Boolean(o.companyVerified),
      tytul: o.title,
      budzetMin: o.budgetMin,
      budzetMax: o.budgetMax,
      minLevel: o.minLevel,
      oferty: o.offersCount ?? 0,
    });
  for (const t of threads.rows)
    all.push({
      k: 'pytanie',
      id: t.id,
      at: t.createdAt,
      autor: t.authorName,
      grupa: t.groupName,
      tytul: t.title,
      odpowiedzi: t.answersCount,
      uznana: t.hasAcceptedAnswer,
    });
  for (const r of reals.rows)
    all.push({
      k: 'realizacja',
      id: r.id,
      at: r.publishedAt,
      lider: {
        name: r.leader.displayName,
        handle: r.leader.handle,
        level: r.leader.level,
        avatarFileId: r.leader.avatarFileId,
      },
      firma: r.company.name,
      branza: r.industry,
      tytul: r.orderTitle,
      ocena: r.rating,
      pkt: r.points,
      waga: r.weight,
      dojrzewa: r.maturesAt,
    });
  for (const l of lists.rows)
    all.push({
      k: 'usluga',
      id: l.id,
      at: l.publishedAt ?? l.createdAt ?? new Date(0).toISOString(),
      lider: {
        name: l.leader.displayName,
        handle: null,
        level: l.leader.level,
        avatarFileId: l.leader.avatarFileId,
      },
      slug: l.slug,
      tytul: l.title,
      cenaOd: l.priceFrom,
      branza: l.industry.name,
      ocena: l.leader.averageRating,
      ocen: l.leader.reviewCount,
    });
  all.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.id < b.id ? 1 : -1));
  return {
    wpisy: all.slice(0, pokaz),
    razem: all.length,
    mozeWiecej: zrodla.some((z) => z.wiecej) || all.length > pokaz,
    zrodelBledow: zrodla.filter((z) => z.blad).length,
  };
}

// ── Drabinka widza ──
export interface MojaDrabinka {
  level: number;
  levelName: string | null;
  rynek: number;
  spol: number;
  razem: number;
  czekaRynek: number;
  czekaSpol: number;
  next: {
    level: number;
    name: string;
    pointsRequired: number;
    missingPoints: number;
    minPathSharePct: number;
  } | null;
  events: Array<{
    id: string;
    type: string;
    points: number;
    status: string;
    weightApplied: number;
    meta: Record<string, unknown>;
    createdAt: string;
    confirmedAt: string | null;
  }>;
}

export async function loadMojaDrabinka(): Promise<MojaDrabinka | null> {
  const d = await serverApi<{
    state: {
      level: number;
      levelName: string | null;
      marketplacePoints: number;
      communityPoints: number;
      totalPoints: number;
    };
    nextLevel: MojaDrabinka['next'];
    events: MojaDrabinka['events'];
  }>('/me/ladder');
  if (!d) return null;
  // „Dojrzewa” = zdarzenia w karencji (PENDING). W stanie łącznym ich nie ma — pokazujemy obok.
  const czeka = (typy: string[]) =>
    d.events
      .filter((e) => e.status === 'PENDING' && typy.includes(e.type))
      .reduce((s, e) => s + e.points, 0);
  return {
    level: d.state.level,
    levelName: d.state.levelName,
    rynek: d.state.marketplacePoints,
    spol: d.state.communityPoints,
    razem: d.state.totalPoints,
    czekaRynek: czeka(['ORDER_COMPLETED_RATED']),
    czekaSpol: czeka(['ANSWER_ACCEPTED', 'ANSWER_UPVOTED_QUALIFIED']),
    next: d.nextLevel,
    events: d.events,
  };
}

export interface Zalogowany {
  id: string;
  displayName: string;
  handle: string | null;
  avatarFileId: string | null;
  level: number;
}

export async function loadJa(): Promise<Zalogowany | null> {
  const me = await serverApi<{
    user: { id: string; displayName: string; avatarFileId?: string | null } | null;
  }>('/auth/me');
  if (!me?.user) return null;
  const [social, ladder] = await Promise.all([
    serverApi<{ handle: string | null }>('/me/social'),
    serverApi<{ state: { level: number } }>('/me/ladder'),
  ]);
  return {
    id: me.user.id,
    displayName: me.user.displayName,
    handle: social?.handle ?? null,
    avatarFileId: me.user.avatarFileId ?? null,
    level: ladder?.state.level ?? 0,
  };
}

// ── Publiczna Oś światła (punkty po wagach — decyzja właściciela 25.11) ──
export interface ZdarzenieSwiatla {
  id: string;
  type: string;
  path: 'rynek' | 'spolecznosc';
  points: number;
  weight: number;
  status: 'CONFIRMED' | 'PENDING';
  createdAt: string;
  maturesAt: string | null;
  title: string | null;
  threadId: string | null;
  /** Ocena 1–5 przy punktach za zlecenie; dla odpowiedzi null. */
  rating?: number | null;
  source: { kind: 'company' | 'person'; id: string; name: string; handle: string | null } | null;
}
export interface Swiatlo {
  summary: {
    level: number;
    marketplacePoints: number;
    communityPoints: number;
    totalPoints: number;
  };
  total: number;
  nextCursor: string | null;
  events: ZdarzenieSwiatla[];
}

export const loadSwiatlo = (handle: string, limit = 6) =>
  serverApi<Swiatlo>(`/profiles/${encodeURIComponent(handle)}/ladder-events?limit=${limit}`);

/** Ile dni do końca karencji (zaokrąglone w górę, min. 1) — albo null, gdy punkt jest już dojrzały. */
export function dniDoDojrzenia(maturesAt: string | null, now = new Date()): number | null {
  if (!maturesAt) return null;
  return Math.max(1, Math.ceil((new Date(maturesAt).getTime() - now.getTime()) / 86_400_000));
}

/** Stan Drabinki dowolnego Lidera z PUBLICZNEJ księgi (summary + dojrzewające zdarzenia). */
export function mojaZLedgera(sw: Swiatlo, rules: LevelRule[]): MojaDrabinka {
  const { level, marketplacePoints, communityPoints, totalPoints } = sw.summary;
  const czeka = (path: 'rynek' | 'spolecznosc') =>
    sw.events
      .filter((e) => e.status === 'PENDING' && e.path === path)
      .reduce((a, e) => a + e.points, 0);
  const nextRule = level < 7 ? rules[level] : undefined;
  return {
    level,
    levelName: level ? (rules[level - 1]?.name ?? null) : null,
    rynek: marketplacePoints,
    spol: communityPoints,
    razem: totalPoints,
    czekaRynek: czeka('rynek'),
    czekaSpol: czeka('spolecznosc'),
    next: nextRule
      ? {
          level: nextRule.level,
          name: nextRule.name,
          pointsRequired: nextRule.pointsRequired,
          missingPoints: Math.max(0, nextRule.pointsRequired - totalPoints),
          minPathSharePct: nextRule.minPathSharePct,
        }
      : null,
    events: [],
  };
}
