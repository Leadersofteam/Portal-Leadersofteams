// Moduł analytics (S12) — „czy ktokolwiek tu wszedł i czy cokolwiek zrobił".
//
// Wzorzec jak `search`: moduł KOMPONUJE publiczne API innych modułów i nie
// dotyka ich tabel (ADR-002). Odsłony czyta z Redisa (shared/analytics.ts),
// liczby dobowe bierze od modułów, które są właścicielami swoich danych.
//
// 0 zł (ADR-009): zero zewnętrznych usług, zero skryptów w przeglądarce.
// ADR-010: to narzędzie do PATRZENIA, nie do napędzania zaangażowania —
// nie liczy streaków, nie liczy wyświetleń pojedynczej treści i nie trafia
// przed oczy użytkowników, tylko moderatora.
import { dayKey, readViews } from '../../shared/analytics';
import type { Redis } from '../../shared/redis';

export interface AnalyticsCountSource {
  /** Klucz techniczny (stabilny) — używany w odpowiedzi API. */
  key: string;
  /** Etykieta po polsku — do tabeli w panelu. */
  label: string;
  countCreatedBetween(from: Date, to: Date): Promise<number>;
}

export interface AnalyticsDeps {
  redis: Redis;
  sources: AnalyticsCountSource[];
}

export interface AnalyticsDay {
  day: string;
  views: number;
  counts: Record<string, number>;
}

export interface AnalyticsSummary {
  days: AnalyticsDay[];
  labels: Array<{ key: string; label: string }>;
  /** Ścieżki z ostatnich `days` dób, malejąco. */
  topPaths: Array<{ path: string; views: number }>;
}

const DEFAULT_DAYS = 14;
const TOP_PATHS_LIMIT = 20;

export function createAnalyticsService({ redis, sources }: AnalyticsDeps) {
  return {
    async summary(days = DEFAULT_DAYS, now = new Date()): Promise<AnalyticsSummary> {
      const dayList: string[] = [];
      const ranges: Array<{ from: Date; to: Date }> = [];
      for (let i = days - 1; i >= 0; i -= 1) {
        const from = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i),
        );
        const to = new Date(from.getTime() + 86_400_000);
        dayList.push(dayKey(from));
        ranges.push({ from, to });
      }

      // Odsłony: jeden odczyt hasha na dobę. Liczby: jedno zapytanie na źródło
      // i dobę — przy 14 dobach i 5 źródłach to 70 tanich COUNT-ów z indeksem,
      // odpalanych wyłącznie gdy moderator otworzy panel.
      const viewsPerDay = await Promise.all(dayList.map((day) => readViews(redis, day)));
      const countsPerSource = await Promise.all(
        sources.map(async (source) => ({
          key: source.key,
          values: await Promise.all(
            ranges.map((range) => source.countCreatedBetween(range.from, range.to)),
          ),
        })),
      );

      const totals = new Map<string, number>();
      const resultDays: AnalyticsDay[] = dayList.map((day, index) => {
        const views = viewsPerDay[index] ?? {};
        for (const [path, count] of Object.entries(views)) {
          totals.set(path, (totals.get(path) ?? 0) + count);
        }
        const counts: Record<string, number> = {};
        for (const source of countsPerSource) counts[source.key] = source.values[index] ?? 0;
        return {
          day,
          views: Object.values(views).reduce((sum, n) => sum + n, 0),
          counts,
        };
      });

      const topPaths = [...totals.entries()]
        .map(([path, views]) => ({ path, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, TOP_PATHS_LIMIT);

      return {
        days: resultDays,
        labels: sources.map((s) => ({ key: s.key, label: s.label })),
        topPaths,
      };
    },
  };
}

export type AnalyticsService = ReturnType<typeof createAnalyticsService>;
