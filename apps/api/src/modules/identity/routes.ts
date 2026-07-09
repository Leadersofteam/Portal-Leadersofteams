import {
  createCompanyInputSchema,
  loginInputSchema,
  registerInputSchema,
  requestPasswordResetInputSchema,
  resetPasswordInputSchema,
  verifyEmailInputSchema,
} from '@lot/contracts';
import type { SessionUser } from '@lot/contracts';
import type { FastifyInstance, FastifyReply } from 'fastify';

import type { AuthHelpers } from '../../shared/auth';
import type { AppConfig } from '../../shared/config';
import type { SessionStore } from '../../shared/session';
import { parseBody } from '../../shared/validation';
import type { IdentityService } from './service';

export interface IdentityRoutesDeps {
  service: IdentityService;
  sessions: SessionStore;
  auth: AuthHelpers;
  config: Pick<
    AppConfig,
    'SESSION_COOKIE_NAME' | 'SESSION_TTL_SECONDS' | 'cookieSecure' | 'NODE_ENV' | 'isProduction'
  >;
}

export function identityRoutes(deps: IdentityRoutesDeps) {
  const { service, sessions, auth, config } = deps;

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

    app.post('/auth/register', { config: authRateLimit }, async (request, reply) => {
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

    // --- E-mail (D4): weryfikacja adresu i reset hasła (za flagą) -----------
    app.post('/auth/verify-email', { config: authRateLimit }, async (request, reply) => {
      const input = parseBody(verifyEmailInputSchema, request.body);
      return reply.send(await service.verifyEmail(input.token));
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
