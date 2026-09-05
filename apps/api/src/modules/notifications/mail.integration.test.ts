// Maile natychmiastowe (PL1) na realnym MySQL/Redis. Powód istnienia: do 04.09
// jedyną wysyłką był dzienny digest, więc Firma bez codziennego logowania nie
// wiedziała o ofercie do własnego zlecenia. Test sprawdza to, czego nie widzi
// log `mail.sent`: adresata, treść z linkiem, dedupe przy redelivery,
// poszanowanie wypisu i cichy no-op bez SMTP.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createIdentityService } from '../identity/index';
import { loadConfig } from '../../shared/config';
import type { MailMessage, MailService } from '../../shared/mail';
import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { createNotificationsService } from './service';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

function fakeMail(enabled = true): MailService & { sent: MailMessage[] } {
  const sent: MailMessage[] = [];
  return {
    enabled,
    sent,
    async send(msg) {
      sent.push(msg);
    },
  };
}

describe.skipIf(!hasInfra)('notifications — maile natychmiastowe', () => {
  let ctx: AppContext;
  let companyUserId = '';
  let leaderUserId = '';
  let companyId = '';
  const emails = {
    company: `mail-firma-${run}@example.com`,
    leader: `mail-lider-${run}@example.com`,
  };

  async function register(email: string, displayName: string) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName },
    });
    const raw = res.headers['set-cookie'];
    const cookie = String(Array.isArray(raw) ? raw[0] : raw).split(';')[0] ?? '';
    return { cookie, userId: res.json().user.id as string };
  }

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    const company = await register(emails.company, 'Firma Mail');
    companyUserId = company.userId;
    ({ userId: leaderUserId } = await register(emails.leader, 'Lider Mail'));
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/companies',
      headers: { cookie: company.cookie },
      payload: { name: 'Mail Sp. z o.o.' },
    });
    companyId = created.json().company.id;
  }, 60_000);

  afterAll(async () => {
    if (ctx) {
      await ctx.prisma.notification.deleteMany({
        where: { userId: { in: [companyUserId, leaderUserId] } },
      });
      await ctx.prisma.company.deleteMany({ where: { id: companyId } });
      await ctx.prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
      await ctx.close();
    }
  });

  function service(mail: MailService) {
    const identity = createIdentityService(ctx.prisma);
    return createNotificationsService({
      prisma: ctx.prisma,
      identity,
      mailer: {
        mail,
        getRecipients: identity.getDigestRecipients,
        appBaseUrl: 'https://portal.test',
      },
    });
  }

  it('offer_submitted → mail do Firmy z linkiem do wątku i wypisem', async () => {
    const mail = fakeMail();
    await service(mail).onOfferSubmitted({
      offerId: `of-${run}`,
      orderId: `or-${run}`,
      orderTitle: 'Redesign panelu',
      leaderUserId,
      companyId,
    } as never);
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]!.to).toBe(emails.company);
    expect(mail.sent[0]!.subject).toContain('Redesign panelu');
    expect(mail.sent[0]!.text).toContain(`https://portal.test/oferty/of-${run}`);
    expect(mail.sent[0]!.text).toContain('/wypis-digest?token=');
    expect(mail.sent[0]!.text).not.toMatch(/natychmiast|teraz!|ostatnia szansa/i);
  });

  it('redelivery tego samego zdarzenia NIE wysyła drugiego maila', async () => {
    const mail = fakeMail();
    await service(mail).onOfferSubmitted({
      offerId: `of-${run}`,
      orderId: `or-${run}`,
      orderTitle: 'Redesign panelu',
      leaderUserId,
      companyId,
    } as never);
    expect(mail.sent).toHaveLength(0);
  });

  it('offer_message: adresatem jest DRUGA strona, nie autor', async () => {
    const mail = fakeMail();
    const svc = service(mail);
    await svc.onOfferMessage({
      offerId: `of2-${run}`,
      orderId: `or-${run}`,
      orderTitle: 'Redesign panelu',
      authorUserId: leaderUserId,
      authorIsLeader: true,
      leaderUserId,
      companyId,
    } as never);
    expect(mail.sent.map((m) => m.to)).toEqual([emails.company]);
    await svc.onOfferMessage({
      offerId: `of3-${run}`,
      orderId: `or-${run}`,
      authorUserId: companyUserId,
      authorIsLeader: false,
      leaderUserId,
      companyId,
    } as never);
    expect(mail.sent.map((m) => m.to)).toEqual([emails.company, emails.leader]);
  });

  it('order_delivered bez companyId (zdarzenie sprzed PL1) = cisza, z companyId = mail do Firmy', async () => {
    const mail = fakeMail();
    const svc = service(mail);
    expect(await svc.onOrderDelivered({ orderId: `x-${run}`, leaderUserId } as never)).toBe(0);
    await svc.onOrderDelivered({
      orderId: `od-${run}`,
      orderTitle: 'Redesign panelu',
      companyId,
      leaderUserId,
    } as never);
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]!.text).toContain(`/zlecenia/od-${run}`);
  });

  it('wypisany użytkownik dostaje powiadomienie in-app, ale NIE mail', async () => {
    await ctx.prisma.user.update({
      where: { id: leaderUserId },
      data: { digestOptOutAt: new Date() },
    });
    const mail = fakeMail();
    const count = await service(mail).onOfferAccepted({
      offerId: `oa-${run}`,
      orderId: `or-${run}`,
      orderTitle: 'Redesign panelu',
      leaderUserId,
    } as never);
    expect(count).toBe(1);
    expect(mail.sent).toHaveLength(0);
    await ctx.prisma.user.update({ where: { id: leaderUserId }, data: { digestOptOutAt: null } });
  });

  it('bez SMTP (mail.enabled = false) powiadomienie powstaje, mail nie', async () => {
    const mail = fakeMail(false);
    const count = await service(mail).onOrderConfirmed({
      orderId: `oc-${run}`,
      orderTitle: 'Redesign panelu',
      companyId,
      leaderUserId,
    } as never);
    expect(count).toBe(1);
    expect(mail.sent).toHaveLength(0);
  });
});
