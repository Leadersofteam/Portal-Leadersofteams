// Dane ekranów V17 „Światło” z PRAWDZIWEGO API (zero fixtur). Strumień składamy po stronie serwera
// z czterech publicznych źródeł i sortujemy chronologicznie (ADR-010: bez rankingu, bez algorytmu).
// Czego API nie niesie (miasto i termin zlecenia, termin zbierania ofert, awatary oferentów,
// liczba powiadomień), tego NIE zmyślamy — komponenty pomijają pole albo pokazują stan pusty.
import { serverApi } from '@/lib/server-api';

export interface Aktor {
  name: string;
  handle: string | null;
  level: number;
  avatarFileId: string | null;
}

export type Wpis =
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

export type Filtr = 'wszystko' | 'moja' | 'zlecenia' | 'pytania' | 'realizacje' | 'uslugi';
export const FILTRY: Array<[Filtr, string]> = [
  ['wszystko', 'Wszystko'],
  ['moja', 'Moja branża'],
  ['zlecenia', 'Zlecenia'],
  ['pytania', 'Pytania'],
  ['realizacje', 'Realizacje'],
  ['uslugi', 'Usługi'],
];

export interface Strumien {
  wpisy: Wpis[];
  /** Ile wpisów jest już w oknie pobranych źródeł (M w „N z M”). */
  razem: number;
  /** true, gdy któreś źródło ma jeszcze coś ponad okno — wtedy M jest dolnym ograniczeniem. */
  mozeWiecej: boolean;
  /** Któreś źródło nie odpowiedziało — ekran pokazuje to, a nie udaje, że strumień jest pusty. */
  zrodelBledow: number;
}

export async function loadStrumien(
  filtr: Filtr,
  pokaz: number,
  industry: { id: string; slug: string } | null,
): Promise<Strumien> {
  const want = (k: Filtr) => filtr === 'wszystko' || filtr === 'moja' || filtr === k;
  const win = Math.min(pokaz + 6, 50);
  const ind = filtr === 'moja' && industry ? `&industryId=${encodeURIComponent(industry.id)}` : '';
  const q = `limit=${win}`;
  const [orders, threads, reals, lists] = await Promise.all([
    want('zlecenia')
      ? serverApi<{ orders: OrderRow[]; nextCursor: string | null }>(`/orders?${q}${ind}`)
      : null,
    // Wątki nie mają branży — przy „Mojej branży” ich nie mieszamy (nie udajemy dopasowania).
    want('pytania') && filtr !== 'moja'
      ? serverApi<{ threads: ThreadRow[]; nextCursor: string | null }>(`/threads?${q}`)
      : null,
    want('realizacje')
      ? serverApi<{ realizations: RealRow[]; nextCursor: string | null }>(`/realizations?${q}`)
      : null,
    want('uslugi')
      ? serverApi<{ listings: ListingRow[]; nextCursor: string | null }>(
          `/listings?${q}&sort=newest${ind}`,
        )
      : null,
  ]);
  const wanted = [
    want('zlecenia'),
    want('pytania') && filtr !== 'moja',
    want('realizacje'),
    want('uslugi'),
  ];
  const got = [orders, threads, reals, lists];
  const zrodelBledow = wanted.filter((w, i) => w && got[i] === null).length;

  const all: Wpis[] = [];
  for (const o of orders?.orders ?? [])
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
  for (const t of threads?.threads ?? [])
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
  for (const r of reals?.realizations ?? []) {
    if (filtr === 'moja' && industry && r.industry.slug !== industry.slug) continue;
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
    });
  }
  for (const l of lists?.listings ?? [])
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
  const mozeWiecej = [orders, threads, reals, lists].some((x) => x?.nextCursor);
  return {
    wpisy: all.slice(0, pokaz),
    razem: all.length,
    mozeWiecej: mozeWiecej || all.length > pokaz,
    zrodelBledow,
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
