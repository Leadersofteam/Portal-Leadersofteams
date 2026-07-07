import type { SessionUser } from '@lot/contracts';
import type { FastifyRequest } from 'fastify';

import type { AppConfig } from './config';
import { ForbiddenError, UnauthorizedError } from './errors';
import type { SessionStore } from './session';

export interface AuthHelpers {
  currentUser(request: FastifyRequest): Promise<SessionUser | null>;
  requireUser(request: FastifyRequest): Promise<SessionUser>;
  requireRole(request: FastifyRequest, roles: Array<SessionUser['role']>): Promise<SessionUser>;
}

export function createAuthHelpers(
  sessions: SessionStore,
  config: Pick<AppConfig, 'SESSION_COOKIE_NAME'>,
): AuthHelpers {
  async function currentUser(request: FastifyRequest): Promise<SessionUser | null> {
    const sessionId = request.cookies[config.SESSION_COOKIE_NAME];
    return sessionId ? sessions.get(sessionId) : null;
  }

  async function requireUser(request: FastifyRequest) {
    const user = await currentUser(request);
    if (!user) throw new UnauthorizedError();
    return user;
  }

  return {
    currentUser,
    requireUser,
    async requireRole(request, roles) {
      const user = await requireUser(request);
      if (!roles.includes(user.role)) {
        throw new ForbiddenError('INSUFFICIENT_ROLE', 'Wymagane uprawnienia moderatora');
      }
      return user;
    },
  };
}
