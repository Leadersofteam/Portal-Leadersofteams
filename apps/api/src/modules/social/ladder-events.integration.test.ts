// Publiczna Oś światła (V17): GET /profiles/:handle/ladder-events.
// Decyzja właściciela 25.11: punkty po wagach są publiczne. Ten test pilnuje trzech rzeczy:
//  1) zakres publiczności: tylko CONFIRMED i PENDING (z `maturesAt`), bez cofniętych (REVERSED),
//     wstrzymanych przez antyfraud (HOLD) i korekt moderacji; waga ×0,5 jest widoczna;
//  2) read-only (ADR-004): odczyt nie zmienia ani liczby PointEvent, ani outboxa, a kod nie
//     dodaje źródeł punktów;
//  3) granica modułów (ADR-002): social czyta księgę wyłącznie przez modules/ladder/index.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { loadConfig } from '../../shared/config';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();
const H = 3_600_000;

describe.skipIf(!hasInfra)('Oś światła: publiczna księga Lidera (read-only)', () => {
  let ctx: AppContext;
  const email = `ladder-events-${run}@test.local`;
  let userId = '';
  let handle = '';

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName: 'Księga Testowa' },
    });
    expect(res.statusCode).toBe(201);
    userId = (res.json() as { user: { id: string } }).user.id;
    handle = (await ctx.prisma.user.findUnique({ where: { id: userId } }))?.handle ?? '';
    if (!handle) {
      const me = await ctx.app.inject({
        method: 'GET',
        url: '/api/v1/me/social',
        headers: { cookie: res.headers['set-cookie'] as string },
      });
      handle = (me.json() as { handle: string }).handle;
    }
    const mk = (
      key: string,
      type: 'ORDER_COMPLETED_RATED' | 'ANSWER_ACCEPTED' | 'ADJUSTMENT_MODERATION',
      points: number,
      weight: number,
      status: 'CONFIRMED' | 'PENDING' | 'REVERSED' | 'HOLD',
      agoH: number,
    ) =>
      ctx.prisma.pointEvent.create({
        data: {
          userId,
          type,
          points,
          weightApplied: weight,
          status,
          sourceType: 'Fixture',
          sourceId: `ledger-${run}-${key}`,
          rulesetVersion: 'v1',
          createdAt: new Date(Date.now() - agoH * H),
          meta: { explanation: 'POWÓD PRYWATNY — nie wolno go zwracać' },
        },
      });
    await mk('a', 'ORDER_COMPLETED_RATED', 100, 1, 'CONFIRMED', 300);
    await mk('b', 'ORDER_COMPLETED_RATED', 50, 0.5, 'CONFIRMED', 200); // druga ocena tej samej firmy: ×0,5
    await mk('c', 'ANSWER_ACCEPTED', 50, 1, 'PENDING', 24);
    await mk('d', 'ORDER_COMPLETED_RATED', 100, 1, 'REVERSED', 100); // cofnięte — nie wolno pokazać
    await mk('e', 'ORDER_COMPLETED_RATED', 100, 1, 'HOLD', 90); // wstrzymane przez antyfraud
    await mk('f', 'ADJUSTMENT_MODERATION', 20, 1, 'CONFIRMED', 80); // korekta moderacji
    await ctx.prisma.ladderState.create({
      data: {
        userId,
        marketplacePoints: 150,
        communityPoints: 0,
        totalPoints: 150,
        level: 1,
        isLeader: true,
        rulesetVersion: 'v1',
      },
    });
  }, 120_000);

  afterAll(async () => {
    if (!ctx) return;
    await ctx.prisma.pointEvent.deleteMany({ where: { userId } });
    await ctx.prisma.ladderState.deleteMany({ where: { userId } });
    await ctx.prisma.user.deleteMany({ where: { email } });
    await ctx.close();
  });

  const get = (qs = '') =>
    ctx.app.inject({ method: 'GET', url: `/api/v1/profiles/${handle}/ladder-events${qs}` });

  it('pokazuje tylko przyznane i dojrzewające, z wagą; nie zwraca cofniętych, HOLD ani korekt', async () => {
    const res = await get();
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      total: number;
      events: Array<{
        points: number;
        weight: number;
        status: string;
        maturesAt: string | null;
        type: string;
      }>;
    };
    expect(body.total).toBe(3);
    expect(body.events.map((e) => e.status).sort()).toEqual(['CONFIRMED', 'CONFIRMED', 'PENDING']);
    expect(body.events.some((e) => e.type === 'ADJUSTMENT_MODERATION')).toBe(false);
    // waga ×0,5 dla drugiej oceny tej samej firmy jest jawna
    const half = body.events.find((e) => e.weight === 0.5);
    expect(half?.points).toBe(50);
    // dojrzewający ma koniec karencji, przyznany nie
    expect(body.events.find((e) => e.status === 'PENDING')?.maturesAt).toBeTruthy();
    expect(
      body.events.filter((e) => e.status === 'CONFIRMED').every((e) => e.maturesAt === null),
    ).toBe(true);
    // nic prywatnego: ani meta, ani powód, ani e-mail
    const raw = res.body;
    expect(raw).not.toContain('POWÓD PRYWATNY');
    expect(raw).not.toContain(email);
    expect(raw).not.toContain('"meta"');
  });

  it('chronologicznie od najnowszych, z paginacją kursorem („N z M”)', async () => {
    const p1 = (await get('?limit=2')).json() as {
      total: number;
      nextCursor: string | null;
      events: Array<{ id: string; createdAt: string }>;
    };
    expect(p1.events).toHaveLength(2);
    expect(p1.total).toBe(3);
    expect(p1.nextCursor).toBeTruthy();
    expect(new Date(p1.events[0]!.createdAt).getTime()).toBeGreaterThan(
      new Date(p1.events[1]!.createdAt).getTime(),
    );
    const p2 = (await get(`?limit=2&cursor=${p1.nextCursor}`)).json() as {
      events: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(p2.events).toHaveLength(1);
    expect(p2.nextCursor).toBeNull();
    expect(p2.events[0]!.id).not.toBe(p1.events[0]!.id);
  });

  it('jest read-only: odczyt nie zmienia księgi ani outboxa (ADR-004)', async () => {
    const snap = async () => ({
      events: await ctx.prisma.pointEvent.count(),
      outbox: await ctx.prisma.outboxEvent.count(),
      state: JSON.stringify(await ctx.prisma.ladderState.findUnique({ where: { userId } })),
    });
    const before = await snap();
    for (let i = 0; i < 3; i++) expect((await get()).statusCode).toBe(200);
    expect(await snap()).toEqual(before);
    // metody księgi w ladder nie zapisują: żadnego create/update/delete w getPublicLedger / getReviewPoints
    const src = readFileSync(join(__dirname, '../ladder/service.ts'), 'utf8');
    const body = src.slice(src.indexOf('async getPublicLedger'), src.indexOf('async listLevels'));
    expect(body).not.toMatch(/\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(/);
  });

  it('granica modułów (ADR-002): social czyta ladder tylko przez modules/ladder/index', () => {
    const src = readFileSync(join(__dirname, 'service.ts'), 'utf8');
    const imports = [...src.matchAll(/from '(\.\.\/ladder\/[^']+)'/g)].map((m) => m[1]);
    expect(imports.length).toBeGreaterThan(0);
    expect(imports.every((i) => i === '../ladder/index')).toBe(true);
  });

  it('nieistniejący profil → 404', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/profiles/nie-ma-takiego-xyz/ladder-events',
    });
    expect(res.statusCode).toBe(404);
  });
});
