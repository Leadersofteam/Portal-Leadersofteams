import Link from 'next/link';
import { redirect } from 'next/navigation';

import { serverApi } from '@/lib/server-api';

interface AnalyticsSummary {
  days: Array<{ day: string; views: number; counts: Record<string, number> }>;
  labels: Array<{ key: string; label: string }>;
  topPaths: Array<{ path: string; views: number }>;
}

export const metadata = { title: 'Ruch — Leaders of Teams' };

// Panel jest świadomie SUROWY. To narzędzie do patrzenia, a nie dashboard:
// żadnych wykresów, żadnych wskaźników wzrostu, żadnego porównania „vs. wczoraj".
// Przy pierwszych dwudziestu osobach liczby są tak małe, że każda wizualizacja
// dorobiłaby im dramaturgię, której nie mają (ADR-010 — nie gonimy metryk).
export default async function AnalyticsPage() {
  const me = await serverApi<{ user: { role: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');
  if (!['MODERATOR', 'ADMIN'].includes(me.user.role)) redirect('/panel');

  const data = await serverApi<AnalyticsSummary>('/analytics/summary?days=14');
  const days = data?.days ?? [];
  const labels = data?.labels ?? [];
  const topPaths = data?.topPaths ?? [];

  // Od najnowszej doby — pierwsze pytanie brzmi „co było wczoraj", nie „co było
  // dwa tygodnie temu".
  const rows = [...days].reverse();
  const totalViews = days.reduce((sum, d) => sum + d.views, 0);

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/panel">← Panel</Link>
      </div>
      <h1>Ruch — ostatnie 14 dni</h1>
      <p className="muted">
        Liczby zbierane u nas, bez cookies, bez zewnętrznej analityki i bez danych pozwalających
        wskazać osobę — zgodnie z naszą <Link href="/prywatnosc">polityką prywatności</Link>.
        Odsłony są poglądowe: nie odróżniamy powracającego czytelnika od nowego i nie liczymy
        unikalnych użytkowników.
      </p>

      {totalViews === 0 && (
        <div className="card">
          <h3>Jeszcze nic tu nie ma</h3>
          <p className="muted">
            Zliczanie działa od wdrożenia S12 — dane pojawią się po pierwszych wejściach. Pusta
            tabela dziś nie znaczy, że licznik nie działa; znaczy, że nikt jeszcze nie wszedł.
          </p>
        </div>
      )}

      {/* PD4 (dług z PD3): 2 + N kolumn zdarzeń nie mieści się na 390 px —
          na telefonie doba jest kartą z odsłonami-bohaterem, a zdarzenia
          jedną linią (tylko niezerowe — zero w każdej rubryce to szum,
          nie informacja). Wzorzec .rung-cards z /drabinki, pilnowany przez
          e2e mobile-shell. */}
      <div className="day-cards">
        {rows.map((row) => {
          const nonZero = labels
            .map((l) => ({ label: l.label, n: row.counts[l.key] ?? 0 }))
            .filter((c) => c.n > 0);
          return (
            <div className="day-card" key={row.day}>
              <p className="day-card-date">{row.day}</p>
              <p className="day-card-views" aria-label={`Odsłony: ${row.views}`}>
                {row.views}
              </p>
              <p className="day-card-counts">
                {nonZero.length === 0
                  ? 'Bez zdarzeń'
                  : nonZero.map((c) => `${c.label}: ${c.n}`).join(' · ')}
              </p>
            </div>
          );
        })}
      </div>

      <div className="table-wrap desktop-only">
        <table>
          <thead>
            <tr>
              <th>Doba (UTC)</th>
              <th>Odsłony</th>
              {labels.map((l) => (
                <th key={l.key}>{l.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.day}>
                <td>{row.day}</td>
                <td>{row.views}</td>
                {labels.map((l) => (
                  <td key={l.key}>{row.counts[l.key] ?? 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Najczęściej otwierane ścieżki (14 dni)</h2>
      <p className="muted">
        Identyfikatory treści są sprowadzone do <code>:id</code>, a adresy spoza portalu do{' '}
        <code>/inne</code> — do odpowiedzi „gdzie ludzie odpadają" nie jest potrzebne, KTO co
        otworzył.
      </p>
      {topPaths.length === 0 ? (
        <p className="muted">Brak danych.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ścieżka</th>
                <th>Odsłony</th>
              </tr>
            </thead>
            <tbody>
              {topPaths.map((p) => (
                <tr key={p.path}>
                  <td>{p.path}</td>
                  <td>{p.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
