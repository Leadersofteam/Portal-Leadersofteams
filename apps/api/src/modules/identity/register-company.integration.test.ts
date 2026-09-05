// PL2 „Firma w 90 sekund" na realnym MySQL/Redis: rejestracja z nazwą firmy
// zakłada Company z właścicielem i ustawia intencję COMPANY, a zwykła
// rejestracja pozostaje bez zmian. Osobno: bramka „publikacja po potwierdzeniu
// adresu" (D2) — włączana flagą, bo bez SMTP nie ma jak potwierdzić adresu.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createIdentityService } from './index';
import { createLadderService } from '../ladder/index';
import { createOrdersService } from '../marketplace/index';
import { loadConfig } from '../../shared/config';
import { buildServer } from '../../server';
import type { AppContext } from '../../server';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

describe.skipIf(!hasInfra)(
  'PL2 — konto i firma jednym krokiem, publikacja po potwierdzeniu',
  () => {
    let ctx: AppContext;
    const emails = {
      firma: `pl2-firma-${run}@example.com`,
      zwykly: `pl2-zwykly-${run}@example.com`,
    };
    let firmaCookie = '';
    let firmaUserId = '';
    let companyId = '';
    let industryId = '';

    function post(cookie: string, url: string, payload?: Record<string, unknown>) {
      return ctx.app.inject({ method: 'POST', url, headers: { cookie }, payload });
    }

    beforeAll(async () => {
      ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
      const industry = await ctx.prisma.industry.upsert({
        where: { slug: `pl2-${run}` },
        update: {},
        create: { name: `PL2 ${run}`, slug: `pl2-${run}` },
      });
      industryId = industry.id;
    });

    afterAll(async () => {
      if (ctx) {
        await ctx.prisma.order.deleteMany({ where: { industryId } });
        if (companyId) await ctx.prisma.company.deleteMany({ where: { id: companyId } });
        await ctx.prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
        await ctx.prisma.industry.deleteMany({ where: { slug: `pl2-${run}` } });
        await ctx.close();
      }
    });

    it('rejestracja z companyName zakłada firmę (właściciel = konto) i intencję COMPANY', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: emails.firma,
          password: 'super-tajne-haslo-1',
          displayName: 'Alicja z Firmy',
          companyName: `Pierwsza Firma ${run}`,
        },
      });
      expect(res.statusCode).toBe(201);
      const raw = res.headers['set-cookie'];
      firmaCookie = String(Array.isArray(raw) ? raw[0] : raw).split(';')[0] ?? '';
      firmaUserId = res.json().user.id;

      const companies = await ctx.app.inject({
        method: 'GET',
        url: '/api/v1/me/companies',
        headers: { cookie: firmaCookie },
      });
      expect(companies.json().companies).toHaveLength(1);
      expect(companies.json().companies[0].name).toBe(`Pierwsza Firma ${run}`);
      expect(companies.json().companies[0].role).toBe('OWNER');
      companyId = companies.json().companies[0].id;

      const onboarding = await ctx.app.inject({
        method: 'GET',
        url: '/api/v1/me/onboarding',
        headers: { cookie: firmaCookie },
      });
      expect(onboarding.json().intent).toBe('COMPANY');
    });

    it('zwykła rejestracja (bez companyName) nie tworzy firmy ani intencji', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: emails.zwykly, password: 'super-tajne-haslo-1', displayName: 'Zwykły' },
      });
      expect(res.statusCode).toBe(201);
      const user = await ctx.prisma.user.findUnique({
        where: { email: emails.zwykly },
        include: { companyMemberships: true },
      });
      expect(user?.companyMemberships).toHaveLength(0);
      expect(user?.onboardingIntent).toBeNull();
    });

    it('bramka D2: z flagą publikacja bez potwierdzonego adresu = 403, po potwierdzeniu przechodzi', async () => {
      // Serwis z WŁĄCZONĄ bramką (na produkcji flaga = SMTP włączone).
      const identity = createIdentityService(ctx.prisma);
      const ladder = createLadderService(ctx.prisma);
      const orders = createOrdersService({
        prisma: ctx.prisma,
        identity,
        ladder,
        publishRequiresVerifiedEmail: true,
      });
      const draft = await post(firmaCookie, '/api/v1/orders', {
        companyId,
        title: `Zlecenie z formularza gościa ${run}`,
        description: 'Opisane przed założeniem konta, zapisane po nim — teraz publikacja.',
        industryId,
        budgetMin: 500,
        budgetMax: 1500,
        minLevel: 0,
      });
      expect(draft.statusCode).toBe(201);
      const orderId = draft.json().id as string;

      await expect(orders.publish(firmaUserId, orderId)).rejects.toMatchObject({
        code: 'EMAIL_NOT_VERIFIED',
        statusCode: 403,
      });

      await ctx.prisma.user.update({
        where: { id: firmaUserId },
        data: { emailVerifiedAt: new Date() },
      });
      await orders.publish(firmaUserId, orderId);
      const order = await ctx.prisma.order.findUnique({ where: { id: orderId } });
      expect(order?.status).toBe('PUBLISHED');
    });

    it('bez flagi (dev/test bez SMTP) publikacja nie wymaga potwierdzenia — jak dotąd', async () => {
      const draft = await post(firmaCookie, '/api/v1/orders', {
        companyId,
        title: `Drugie zlecenie ${run}`,
        description: 'Sprawdzamy, że domyślna konfiguracja testowa nie zmieniła zachowania.',
        industryId,
        budgetMin: 500,
        budgetMax: 1500,
        minLevel: 0,
      });
      await ctx.prisma.user.update({
        where: { id: firmaUserId },
        data: { emailVerifiedAt: null },
      });
      const publish = await post(firmaCookie, `/api/v1/orders/${draft.json().id}/publish`);
      expect(publish.statusCode).toBe(200);
    });
  },
);
