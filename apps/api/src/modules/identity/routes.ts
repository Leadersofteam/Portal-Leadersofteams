import { createCompanyInputSchema, loginInputSchema, registerInputSchema } from '@lot/contracts';
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
  config: Pick<AppConfig, 'SESSION_COOKIE_NAME' | 'SESSION_TTL_SECONDS' | 'cookieSecure'>;
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
    const authRateLimit = {
      rateLimit: { max: 10, timeWindow: '1 minute' },
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
  };
}
