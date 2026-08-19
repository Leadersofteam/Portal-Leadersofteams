// Administracja rolami (19.08) + digest e-mail: opt-out i wypis tokenem.
// Realny MySQL i Redis, jak pozostałe testy integracyjne identity.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadConfig } from '../../shared/config';
import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { createIdentityService } from './service';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);

describe.skipIf(!hasInfra)('administracja użytkownikami + digest', () => {
  let ctx: AppContext;
  const stamp = Date.now();
  const adminEmail = `test-admin-${stamp}@example.com`;
  const userEmail = `test-user-${stamp}@example.com`;
  const password = 'super-tajne-haslo-1';
  let adminCookie = '';
  let userCookie = '';
  let userId = '';
  let adminId = '';

  async function login(email: string): Promise<string> {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
    });
    const raw = res.headers['set-cookie'];
    return String(Array.isArray(raw) ? raw[0] : raw).split(';')[0] ?? '';
  }

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    for (const [email, name] of [
      [adminEmail, 'Admin Testowy'],
      [userEmail, 'Zwykły Testowy'],
    ] as const) {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, password, displayName: name },
      });
      expect(res.statusCode).toBe(201);
    }
    // ADMIN nadawany POZA aplikacją (tak jak w projekcie: SQL/seed) — trasy
    // administracyjne celowo nie potrafią mianować adminów.
    const admin = await ctx.prisma.user.update({
      where: { email: adminEmail },
      data: { role: 'ADMIN' },
      select: { id: true },
    });
    adminId = admin.id;
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { email: userEmail },
      select: { id: true },
    });
    userId = user.id;
    // Logowanie PO zmianie roli — rola jest zamrożona w sesji.
    adminCookie = await login(adminEmail);
    userCookie = await login(userEmail);
  });

  afterAll(async () => {
    if (ctx) {
      await ctx.prisma.user.deleteMany({ where: { email: { in: [adminEmail, userEmail] } } });
      await ctx.close();
    }
  });

  it('zwykły użytkownik nie widzi listy użytkowników (403)', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: { cookie: userCookie },
    });
    expect(res.statusCode).toBe(403);
  });

  it('admin widzi listę i znajduje konto po frazie', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/admin/users?search=${encodeURIComponent(userEmail)}`,
      headers: { cookie: adminCookie },
    });
    expect(res.statusCode).toBe(200);
    const users = res.json().users as Array<{ id: string; role: string }>;
    expect(users.some((u) => u.id === userId)).toBe(true);
  });

  it('mianowanie moderatora zmienia rolę I unieważnia sesje tej osoby', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/admin/users/${userId}/role`,
      headers: { cookie: adminCookie },
      payload: { role: 'MODERATOR' },
    });
    expect(res.statusCode).toBe(200);

    const inDb = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true },
    });
    expect(inDb.role).toBe('MODERATOR');

    // Sesja sprzed zmiany ma być martwa — rola jest zamrożona przy logowaniu,
    // więc bez tego świeży moderator nie zobaczyłby /panel/moderacja.
    const me = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: userCookie },
    });
    expect(me.statusCode).toBe(401);

    // Po ponownym zalogowaniu sesja niesie już nową rolę.
    userCookie = await login(userEmail);
    const me2 = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: userCookie },
    });
    expect(me2.json().user.role).toBe('MODERATOR');
  });

  it('własnej roli nie da się zmienić (403)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/admin/users/${adminId}/role`,
      headers: { cookie: adminCookie },
      payload: { role: 'USER' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('SELF_ROLE');
  });

  it('roli ADMIN nie da się ani nadać, ani odebrać przez API (403)', async () => {
    const drugiAdmin = await ctx.prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' },
      select: { id: true },
    });
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/admin/users/${drugiAdmin.id}/role`,
      headers: { cookie: adminCookie },
      payload: { role: 'USER' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('ADMIN_IMMUTABLE');
    await ctx.prisma.user.update({ where: { id: userId }, data: { role: 'MODERATOR' } });
  });

  it('digest: domyślnie włączony, przełącznik w koncie działa w obie strony', async () => {
    const before = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/digest',
      headers: { cookie: userCookie },
    });
    expect(before.json()).toEqual({ optedOut: false });

    const off = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/me/digest',
      headers: { cookie: userCookie },
      payload: { optedOut: true },
    });
    expect(off.statusCode).toBe(200);

    const after = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/digest',
      headers: { cookie: userCookie },
    });
    expect(after.json()).toEqual({ optedOut: true });

    const on = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/me/digest',
      headers: { cookie: userCookie },
      payload: { optedOut: false },
    });
    expect(on.statusCode).toBe(200);
  });

  it('wypis tokenem z maila działa bez sesji; zły token nie zdradza niczego', async () => {
    await ctx.prisma.user.update({
      where: { id: userId },
      data: { digestToken: `test-token-${stamp}`, digestOptOutAt: null },
    });

    const zly = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/digest/wypis',
      payload: { token: 'nie-ma-takiego-tokenu-123' },
    });
    expect(zly.statusCode).toBe(200);
    expect(zly.json().ok).toBe(false);

    const dobry = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/digest/wypis',
      payload: { token: `test-token-${stamp}` },
    });
    expect(dobry.statusCode).toBe(200);
    expect(dobry.json().ok).toBe(true);

    const inDb = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { digestOptOutAt: true },
    });
    expect(inDb.digestOptOutAt).not.toBeNull();
  });

  it('getDigestRecipients pomija wypisanych i leniwie nadaje tokeny pozostałym', async () => {
    // Ta sama kompozycja co w workerze: serwis bez warstwy HTTP.
    const identity = createIdentityService(ctx.prisma);
    // userId jest wypisany (test wyżej); admin nie ma jeszcze tokenu.
    const recipients = await identity.getDigestRecipients([userId, adminId]);
    expect(recipients.has(userId)).toBe(false);
    const admin = recipients.get(adminId);
    expect(admin?.email).toBe(adminEmail);
    expect(admin?.token?.length ?? 0).toBeGreaterThanOrEqual(16);
  });
});
