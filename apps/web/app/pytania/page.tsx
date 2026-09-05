import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/json-ld';
import { hubBreadcrumbs, hubItemList } from '@/lib/hub';
import { publicApi } from '@/lib/server-api';

// Baza wiedzy z pytań i odpowiedzi (PL4). Każdy wątek ma już QAPage JSON-LD
// (/watki/[id]) — brakowało strony WEJŚCIA, przez którą crawler i człowiek
// trafią do rozwiązanych pytań ponad podziałem na grupy. Chronologicznie
// (ADR-010); „rozwiązane" to fakt (zaakceptowana odpowiedź), nie ranking.
export const metadata: Metadata = {
  title: 'Pytania i odpowiedzi Liderów — rozwiązane wątki | Leaders of Teams',
  description:
    'Baza wiedzy z grup branżowych Leaders of Teams: pytania z zaakceptowaną odpowiedzią innego Lidera. Mentoring, który liczy się w Drabince tak samo jak praca.',
  alternates: { canonical: '/pytania' },
};

export const revalidate = 300;

interface ThreadRow {
  id: string;
  title: string;
  status: string;
  groupId: string;
  groupName: string;
  authorName: string;
  answersCount: number;
  hasAcceptedAnswer: boolean;
  createdAt: string;
}

export default async function QuestionsHub() {
  const [answered, open] = await Promise.all([
    publicApi<{ threads: ThreadRow[] }>('/threads?status=ANSWERED&limit=50').catch(() => null),
    publicApi<{ threads: ThreadRow[] }>('/threads?status=OPEN&limit=20').catch(() => null),
  ]);
  const solved = answered?.threads ?? [];
  const waiting = open?.threads ?? [];

  return (
    <main>
      <JsonLd data={hubBreadcrumbs([{ name: 'Pytania i odpowiedzi', path: '/pytania' }])} />
      {solved.length > 0 && (
        <JsonLd
          data={hubItemList(
            'Rozwiązane pytania Liderów',
            solved.map((t) => ({ name: t.title, path: `/watki/${t.id}` })),
          )}
        />
      )}
      <h1>Pytania i odpowiedzi Liderów</h1>
      <p className="muted">
        Rozwiązane wątki z grup branżowych — pytanie i odpowiedź, którą autor pytania uznał za
        pomocną. To druga droga punktów w <Link href="/droga">Drabince</Link>: mentoring liczy się
        tak samo jak praca, a uznać może tylko drugi człowiek.
      </p>

      <h2>Rozwiązane ({solved.length})</h2>
      {solved.length === 0 ? (
        <p className="muted">
          Jeszcze żadne pytanie nie ma zaakceptowanej odpowiedzi.{' '}
          <Link href="/grupy">Wejdź do grup</Link> i odpowiedz na pierwsze.
        </p>
      ) : (
        <div>
          {solved.map((t) => (
            <div key={t.id} className="list-row list-row--stack">
              <div>
                <h3>
                  <Link href={`/watki/${t.id}`}>{t.title}</Link>
                </h3>
                <div className="meta">
                  <Link href={`/grupy/${t.groupId}/pytania`}>{t.groupName}</Link> · {t.authorName} ·{' '}
                  {new Date(t.createdAt).toLocaleDateString('pl-PL')}
                </div>
              </div>
              <div className="list-row-aside">
                <span className="badge success">rozwiązane</span>{' '}
                <span className="badge">
                  {t.answersCount} {t.answersCount === 1 ? 'odpowiedź' : 'odpowiedzi'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {waiting.length > 0 && (
        <section className="mt-3">
          <h2>Czekają na odpowiedź ({waiting.length})</h2>
          <p className="muted">
            Tu zaczyna się mentoring. Odpowiedź uznana przez autora to {50} pkt w Drabince — od
            drugiego człowieka, nie od Portalu.
          </p>
          <div>
            {waiting.map((t) => (
              <div key={t.id} className="list-row list-row--stack">
                <div>
                  <h3>
                    <Link href={`/watki/${t.id}`}>{t.title}</Link>
                  </h3>
                  <div className="meta">
                    <Link href={`/grupy/${t.groupId}/pytania`}>{t.groupName}</Link> · {t.authorName}
                  </div>
                </div>
                <div className="list-row-aside">
                  <span className="badge">
                    {t.answersCount} {t.answersCount === 1 ? 'odpowiedź' : 'odpowiedzi'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
