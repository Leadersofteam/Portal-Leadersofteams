import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { THREAD_STATUS_LABELS } from '@/lib/labels';
import { serverApi } from '@/lib/server-api';

import { JoinLeaveButton } from '../group-actions';
import { AskQuestionForm } from './ask-question';

interface GroupDetail {
  group: { id: string; name: string };
  viewer: { membershipStatus: 'ACTIVE' | 'PENDING' | 'BANNED' | null; role: string | null };
}

interface ThreadRow {
  id: string;
  title: string;
  status: string;
  authorName: string;
  answersCount: number;
  hasAcceptedAnswer: boolean;
  createdAt: string;
}

const getGroupName = cache((id: string) => serverApi<GroupDetail>(`/groups/${id}`));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getGroupName(id);
  const name = data?.group.name ?? 'Grupa';
  const title = `Pytania i odpowiedzi — ${name} | Leaders of Teams`;
  const description = `Wątki Q&A i mentoring w grupie ${name}. Zadaj pytanie, pomóż innym Liderom i zdobywaj punkty w Drabince.`;
  return {
    title,
    description,
    alternates: { canonical: `/grupy/${id}/pytania` },
    openGraph: { type: 'website', title, description, url: `/grupy/${id}/pytania` },
  };
}

export default async function GroupThreadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const cursor = typeof sp.cursor === 'string' ? sp.cursor : '';

  const [detail, list, me] = await Promise.all([
    serverApi<GroupDetail>(`/groups/${id}`),
    serverApi<{ threads: ThreadRow[]; nextCursor: string | null }>(
      `/groups/${id}/threads?${cursor ? `cursor=${cursor}` : ''}`,
    ),
    serverApi<{ user: { id: string } | null }>('/auth/me').catch(() => null),
  ]);
  if (!detail) notFound();

  const threads = list?.threads ?? [];
  const isMember = detail.viewer.membershipStatus === 'ACTIVE';
  const isLoggedIn = Boolean(me?.user);

  return (
    <main>
      <p className="breadcrumbs">
        <Link href={`/grupy/${id}`}>← {detail.group.name}</Link>
      </p>
      <h1>Pytania i mentoring</h1>
      <p className="muted">
        Pomaganie innym to druga droga awansu w Drabince: zaakceptowana odpowiedź i docenione
        odpowiedzi dają punkty — na równi ze zleceniami.
      </p>

      {isMember && <AskQuestionForm groupId={id} />}
      {/* Nie-członek widział zachętę „Zadaj pierwsze" bez żadnej ścieżki
          wykonania (W-05) — formularz wymaga członkostwa, a przycisk dołączenia
          był tylko na stronie głównej grupy. Dajemy ścieżkę na miejscu. */}
      {!isMember && detail.viewer.membershipStatus !== 'BANNED' && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3>Chcesz zadać pytanie?</h3>
          {isLoggedIn ? (
            <>
              <p className="muted">
                Pytania i odpowiedzi są dla członków grupy — dołączenie to jedno kliknięcie.
              </p>
              <JoinLeaveButton groupId={id} membershipStatus={detail.viewer.membershipStatus} />
            </>
          ) : (
            <p className="muted">
              <Link href="/logowanie">Zaloguj się</Link>, aby dołączyć do grupy i zadać pytanie.
            </p>
          )}
        </div>
      )}

      <h2 style={{ marginTop: '2rem' }}>Wątki</h2>
      {threads.length === 0 ? (
        <p className="muted">Brak pytań w tej grupie.{isMember ? ' Zadaj pierwsze.' : ''}</p>
      ) : (
        threads.map((t) => (
          <article key={t.id} className="card" style={{ marginTop: '1rem' }}>
            <span className="badge">{THREAD_STATUS_LABELS[t.status] ?? t.status}</span>
            {t.hasAcceptedAnswer && <span className="badge">✓ rozwiązane</span>}
            <h3>
              <Link href={`/watki/${t.id}`}>{t.title}</Link>
            </h3>
            <div className="meta">
              {t.authorName} · {t.answersCount} odpowiedzi ·{' '}
              {new Date(t.createdAt).toLocaleDateString('pl-PL')}
            </div>
          </article>
        ))
      )}

      {list?.nextCursor && (
        <p style={{ marginTop: '1.5rem' }}>
          <Link className="btn secondary" href={`/grupy/${id}/pytania?cursor=${list.nextCursor}`}>
            Następna strona →
          </Link>
        </p>
      )}
    </main>
  );
}
