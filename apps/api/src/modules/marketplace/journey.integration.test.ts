// Droga Lidera (PL3): publiczny profil niesie oś awansów — datę dołączenia
// i listę osiągniętych poziomów. Świeży Lider ma pustą listę i datę wejścia:
// oś zaczyna się od zera, nie od pierwszego punktu.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadConfig } from '../../shared/config';
import { buildServer } from '../../server';
import type { AppContext } from '../../server';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

describe.skipIf(!hasInfra)('marketplace — oś Drogi na publicznym profilu', () => {
  let ctx: AppContext;
  let industryId = '';
  let profileId = '';
  let userId = '';
  const email = `droga-${run}@example.com`;

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    const industry = await ctx.prisma.industry.upsert({
      where: { slug: `droga-${run}` },
      update: {},
      create: { name: `Droga ${run}`, slug: `droga-${run}` },
    });
    industryId = industry.id;
    const reg = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName: 'Lider Drogi' },
    });
    userId = reg.json().user.id;
    const raw = reg.headers['set-cookie'];
    const cookie = String(Array.isArray(raw) ? raw[0] : raw).split(';')[0] ?? '';
    const prof = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/me/leader-profile',
      headers: { cookie },
      payload: { industryId, headline: 'Lider, który dopiero zaczyna' },
    });
    profileId = prof.json().id;
  });

  afterAll(async () => {
    if (ctx) {
      await ctx.prisma.levelAchievement.deleteMany({ where: { userId } });
      await ctx.prisma.leaderProfile.deleteMany({ where: { userId } });
      await ctx.prisma.user.deleteMany({ where: { email } });
      await ctx.prisma.industry.deleteMany({ where: { slug: `droga-${run}` } });
      await ctx.close();
    }
  });

  it('świeży profil: journey.joinedAt jest datą, achievements puste, poziom 0', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: `/api/v1/leaders/${profileId}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.profile.level).toBe(0);
    expect(typeof body.journey.joinedAt).toBe('string');
    expect(body.journey.achievements).toEqual([]);
  });

  it('po awansach oś zwraca poziomy rosnąco z datami — bez punktów i bez księgi', async () => {
    const t1 = new Date('2026-08-01T10:00:00Z');
    const t2 = new Date('2026-08-20T10:00:00Z');
    await ctx.prisma.levelAchievement.createMany({
      data: [
        { userId, level: 2, achievedAt: t2 },
        { userId, level: 1, achievedAt: t1 },
      ],
    });
    const res = await ctx.app.inject({ method: 'GET', url: `/api/v1/leaders/${profileId}` });
    const journey = res.json().journey;
    expect(journey.achievements.map((a: { level: number }) => a.level)).toEqual([1, 2]);
    expect(journey.achievements[0].achievedAt).toBe(t1.toISOString());
    for (const a of journey.achievements)
      expect(Object.keys(a).sort()).toEqual(['achievedAt', 'level']);
  });
});
