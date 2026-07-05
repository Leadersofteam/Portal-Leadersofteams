import { createCompanyInputSchema, loginInputSchema, registerInputSchema } from '@lot/contracts';
import type { SessionUser } from '@lot/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodSchema } from 'zod';

import type { AppConfig } from '../../shared/config';
import { UnauthorizedError } from '../../shared/errors';
import type { SessionStore } from '../../shared/session';
import type { IdentityService } from './service';

export interface IdentityRoutesDeps {
  service: IdentityService;
  sessions: SessionStore;
  config: Pick<AppConfig, 'SESSION_COOKIE_NAME' | 'SESSION_TTL_SECONDS' | 'cookieSecure'>;
}

function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const err = new Error('Nieprawidłowe dane wejściowe') as Error & {
      statusCode: number;
      code: string;
      details: unknown;
    };
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    err.details = parsed.error.flatten();
    throw err;
  }
  return parsed.data;
}

export function identityRoutes(deps: IdentityRoutesDeps) {
  const { service, sessions, config } = deps;

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

  async function currentUser(request: FastifyRequest): Promise<SessionUser | null> {
    const sessionId = request.cookies[config.SESSION_COOKIE_NAME];
    return sessionId ? sessions.get(sessionId) : null;
  }

  async function requireUser(request: FastifyRequest): Promise<SessionUser> {
    const user = await currentUser(request);
    if (!user) throw new UnauthorizedError();
    return user;
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
      const user = await currentUser(request);
      if (!user) return reply.code(401).send({ user: null });
      return reply.send({ user });
    });

    app.post('/companies', async (request, reply) => {
      const user = await requireUser(request);
      const input = parseBody(createCompanyInputSchema, request.body);
      const company = await service.createCompany(user.id, input);
      return reply.code(201).send({ company });
    });
  };
}
