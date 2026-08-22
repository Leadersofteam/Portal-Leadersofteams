// Wyszukiwarka globalna: jedno pole, wyniki z pięciu modułów.
//
// Najważniejszy przypadek: trafienie na PREFIKS („rekrut" → „rekrutacji").
// To dowód, że indeksy działają w trybie boolowskim — a przy okazji, że
// indeksy FULLTEXT na threads i social_posts przestały być martwe.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { loadConfig } from '../../shared/config';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

describe.skipIf(!hasInfra)('search — jedno pole na cały Portal', () => {
  let ctx: AppContext;
  const email = `szukaj-${run}@test.local`;
  let cookie = '';
  let userId = '';

  // Ślad zaufania (S19 pkt 3): dwóch Liderów o tej samej frazie w tytule —
  // jeden z historią, drugi świeżutki. Bez tej drugiej strony test dowodziłby
  // tylko, że liczby się doklejają, a nie że MILCZĄ, gdy nie ma czego pokazać.
  const trustPhrase = `zaufanieszukaj${run}`;
  let veteranUserId = '';
  let rookieUserId = '';
  const trustIds: { industry?: string; company?: string; order?: string } = {};

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName: 'Szukajka Testowa' },
    });
    cookie = res.headers['set-cookie'] as string;
    userId = (res.json() as { user: { id: string } }).user.id;

    // Wpis społecznościowy z charakterystyczną frazą.
    await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/social/posts',
      headers: { cookie },
      payload: { body: `Notatka ${run} o rekrutacji zespołu wdrożeniowego i onboardingu.` },
    });

    // --- fixtury śladu zaufania -------------------------------------------
    // Budowane wprost w bazie, nie przez HTTP: cykl życia zlecenia i guardy
    // ma już przeklikany `ladder.integration.test.ts`. Tu badamy WYŁĄCZNIE to,
    // czy wyszukiwarka dokleja statystyki — więc setup ma być tani.
    const industry = await ctx.prisma.industry.upsert({
      where: { slug: `zaufanie-${run}` },
      update: {},
      create: { name: `Zaufanie test ${run}`, slug: `zaufanie-${run}` },
    });
    trustIds.industry = industry.id;

    const makeLeader = async (kind: string, headline: string) => {
      const u = await ctx.prisma.user.create({
        data: {
          email: `${kind}-${run}@test.local`,
          passwordHash: 'x',
          displayName: `${kind} ${run}`,
        },
      });
      const profile = await ctx.prisma.leaderProfile.create({
        data: { userId: u.id, industryId: industry.id, headline },
      });
      await ctx.prisma.serviceListing.create({
        data: {
          leaderProfileId: profile.id,
          industryId: industry.id,
          title: `Usługa ${trustPhrase} ${kind}`,
          slug: `uslu-${kind}-${run}`,
          description: `Opis usługi ${trustPhrase} do testu śladu zaufania.`,
          status: 'PUBLISHED',
          priceFrom: 1000,
          publishedAt: new Date(),
        },
      });
      return { userId: u.id, profileId: profile.id };
    };

    const veteran = await makeLeader('weteran', `Lider ${trustPhrase} z historią`);
    const rookie = await makeLeader('nowicjusz', `Lider ${trustPhrase} bez historii`);
    veteranUserId = veteran.userId;
    rookieUserId = rookie.userId;

    // Weteran: jedno zlecenie CONFIRMED + jedna OPUBLIKOWANA ocena od Firmy.
    const company = await ctx.prisma.company.create({
      data: { name: `Firma zaufania ${run}` },
    });
    trustIds.company = company.id;
    const order = await ctx.prisma.order.create({
      data: {
        companyId: company.id,
        createdById: userId,
        industryId: industry.id,
        title: `Zlecenie zaufania ${run}`,
        description: 'Zlecenie do policzenia zrealizowanych zleceń Lidera.',
        budgetMin: 1000,
        budgetMax: 2000,
        status: 'CONFIRMED',
        publishedAt: new Date(),
      },
    });
    trustIds.order = order.id;
    const offer = await ctx.prisma.offer.create({
      data: {
        orderId: order.id,
        leaderProfileId: veteran.profileId,
        message: 'Oferta testowa do policzenia zrealizowanego zlecenia.',
        status: 'ACCEPTED',
      },
    });
    // `completedOrders` liczy Lidera przez WYGRANĄ ofertę — bez tego pola
    // zlecenie jest CONFIRMED, ale niczyje.
    await ctx.prisma.order.update({
      where: { id: order.id },
      data: { awardedOfferId: offer.id },
    });
    await ctx.prisma.review.create({
      data: {
        orderId: order.id,
        direction: 'COMPANY_TO_LEADER',
        authorUserId: userId,
        rating: 5,
        subjectLeaderUserId: veteran.userId,
        publishedAt: new Date(),
      },
    });
  }, 120_000);

  afterAll(async () => {
    if (!ctx) return;
    await ctx.prisma.socialPost.deleteMany({ where: { authorUserId: userId } });
    await ctx.prisma.activityItem.deleteMany({ where: { actorId: userId } });
    // Kolejność wymuszona kluczami obcymi: ocena → zlecenie (zwolnij wygraną
    // ofertę, inaczej cykl awardedOfferId ↔ offers blokuje kasowanie) → Firma
    // → Liderzy (kaskadą lecą profile i usługi) → branża.
    if (trustIds.order) {
      await ctx.prisma.review.deleteMany({ where: { orderId: trustIds.order } });
      await ctx.prisma.order.update({
        where: { id: trustIds.order },
        data: { awardedOfferId: null },
      });
      await ctx.prisma.offer.deleteMany({ where: { orderId: trustIds.order } });
      await ctx.prisma.order.delete({ where: { id: trustIds.order } });
    }
    if (trustIds.company) await ctx.prisma.company.delete({ where: { id: trustIds.company } });
    await ctx.prisma.user.deleteMany({
      where: { id: { in: [veteranUserId, rookieUserId].filter(Boolean) } },
    });
    await ctx.prisma.user.deleteMany({ where: { email } });
    if (trustIds.industry)
      await ctx.prisma.industry.deleteMany({ where: { id: trustIds.industry } });
    await ctx.close();
  });

  it('znajduje po PREFIKSIE — „rekrut" trafia w „rekrutacji"', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/search?q=rekrut' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      counts: Record<string, number>;
      posts: Array<{ excerpt: string }>;
    };
    // To jest dowód, że indeks social_posts(body) żyje i pracuje w BOOLEAN MODE
    // (w NATURAL LANGUAGE prefiks nie zadziałałby w ogóle).
    expect(body.counts.posts).toBeGreaterThan(0);
    expect(body.posts[0]!.excerpt).toContain('rekrutacj');
  });

  it('zawęża zakres, ale liczniki pokazują cały obraz', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/search?q=rekrut&scope=posts' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { listings: unknown[]; posts: unknown[]; counts: unknown };
    expect(body.posts.length).toBeGreaterThan(0);
    expect(body.listings).toHaveLength(0);
    expect(body.counts).toBeDefined();
  });

  it('odrzuca zapytania za krótkie', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/search?q=a' });
    expect(res.statusCode).toBe(400);
  });

  it('bełkot zwraca puste wyniki, a nie błąd 500', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/search?q=qwertyzxcvbasdfgh',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { counts: Record<string, number> };
    expect(Object.values(body.counts).reduce((a, b) => a + b, 0)).toBe(0);
  });

  // --- S19 pkt 3: ślad zaufania w wynikach ---------------------------------

  interface TrustShape {
    averageRating: number | null;
    reviewCount: number;
    completedOrders: number;
  }

  it('wynik usługi niesie ocenę i zrealizowane zlecenia Lidera, który je ma', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: `/api/v1/search?q=${trustPhrase}` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      counts: Record<string, number>;
      listings: Array<{ title: string; leader: TrustShape }>;
    };
    // Zero wyników zieleniłoby każdą asercję niżej przez nieobecność (M4).
    expect(body.counts.listings).toBe(2);

    const weteran = body.listings.find((l) => l.title.includes('weteran'));
    expect(weteran).toBeDefined();
    expect(weteran!.leader.averageRating).toBe(5);
    expect(weteran!.leader.reviewCount).toBe(1);
    expect(weteran!.leader.completedOrders).toBe(1);
  });

  it('świeży Lider dostaje ciszę, nie zera do pokazania', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: `/api/v1/search?q=${trustPhrase}` });
    const body = res.json() as {
      listings: Array<{ title: string; leader: TrustShape }>;
      leaders: Array<{ displayName: string } & TrustShape>;
    };

    const nowicjusz = body.listings.find((l) => l.title.includes('nowicjusz'));
    expect(nowicjusz).toBeDefined();
    // Kontrakt z warstwą widoku: `hasTrust` w components/ui/trust-strip.tsx
    // ukrywa pas dokładnie przy tych wartościach. Gdyby serwis odsyłał tu
    // np. 0 ocen ale 0 zleceń jako `null`, pas i tak by się nie pokazał —
    // pilnujemy więc obu pól, nie samego renderu.
    expect(nowicjusz!.leader.averageRating).toBeNull();
    expect(nowicjusz!.leader.reviewCount).toBe(0);
    expect(nowicjusz!.leader.completedOrders).toBe(0);
  });

  it('zakładka Liderzy niesie ten sam ślad co zakładka Usługi', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/search?q=${trustPhrase}&scope=leaders`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      leaders: Array<{ headline: string } & TrustShape>;
    };
    expect(body.leaders.length).toBe(2);
    const weteran = body.leaders.find((l) => l.headline.includes('z historią'));
    expect(weteran).toBeDefined();
    expect(weteran!.reviewCount).toBe(1);
    expect(weteran!.completedOrders).toBe(1);
  });

  it('ANTY-MLM: wyszukiwanie nie tworzy zdarzeń ani punktów', async () => {
    const startedAt = new Date();
    for (const q of ['rekrut', 'zespol', 'wdrozenie']) {
      await ctx.app.inject({ method: 'GET', url: `/api/v1/search?q=${q}` });
    }
    expect(await ctx.prisma.outboxEvent.count({ where: { createdAt: { gte: startedAt } } })).toBe(
      0,
    );
    expect(await ctx.prisma.pointEvent.count({ where: { userId } })).toBe(0);
  });
});
