import type { SessionUser } from '@lot/contracts';
import type { FastifyRequest } from 'fastify';

import type { AppConfig } from './config';
import { UnauthorizedError } from './errors';
import type { SessionStore } from './session';

export interface AuthHelpers {
  currentUser(request: FastifyRequest): Promise<SessionUser | null>;
  requireUser(request: FastifyRequest): Promise<SessionUser>;
}

export function createAuthHelpers(
  sessions: SessionStore,
  config: Pick<AppConfig, 'SESSION_COOKIE_NAME'>,
): AuthHelpers {
  async function currentUser(request: FastifyRequest): Promise<SessionUser | null> {
    const sessionId = request.cookies[config.SESSION_COOKIE_NAME];
    return sessionId ? sessions.get(sessionId) : null;
  }

  return {
    currentUser,
    async requireUser(request) {
      const user = await currentUser(request);
      if (!user) throw new UnauthorizedError();
      return user;
    },
  };
}
