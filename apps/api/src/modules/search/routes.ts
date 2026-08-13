import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { parseBody } from '../../shared/validation';
import type { SearchScope, SearchService } from './service';

export interface SearchRoutesDeps {
  search: SearchService;
  isTest: boolean;
}

const searchQuerySchema = z.object({
  q: z.string().min(1).max(120),
  scope: z.enum(['all', 'listings', 'leaders', 'orders', 'posts', 'threads']).default('all'),
});

export function searchRoutes({ search, isTest }: SearchRoutesDeps) {
  return async function plugin(app: FastifyInstance) {
    app.get(
      '/search',
      {
        // Najdroższy endpoint w Portalu (do pięciu zapytań FULLTEXT na żądanie)
        // na VPS współdzielonym z inną aplikacją — limit jest tu elementem
        // architektury, nie ozdobą. W testach zdjęty, jak reszta limitów.
        config: { rateLimit: { max: isTest ? 10_000 : 60, timeWindow: '1 minute' } },
      },
      async (request, reply) => {
        const { q, scope } = parseBody(searchQuerySchema, request.query);
        return reply.send(await search.search(q, scope as SearchScope));
      },
    );
  };
}
