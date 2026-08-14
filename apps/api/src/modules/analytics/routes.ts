import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { recordView } from '../../shared/analytics';
import type { AuthHelpers } from '../../shared/auth';
import type { Redis } from '../../shared/redis';
import { parseBody } from '../../shared/validation';
import type { AnalyticsService } from './service';

export interface AnalyticsRoutesDeps {
  analytics: AnalyticsService;
  redis: Redis;
  auth: AuthHelpers;
  isTest: boolean;
}

const hitInputSchema = z.object({
  // Sama ścieżka, nigdy pełny URL i nigdy query — normalizacja i tak obetnie
  // wszystko poza białą listą, ale krótszy limit ucina absurdy już na wejściu.
  path: z.string().min(1).max(512),
});

const summaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(35).default(14),
});

export function analyticsRoutes({ analytics, redis, auth, isTest }: AnalyticsRoutesDeps) {
  return async function plugin(app: FastifyInstance) {
    // Zliczenie odsłony. Woła je middleware webu przez sieć wewnętrzną compose.
    // Endpoint jest publiczny (jest też wystawiony przez Traefika), więc trzeba
    // uczciwie powiedzieć, na co się godzimy: ktoś z zewnątrz MOŻE napompować
    // licznik. Świadomie akceptujemy to ryzyko zamiast wprowadzać kolejny sekret —
    // szkoda ogranicza się do zafałszowania prywatnej statystyki, a normalizacja
    // ścieżek nie pozwala rozdąć pamięci Redisa. Liczby są poglądowe, nie audytowe.
    app.post(
      '/analytics/hit',
      { config: { rateLimit: { max: isTest ? 10_000 : 120, timeWindow: '1 minute' } } },
      async (request, reply) => {
        const { path } = parseBody(hitInputSchema, request.body);
        await recordView(redis, path);
        // 204: to licznik, nie zasób — nie ma czego zwracać, a mniejsza odpowiedź
        // to krótszy czas trzymania połączenia przy renderze strony.
        return reply.code(204).send();
      },
    );

    app.get('/analytics/summary', async (request, reply) => {
      await auth.requireRole(request, ['MODERATOR', 'ADMIN']);
      const { days } = parseBody(summaryQuerySchema, request.query);
      return reply.send(await analytics.summary(days));
    });
  };
}
