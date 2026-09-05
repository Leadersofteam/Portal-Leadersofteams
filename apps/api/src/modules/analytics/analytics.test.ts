// Pierwsze testy modułu `analytics` (S18). Do tej pory był to JEDYNY moduł bez
// ani jednego pliku testowego — a jednocześnie ten, którego wynik czyta człowiek
// i na jego podstawie decyduje, czy Portal żyje. Metryka bez testu i z fałszywym
// licznikiem jest gorsza niż brak metryki, bo wygląda na wiedzę.
//
// Świadomie JEDNOSTKOWE, bez `describe.skipIf(!hasInfra)`: suity integracyjne bez
// DATABASE_URL/REDIS_URL zielenią się przez POMINIĘCIE, więc strażnik decyzji
// architektonicznej nie może zależeć od tego, czy ktoś podniósł kontenery.
import { describe, expect, it } from 'vitest';

import type { Redis } from '../../shared/redis';
import { createAnalyticsService, type AnalyticsCountSource } from './service';

/** Atrapa Redisa: tylko `hgetall`, bo tylko tego używa `readViews`. */
function fakeRedis(hashes: Record<string, Record<string, string>>): Redis {
  return {
    hgetall: async (key: string) => hashes[key] ?? {},
  } as unknown as Redis;
}

/** Źródło liczb dobowych — atrapa modułu będącego właścicielem swoich danych. */
function fakeSource(
  key: string,
  label: string,
  perCall: number[],
): AnalyticsCountSource & { calls: number } {
  const source = {
    key,
    label,
    calls: 0,
    async countCreatedBetween() {
      const value = perCall[source.calls] ?? 0;
      source.calls += 1;
      return value;
    },
  };
  return source;
}

const NOW = new Date('2026-08-14T10:00:00.000Z');

