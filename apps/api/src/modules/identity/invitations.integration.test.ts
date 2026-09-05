// PL5: zaproszenie Lidera i przypomnienie o adresie na realnym MySQL/Redis.
// Zaproszenie: jeden mail, ZERO zapisu w bazie, ZERO punktów i zdarzeń
// (anty-MLM w konstrukcji, nie w regulaminie). Przypomnienie: okno 48–72 h
// obejmuje konto raz, pomija potwierdzone, zanonimizowane i wypisane.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createIdentityService } from './index';
import { loadConfig } from '../../shared/config';
import type { MailMessage, MailService } from '../../shared/mail';
import { buildServer } from '../../server';
import type { AppContext } from '../../server';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

function fakeMail(): MailService & { sent: MailMessage[] } {
  const sent: MailMessage[] = [];
  return {
    enabled: true,
    sent,
    async send(msg) {
      sent.push(msg);
    },
  };
}

describe.skipIf(!hasInfra)('PL5 — zaproszenie Lidera i przypomnienie o adresie', () => {
  let ctx: AppContext;
  let cookie = '';
  let userId = '';
  const email = `zapraszajacy-${run}@example.com`;
  const extra = [`stary-${run}@example.com`, `swiezy-${run}@example.com`];

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName: 'Zapraszająca Ola' },
    });
    const raw = res.headers['set-cookie'];
    cookie = String(Array.isArray(raw) ? raw[0] : raw).split(';')[0] ?? '';
    userId = res.json().user.id;
  });

  afterAll(async () => {
    if (ctx) {
      await ctx.prisma.user.deleteMany({ where: { email: { in: [email, ...extra] } } });
      await ctx.close();
    }
  });

  it('gość nie zaprasza (401), zły adres to 400', async () => {
    const anon = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/me/invitations',
      payload: { email: 'ktos@example.com' },
    });
    expect(anon.statusCode).toBe(401);
    const bad = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/me/invitations',
      headers: { cookie },
      payload: { email: 'to-nie-jest-adres' },
    });
    expect(bad.statusCode).toBe(400);
  });

  it('zaproszenie = 200, mail od konkretnej osoby, ZERO wierszy, punktów i zdarzeń', async () => {
    const outboxBefore = await ctx.prisma.outboxEvent.count();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/me/invitations',
      headers: { cookie },
      payload: { email: `zaproszony-${run}@example.com`, message: 'Warto.' },
    });
    expect(res.statusCode).toBe(200);
    expect(await ctx.prisma.outboxEvent.count()).toBe(outboxBefore);
    expect(await ctx.prisma.pointEvent.count({ where: { userId } })).toBe(0);
    expect(await ctx.prisma.ladderState.findUnique({ where: { userId } })).toBeNull();

    // Treść maila: nadawca z nazwy, jawna deklaracja „nic za to nie dostaje",
    // link do Drogi z utm (żeby lejek PL0 widział źródło).
    const mail = fakeMail();
    const identity = createIdentityService(ctx.prisma, { mail, appBaseUrl: 'https://portal.test' });
    await identity.sendInvitation(userId, { email: 'x@example.com', message: 'Cześć!' });
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]!.subject).toContain('Zapraszająca Ola');
    expect(mail.sent[0]!.text).toContain('utm_source=zaproszenie');
    expect(mail.sent[0]!.text).toContain('„Cześć!"');
    expect(mail.sent[0]!.text).toMatch(/nie dostaje/i);
  });

  it('przypomnienie: okno 48–72 h łapie konto raz, pomija potwierdzone i wypisane', async () => {
    const h = 3_600_000;
    const now = Date.now();
    const identity = createIdentityService(ctx.prisma);
    // „stary" = 60 h temu, niepotwierdzony → w oknie; „świeży" = 10 h → poza.
    await ctx.prisma.user.createMany({
      data: [
        {
          email: extra[0]!,
          displayName: 'Stary',
          passwordHash: 'x',
          createdAt: new Date(now - 60 * h),
        },
        {
          email: extra[1]!,
          displayName: 'Świeży',
          passwordHash: 'x',
          createdAt: new Date(now - 10 * h),
        },
      ],
    });
    const from = new Date(now - 72 * h);
    const to = new Date(now - 48 * h);
    let rows = await identity.listUnverifiedForReminder(from, to);
    expect(rows.map((r) => r.email)).toEqual([extra[0]]);

    // Potwierdzony adres wypada z okna; wypisany z maili — też.
    await ctx.prisma.user.update({
      where: { email: extra[0]! },
      data: { emailVerifiedAt: new Date() },
    });
    rows = await identity.listUnverifiedForReminder(from, to);
    expect(rows).toEqual([]);
    await ctx.prisma.user.update({
      where: { email: extra[0]! },
      data: { emailVerifiedAt: null, digestOptOutAt: new Date() },
    });
    rows = await identity.listUnverifiedForReminder(from, to);
    expect(rows).toEqual([]);

    // Samo przypomnienie: nowy token + mail z linkiem, bez ponaglania.
    const mail = fakeMail();
    const withMail = createIdentityService(ctx.prisma, { mail, appBaseUrl: 'https://portal.test' });
    const stary = await ctx.prisma.user.findUnique({ where: { email: extra[0]! } });
    await withMail.sendVerificationReminder(stary!.id, extra[0]!);
    expect(mail.sent[0]!.text).toContain('https://portal.test/weryfikacja?token=');
    expect(mail.sent[0]!.text).toContain('jedyne przypomnienie');
  });
});
