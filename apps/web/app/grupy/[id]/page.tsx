import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { GROUP_TYPE_LABELS, POST_TYPE_LABELS } from '@/lib/labels';
import { MentionText } from '@/components/mention-text';
import { PostMedia } from '@/components/post-media';
import { serverApi } from '@/lib/server-api';

import { ApproveButton, JoinLeaveButton, PostForm, ReactButton } from './group-actions';

const getGroup = cache((id: string) => serverApi<GroupDetail>(`/groups/${id}`));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getGroup(id);
  if (!data) return { title: 'Grupa nie znaleziona' };
  const g = data.group;
  const title = `${g.name} — grupa branżowa | Leaders of Teams`;
  const description = (
    g.description ?? `Grupa branżowa ${g.name}: dyskusje, case studies i mentoring (Q&A) Liderów.`
  ).slice(0, 155);
  return {
    title,
    description,
    alternates: { canonical: `/grupy/${id}` },
    openGraph: { type: 'website', title, description, url: `/grupy/${id}` },
  };
}

interface GroupDetail {
  group: {
    id: string;
    name: string;
    description: string | null;
    type: string;
    isSystem: boolean;
    industry: { id: string; name: string } | null;
    membersCount: number;
    postsCount: number;
  };
  viewer: { membershipStatus: 'ACTIVE' | 'PENDING' | 'BANNED' | null; role: string | null };
}

interface FeedPost {
  id: string;
  type: string;
  title: string;
  body: string;
  imageFileIds: string[];
  authorName: string;
  commentsCount: number;
  reactionsCount: number;
  viewerReacted: boolean;
  createdAt: string;
}

interface PendingMember {
  membershipId: string;
  userId: string;
  displayName: string;
}

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const cursor = typeof sp.cursor === 'string' ? sp.cursor : '';

  const [detail, feed] = await Promise.all([
    serverApi<GroupDetail>(`/groups/${id}`),
    serverApi<{ posts: FeedPost[]; nextCursor: string | null }>(
      `/groups/${id}/feed?${cursor ? `cursor=${cursor}` : ''}`,
    ),
  ]);
  if (!detail) notFound();

  const { group, viewer } = detail;
  const isModerator = viewer.role === 'MODERATOR' && viewer.membershipStatus === 'ACTIVE';
  const pending = isModerator
    ? await serverApi<{ pending: PendingMember[] }>(`/groups/${id}/members/pending`)
    : null;

  const posts = feed?.posts ?? [];

  return (
    <main>
      <p className="breadcrumbs">
        <Link href="/grupy">← Grupy</Link>
      </p>
      <div className="list-row">
        <div>
          <h1>{group.name}</h1>
          <div className="meta">
            {group.industry ? `${group.industry.name} · ` : ''}
            {GROUP_TYPE_LABELS[group.type] ?? group.type} · {group.membersCount} członków
          </div>
        </div>
        <JoinLeaveButton groupId={group.id} membershipStatus={viewer.membershipStatus} />
      </div>
      {group.description && <p className="description">{group.description}</p>}

      <nav className="actions-row mt-1">
        <span className="badge">Aktualności</span>
        <Link className="btn secondary" href={`/grupy/${group.id}/pytania`}>
          Pytania (Q&amp;A) — mentoring →
        </Link>
      </nav>

      {isModerator && pending?.pending && pending.pending.length > 0 && (
        <section className="card mt-2">
          <h3>Prośby o dołączenie ({pending.pending.length})</h3>
          {pending.pending.map((p) => (
            <div key={p.membershipId} className="list-row">
              <span>{p.displayName}</span>
              <ApproveButton membershipId={p.membershipId} />
            </div>
          ))}
        </section>
      )}

      {viewer.membershipStatus === 'ACTIVE' && <PostForm groupId={group.id} />}

      <h2 className="mt-4">Aktualności</h2>
      {posts.length === 0 ? (
        <p className="muted">W tej grupie nie ma jeszcze postów.</p>
      ) : (
        posts.map((post) => (
          <article key={post.id} className="card mt-2">
            <span className="badge">{POST_TYPE_LABELS[post.type] ?? post.type}</span>
            <h3>
              <Link href={`/grupy/${group.id}/post/${post.id}`}>{post.title}</Link>
            </h3>
            <div className="meta">{post.authorName}</div>
            <p className="description">
              <MentionText>
                {post.body.length > 280 ? `${post.body.slice(0, 280)}…` : post.body}
              </MentionText>
              <PostMedia fileIds={post.imageFileIds ?? []} alt={`Obraz — ${post.title}`} />
            </p>
            <div className="actions-row">
              {viewer.membershipStatus === 'ACTIVE' ? (
                <ReactButton
                  postId={post.id}
                  reacted={post.viewerReacted}
                  count={post.reactionsCount}
                />
              ) : (
                <span className="badge">👏 {post.reactionsCount}</span>
              )}
              <Link className="btn secondary" href={`/grupy/${group.id}/post/${post.id}`}>
                Komentarze ({post.commentsCount})
              </Link>
            </div>
          </article>
        ))
      )}

      {feed?.nextCursor && (
        <p className="mt-3">
          <Link className="btn secondary" href={`/grupy/${group.id}?cursor=${feed.nextCursor}`}>
            Następna strona →
          </Link>
        </p>
      )}
    </main>
  );
}
