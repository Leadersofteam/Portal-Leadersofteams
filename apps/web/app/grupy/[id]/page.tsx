import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { GROUP_TYPE_LABELS, POST_TYPE_LABELS } from '@/lib/labels';
import { BookmarkButton } from '@/components/bookmark-button';
import { MentionText } from '@/components/mention-text';
import { PostMedia } from '@/components/post-media';
import { serverApi } from '@/lib/server-api';

import {
  ApproveButton,
  JoinLeaveButton,
  MemberRoleActions,
  PostForm,
  ReactButton,
} from './group-actions';

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
  viewerBookmarked: boolean;
  pinned: boolean;
  createdAt: string;
}

interface PendingMember {
  membershipId: string;
  userId: string;
  displayName: string;
}

interface GroupMember {
  membershipId: string;
  userId: string;
  displayName: string;
  handle: string | null;
  role: 'MEMBER' | 'MODERATOR';
  status: 'ACTIVE' | 'PENDING' | 'BANNED';
  isSelf: boolean;
}

// Karta postu w grupie — jedna definicja dla przypiętego i dla listy.
// Dwie kopie rozjechałyby się przy pierwszej zmianie, a przypięty post ma
// wyglądać dokładnie tak samo jak każdy inny; różnicą jest MIEJSCE, nie wygląd.
function PostCard({
  post,
  groupId,
  canParticipate,
}: {
  post: FeedPost;
  groupId: string;
  canParticipate: boolean;
}) {
  return (
    <article className="card mt-2">
      <span className="badge">{POST_TYPE_LABELS[post.type] ?? post.type}</span>
      {post.pinned && <span className="badge">📌 Przypięte</span>}
      <h3>
        <Link href={`/grupy/${groupId}/post/${post.id}`}>{post.title}</Link>
      </h3>
      <div className="meta">{post.authorName}</div>
      <p className="description">
        <MentionText>
          {post.body.length > 280 ? `${post.body.slice(0, 280)}…` : post.body}
        </MentionText>
        <PostMedia fileIds={post.imageFileIds ?? []} alt={`Obraz — ${post.title}`} />
      </p>
      <div className="actions-row">
        {canParticipate ? (
          <ReactButton postId={post.id} reacted={post.viewerReacted} count={post.reactionsCount} />
        ) : (
          <span className="badge">👏 {post.reactionsCount}</span>
        )}
        <BookmarkButton
          subjectType="POST"
          subjectId={post.id}
          initialActive={post.viewerBookmarked}
        />
        <Link className="btn secondary" href={`/grupy/${groupId}/post/${post.id}`}>
          Komentarze ({post.commentsCount})
        </Link>
      </div>
    </article>
  );
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
    serverApi<{ pinned: FeedPost | null; posts: FeedPost[]; nextCursor: string | null }>(
      `/groups/${id}/feed?${cursor ? `cursor=${cursor}` : ''}`,
    ),
  ]);
  if (!detail) notFound();

  const { group, viewer } = detail;
  const isModerator = viewer.role === 'MODERATOR' && viewer.membershipStatus === 'ACTIVE';
  // Skład grupy i prośby o dołączenie widzi WYŁĄCZNIE moderator — publiczna
  // lista nazwisk to dane o ludziach, nie treść (na zewnątrz idzie sama liczba).
  const [pending, members] = isModerator
    ? await Promise.all([
        serverApi<{ pending: PendingMember[] }>(`/groups/${id}/members/pending`),
        serverApi<{ members: GroupMember[] }>(`/groups/${id}/members`),
      ])
    : [null, null];

  const posts = feed?.posts ?? [];
  const pinned = feed?.pinned ?? null;
  const isActiveMember = viewer.membershipStatus === 'ACTIVE';

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

      {isModerator && members?.members && members.members.length > 0 && (
        <section className="card mt-2">
          <h3>Skład grupy ({members.members.length})</h3>
          <p className="muted">
            Moderator grupy jest pierwszą linią: przypina wątek powitalny, ukrywa treści i decyduje
            o składzie. Poważniejsze sprawy zgłaszamy moderacji Portalu.
          </p>
          {members.members.map((m) => (
            <div key={m.membershipId} className="list-row">
              <span>
                {m.handle ? (
                  <Link href={`/profil/${m.handle}`}>{m.displayName}</Link>
                ) : (
                  m.displayName
                )}
                {m.role === 'MODERATOR' && <span className="badge ml-1">Moderator</span>}
                {m.isSelf && <span className="muted"> — to Ty</span>}
              </span>
              <MemberRoleActions
                membershipId={m.membershipId}
                role={m.role}
                status={m.status}
                isSelf={m.isSelf}
              />
            </div>
          ))}
        </section>
      )}

      {/* Przypięte STOI NAD kompozytorem: „zacznij tutaj" ma zostać przeczytane
          zanim ktoś zacznie pisać, a nie dopiero pod formularzem publikacji. */}
      {pinned && (
        <section className="mt-4">
          <h2>Przypięte</h2>
          <PostCard post={pinned} groupId={group.id} canParticipate={isActiveMember} />
        </section>
      )}

      {viewer.membershipStatus === 'ACTIVE' && <PostForm groupId={group.id} />}

      <h2 className="mt-4">Aktualności</h2>
      {posts.length === 0 ? (
        <p className="muted">
          {pinned
            ? 'Poza przypiętym wątkiem nie ma tu jeszcze nic nowego.'
            : 'W tej grupie nie ma jeszcze postów.'}
        </p>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} groupId={group.id} canParticipate={isActiveMember} />
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
