import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ReportButton } from '@/components/report-button';
import { THREAD_STATUS_LABELS } from '@/lib/labels';
import { serverApi } from '@/lib/server-api';

import { AcceptButton, AnswerForm, VoteButton } from './thread-actions';

interface ThreadDetail {
  thread: {
    id: string;
    groupId: string;
    title: string;
    body: string;
    status: string;
    authorUserId: string;
    authorName: string;
    acceptedAnswerId: string | null;
    createdAt: string;
  };
  answers: Array<{
    id: string;
    body: string;
    authorName: string;
    isAccepted: boolean;
    votesCount: number;
    viewerVoted: boolean;
    isOwn: boolean;
    createdAt: string;
  }>;
}

export const metadata = { title: 'Wątek Q&A — Leaders of Teams' };

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [me, data] = await Promise.all([
    serverApi<{ user: { id: string } | null }>('/auth/me'),
    serverApi<ThreadDetail>(`/threads/${id}`),
  ]);
  if (!data) notFound();

  const { thread, answers } = data;
  const group = await serverApi<{
    viewer: { membershipStatus: 'ACTIVE' | 'PENDING' | 'BANNED' | null };
  }>(`/groups/${thread.groupId}`);
  const isMember = group?.viewer.membershipStatus === 'ACTIVE';
  const isAuthor = Boolean(me?.user && me.user.id === thread.authorUserId);
  const isOpen = thread.status !== 'CLOSED';

  return (
    <main>
      <p className="breadcrumbs">
        <Link href={`/grupy/${thread.groupId}/pytania`}>← Pytania grupy</Link>
      </p>
      <span className="badge">{THREAD_STATUS_LABELS[thread.status] ?? thread.status}</span>
      <h1>{thread.title}</h1>
      <div className="meta">
        {thread.authorName} · {new Date(thread.createdAt).toLocaleDateString('pl-PL')}
      </div>
      <p className="description">{thread.body}</p>
      {me?.user && !isAuthor && (
        <div className="actions-row">
          <ReportButton subjectType="THREAD" subjectId={thread.id} />
        </div>
      )}

      <h2 style={{ marginTop: '2rem' }}>Odpowiedzi ({answers.length})</h2>
      {answers.length === 0 ? (
        <p className="muted">Brak odpowiedzi. Pomóż i zdobądź punkty w Drabince.</p>
      ) : (
        answers.map((a) => (
          <article
            key={a.id}
            className="card"
            style={{ marginTop: '1rem', borderColor: a.isAccepted ? 'var(--accent)' : undefined }}
          >
            {a.isAccepted && <span className="badge">✓ Zaakceptowana</span>}
            <p className="description">{a.body}</p>
            <div className="meta">
              {a.authorName} · {new Date(a.createdAt).toLocaleDateString('pl-PL')}
            </div>
            <div className="actions-row">
              {isMember && !a.isOwn ? (
                <VoteButton answerId={a.id} voted={a.viewerVoted} count={a.votesCount} />
              ) : (
                <span className="badge">👏 {a.votesCount}</span>
              )}
              {isAuthor && !a.isOwn && !a.isAccepted && isOpen && <AcceptButton answerId={a.id} />}
            </div>
          </article>
        ))
      )}

      {isMember && isOpen && !isAuthor && <AnswerForm threadId={thread.id} />}
      {isAuthor && (
        <p className="muted" style={{ marginTop: '1.5rem' }}>
          Zaakceptuj najlepszą odpowiedź — nagrodzisz pomoc punktami w Drabince (nie możesz
          akceptować własnej).
        </p>
      )}
    </main>
  );
}