describe('analytics.summary', () => {
  it('zwraca dokładnie tyle dób, ile poproszono, rosnąco i BEZ dziur', () => {
    // Doba bez ruchu ma być zerem, nie brakiem wiersza: wykres z dziurami
    // sugeruje awarię zbierania, a nie ciszę w portalu.
    const service = createAnalyticsService({ redis: fakeRedis({}), sources: [] });
    return service.summary(3, NOW).then((summary) => {
      expect(summary.days.map((d) => d.day)).toEqual(['2026-08-12', '2026-08-13', '2026-08-14']);
      expect(summary.days.every((d) => d.views === 0)).toBe(true);
    });
  });

  it('sumuje odsłony doby ze wszystkich ścieżek', async () => {
    const service = createAnalyticsService({
      redis: fakeRedis({
        'portal:analytics:v1:views:2026-08-14': { '/': '5', '/uslugi': '3', '/feed': '2' },
      }),
      sources: [],
    });
    const summary = await service.summary(1, NOW);
    expect(summary.days[0]?.views).toBe(10);
  });

  it('liczby rejestracji i publikacji biorą się ZE ŹRÓDEŁ, nie z licznika w Redisie', async () => {
    // To jest asercja na decyzję z S12, nie na kod: odsłony żyją w Redisie,
    // ale wszystko, co da się policzyć z bazy po `createdAt`, MA być liczone
    // z bazy. Licznik byłby drugim, gorszym źródłem prawdy — ginie przy flushu
    // i nie da się go policzyć wstecz. Atrapa źródła zwraca wartość, której
    // w hashu odsłon nie ma, więc test złapie każdą próbę pójścia na skróty.
    const registrations = fakeSource('registrations', 'Rejestracje', [7, 0]);
    const service = createAnalyticsService({
      redis: fakeRedis({ 'portal:analytics:v1:views:2026-08-13': { '/': '999' } }),
      sources: [registrations],
    });

    const summary = await service.summary(2, NOW);

    expect(summary.days[0]?.counts.registrations).toBe(7);
    expect(summary.days[1]?.counts.registrations).toBe(0);
    // Jedno zapytanie na źródło i dobę — gdyby ktoś dołożył zapytanie na
    // ścieżkę, panel zacząłby generować setki COUNT-ów przy każdym otwarciu.
    expect(registrations.calls).toBe(2);
    expect(summary.labels).toEqual([{ key: 'registrations', label: 'Rejestracje' }]);
  });

  it('każde źródło ma swój klucz w każdej dobie, także gdy zwraca zero', async () => {
    const service = createAnalyticsService({
      redis: fakeRedis({}),
      sources: [fakeSource('a', 'A', [1]), fakeSource('b', 'B', [])],
    });
    const summary = await service.summary(2, NOW);
    for (const day of summary.days) {
      expect(Object.keys(day.counts).sort()).toEqual(['a', 'b']);
    }
  });

  it('topPaths sumuje ścieżkę PRZEZ WSZYSTKIE doby i sortuje malejąco', async () => {
    const service = createAnalyticsService({
      redis: fakeRedis({
        'portal:analytics:v1:views:2026-08-13': { '/uslugi': '2', '/feed': '10' },
        'portal:analytics:v1:views:2026-08-14': { '/uslugi': '20', '/feed': '1' },
      }),
      sources: [],
    });
    const summary = await service.summary(2, NOW);
    expect(summary.topPaths).toEqual([
      { path: '/uslugi', views: 22 },
      { path: '/feed', views: 11 },
    ]);
  });

  it('topPaths jest przycięte — panel ma być czytelny, nie kompletny', async () => {
    const many: Record<string, string> = {};
    for (let i = 0; i < 30; i += 1) many[`/s${i}`] = String(i);
    const service = createAnalyticsService({
      redis: fakeRedis({ 'portal:analytics:v1:views:2026-08-14': many }),
      sources: [],
    });
    const summary = await service.summary(1, NOW);
    expect(summary.topPaths).toHaveLength(20);
    expect(summary.topPaths[0]).toEqual({ path: '/s29', views: 29 });
  });

  it('doba jest liczona w UTC — klucz odczytu musi trafić w klucz zapisu', async () => {
    // Późny wieczór czasu polskiego to już kolejna doba UTC. Rozjazd stref
    // objawiłby się „wczoraj nikt nie wszedł", a nie błędem.
    const service = createAnalyticsService({
      redis: fakeRedis({ 'portal:analytics:v1:views:2026-08-14': { '/': '1' } }),
      sources: [],
    });
    const summary = await service.summary(1, new Date('2026-08-14T23:30:00.000Z'));
    expect(summary.days[0]?.day).toBe('2026-08-14');
    expect(summary.days[0]?.views).toBe(1);
  });
});

// PL0: źródła ruchu — ta sama zasada co topPaths (suma przez doby, malejąco,
// przycięte). Osobny hash, żeby ścieżki i źródła nie mieszały się w jednej
// tabeli i żeby limit pól chronił każdy z nich z osobna.
describe('analytics.summary — źródła ruchu', () => {
  it('topSources sumuje źródło PRZEZ WSZYSTKIE doby i sortuje malejąco', async () => {
    const service = createAnalyticsService({
      redis: fakeRedis({
        'portal:analytics:v1:refs:2026-08-13': { 'google.com': '2', bezpośrednio: '10' },
        'portal:analytics:v1:refs:2026-08-14': { 'google.com': '20', 'linkedin.com': '1' },
      }),
      sources: [],
    });
    const summary = await service.summary(2, NOW);
    expect(summary.topSources).toEqual([
      { source: 'google.com', views: 22 },
      { source: 'bezpośrednio', views: 10 },
      { source: 'linkedin.com', views: 1 },
    ]);
  });

  it('bez zapisanych źródeł lista jest pusta, nie brakująca', async () => {
    const service = createAnalyticsService({ redis: fakeRedis({}), sources: [] });
    const summary = await service.summary(1, NOW);
    expect(summary.topSources).toEqual([]);
  });
});
