import {
  adminSetRoleInputSchema,
  createCompanyInputSchema,
  digestOptOutInputSchema,
  digestUnsubscribeInputSchema,
  loginInputSchema,
  registerInputSchema,
  requestPasswordResetInputSchema,
  resetPasswordInputSchema,
  updateOnboardingInputSchema,
  verifyEmailInputSchema,
} from '@lot/contracts';
import type { SessionUser } from '@lot/contracts';
import type { FastifyInstance, FastifyReply } from 'fastify';

import type { AuthHelpers } from '../../shared/auth';
import type { AppConfig } from '../../shared/config';
import { DomainError } from '../../shared/errors';
import type { SessionStore } from '../../shared/session';
import type { Humancheck } from '../../shared/humancheck';
import { parseBody } from '../../shared/validation';
import type { IdentityService } from './service';

export interface IdentityRoutesDeps {
  service: IdentityService;
  sessions: SessionStore;
  auth: AuthHelpers;
  humancheck: Humancheck;
  config: Pick<
    AppConfig,
    'SESSION_COOKIE_NAME' | 'SESSION_TTL_SECONDS' | 'cookieSecure' | 'NODE_ENV' | 'isProduction'
  >;
}

export function identityRoutes(deps: IdentityRoutesDeps) {
  const { service, sessions, auth, humancheck, config } = deps;

  const cookieOptions = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.cookieSecure,
    maxAge: config.SESSION_TTL_SECONDS,
  };

  async function startSession(reply: FastifyReply, user: SessionUser) {
    const sessionId = await sessions.create(user);
    reply.setCookie(config.SESSION_COOKIE_NAME, sessionId, cookieOptions);
  }

  return async function plugin(app: FastifyInstance) {
    // Ostrzejszy limit dla endpointów auth (ochrona przed credential stuffing).
    // W testach limit jest zdjęty — wszystkie suity dzielą IP 127.0.0.1
    // i wspólne klucze limitera w Redis.
    const authRateLimit = {
      rateLimit: { max: config.NODE_ENV === 'test' ? 10_000 : 10, timeWindow: '1 minute' },
    };

    // Wyzwanie bramki człowieka. Front pobiera je przy wejściu na /rejestracja
    // i rozwiązuje W TLE, gdy użytkownik wypełnia formularz — dzięki temu czeka
    // zero sekund. Limit jest tu ostrzejszy niż zwykły: samo wydawanie wyzwań
    // to jedyna operacja, którą da się wołać bez żadnego kosztu po stronie klienta.
    app.get(
      '/auth/challenge',
      {
        config: {
          rateLimit: { max: config.NODE_ENV === 'test' ? 10_000 : 30, timeWindow: '1 minute' },
        },
      },
      async (request, reply) => {
        if (!humancheck.enabled) return reply.send({ challenge: null });
        return reply.send({ challenge: await humancheck.issue(request.ip) });
      },
    );

    app.post('/auth/register', { config: authRateLimit }, async (request, reply) => {
      // Anty-bot (R-03/R-13) — WŁASNA bramka, bez zewnętrznego dostawcy.
      // Fail-closed przy włączonej ochronie: brak albo złe rozwiązanie = odmowa.
      if (humancheck.enabled) {
        const body = request.body as { humancheck?: unknown; nazwaFirmy?: unknown } | undefined;
        // `nazwaFirmy` to POLE-PUŁAPKA (honeypot): w formularzu jest ukryte
        // i puste, więc każda wartość oznacza automat wypełniający wszystko.
        // Nazwa jest celowo wiarygodna — „honeypot" w atrybucie zdradzałby ją.
        const result = await humancheck.verify(body?.humancheck, body?.nazwaFirmy);
        if (!result.ok) {
          request.log.info({ reason: result.reason, ip: request.ip }, 'humancheck.rejected');
          throw new DomainError(
            'HUMANCHECK_FAILED',
            'Nie udało się potwierdzić, że to nie automat. Odśwież stronę i spróbuj ponownie.',
            400,
          );
        }
      }
      const input = parseBody(registerInputSchema, request.body);
      const user = await service.register(input);
      await startSession(reply, user);
      return reply.code(201).send({ user });
    });

    app.post('/auth/login', { config: authRateLimit }, async (request, reply) => {
      const input = parseBody(loginInputSchema, request.body);
      const user = await service.authenticate(input);
      await startSession(reply, user);
      return reply.send({ user });
    });

    app.post('/auth/logout', async (request, reply) => {
      const sessionId = request.cookies[config.SESSION_COOKIE_NAME];
      if (sessionId) await sessions.destroy(sessionId);
      reply.clearCookie(config.SESSION_COOKIE_NAME, { path: '/' });
      return reply.send({ ok: true });
    });

    app.get('/auth/me', async (request, reply) => {
      const user = await auth.currentUser(request);
      if (!user) return reply.code(401).send({ user: null });
      return reply.send({ user });
    });

    app.post('/companies', async (request, reply) => {
      const user = await auth.requireUser(request);
      const input = parseBody(createCompanyInputSchema, request.body);
      const company = await service.createCompany(user.id, input);
      return reply.code(201).send({ company });
    });

    app.get('/me/companies', async (request, reply) => {
      const user = await auth.requireUser(request);
      const companies = await service.listCompanies(user.id);
      return reply.send({ companies });
    });

    // --- pierwsza mila (S10): stan kreatora i checklisty --------------------
    // Świadomie NIE trzymamy tego w SessionUser: sesja siedzi w cache Redis,
    // więc pole byłoby nieaktualne zaraz po PATCH aż do wygaśnięcia TTL.

    app.get('/me/onboarding', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send(await service.getOnboarding(user.id));
    });

    app.patch('/me/onboarding', async (request, reply) => {
      const user = await auth.requireUser(request);
      const input = parseBody(updateOnboardingInputSchema, request.body);
      return reply.send(await service.updateOnboarding(user.id, input));
    });

    // --- E-mail (D4): weryfikacja adresu i reset hasła (za flagą) -----------
    app.post('/auth/verify-email', { config: authRateLimit }, async (request, reply) => {
      const input = parseBody(verifyEmailInputSchema, request.body);
      return reply.send(await service.verifyEmail(input.token));
    });

    app.get('/me/verification', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send(await service.getVerificationStatus(user.id));
    });

    // Ponowna wysyłka linku aktywacyjnego. Bez tego jedyną drogą po wygaśnięciu
    // tokenu (doba) było założenie DRUGIEGO konta na ten sam adres — czyli
    // ślepy zaułek w pierwszej mili.
    app.post('/auth/resend-verification', { config: authRateLimit }, async (request, reply) => {
      const user = await auth.requireUser(request);
      const status = await service.getVerificationStatus(user.id);
      // Cicho OK dla już potwierdzonych: to nie błąd użytkownika, a wysyłanie
      // kolejnych maili na potwierdzony adres byłoby tylko hałasem.
      let rawToken: string | null = null;
      if (status && !status.verified) {
        rawToken = await service.sendEmailVerification(user.id, status.email);
      }
      // Poza produkcją oddajemy token — tą samą konwencją co reset hasła.
      // Bez tego ścieżki aktywacji NIE DA SIĘ przejść w e2e (poczta jest tam
      // no-opem), a właśnie brak takiego testu pozwolił 404 dożyć produkcji.
      return reply.send({ ok: true, ...(config.isProduction ? {} : { devToken: rawToken }) });
    });

    app.post('/auth/request-password-reset', { config: authRateLimit }, async (request, reply) => {
      const input = parseBody(requestPasswordResetInputSchema, request.body);
      const { rawToken } = await service.requestPasswordReset(input.email);
      // Bez enumeracji: zawsze OK. Poza produkcją zwracamy token do testów/dev
      // (na produkcji trafia wyłącznie na e-mail).
      return reply.send({ ok: true, ...(config.isProduction ? {} : { devToken: rawToken }) });
    });

    app.post('/auth/reset-password', { config: authRateLimit }, async (request, reply) => {
      const input = parseBody(resetPasswordInputSchema, request.body);
      const result = await service.resetPassword(input.token, input.password);
      if (!result.reset) {
        return reply
          .code(400)
          .send({ error: { code: 'INVALID_TOKEN', message: 'Token nieprawidłowy lub wygasł' } });
      }
      return reply.send({ ok: true });
    });

    // --- Digest e-mail (19.08): stan, przełącznik i wypis z linku w mailu ---
    app.get('/me/digest', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send(await service.getDigestState(user.id));
    });

    app.post('/me/digest', async (request, reply) => {
      const user = await auth.requireUser(request);
      const input = parseBody(digestOptOutInputSchema, request.body);
      await service.setDigestOptOut(user.id, input.optedOut);
      return reply.send({ ok: true, optedOut: input.optedOut });
    });

    // Wypis BEZ sesji — token z maila jest dowodem posiadania skrzynki.
    // Limit jak przy auth: token da się zgadywać, więc nie dajemy nieskończonych
    // prób. Odpowiedź nie rozróżnia „złego tokenu" od „już wypisany" ponad to,
    // co konieczne — ok=false znaczy tylko „ten link nie zadziałał".
    app.post('/digest/wypis', { config: authRateLimit }, async (request, reply) => {
      const input = parseBody(digestUnsubscribeInputSchema, request.body);
      const ok = await service.digestOptOutByToken(input.token);
      return reply.send({ ok });
    });

    // --- Administracja użytkownikami (19.08, tylko ADMIN) -------------------
    // Do tej pory nadanie roli MODERATOR = ręczny SQL na produkcji + pułapka
    // roli zamrożonej w sesji. Trasa + ekran /panel/uzytkownicy zamykają temat.
    app.get('/admin/users', async (request, reply) => {
      await auth.requireRole(request, ['ADMIN']);
      const { search } = request.query as { search?: string };
      const users = await service.listUsers(search);
      return reply.send({ users });
    });

    app.post('/admin/users/:id/role', async (request, reply) => {
      const admin = await auth.requireRole(request, ['ADMIN']);
      const { id } = request.params as { id: string };
      const input = parseBody(adminSetRoleInputSchema, request.body);
      await service.setUserRole(admin.id, id, input.role);
      return reply.send({ ok: true, role: input.role });
    });

    // --- RODO (D6): eksport i usunięcie (anonimizacja) konta ----------------
    app.get('/me/export', async (request, reply) => {
      const user = await auth.requireUser(request);
      return reply.send(await service.exportAccount(user.id));
    });

    app.delete('/me', async (request, reply) => {
      const user = await auth.requireUser(request);
      await service.anonymizeAccount(user.id);
      const sessionId = request.cookies[config.SESSION_COOKIE_NAME];
      if (sessionId) await sessions.destroy(sessionId);
      reply.clearCookie(config.SESSION_COOKIE_NAME, { path: '/' });
      return reply.send({ ok: true });
    });
  };
}
