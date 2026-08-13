import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { AppreciateButton } from '@/components/appreciate-button';
import { MentionText } from '@/components/mention-text';
import { PostMedia } from '@/components/post-media';
import { QuotedPost } from '@/components/quoted-post';
import type { QuotedPostView } from '@/components/quoted-post';
import { ReportButton } from '@/components/report-button';
import { ShareButton } from '@/components/share-button';
import { Avatar } from '@/components/ui/avatar';
import { LevelBadge } from '@/components/ui/level-badge';
import { formatFeedTime } from '@/lib/labels';
import { serverApi } from '@/lib/server-api';

import { CommentForm } from './comment-form';
import { OwnCommentDelete, OwnPostActions } from './own-actions';

interface Person {
  id: string;
  displayName: string;
  handle: string | null;
  avatarFileId: string | null;
  level: number;
}

interface PostDetail {
  post: {
    id: string;
    body: string;
    createdAt: string;
    editedAt: string | null;
    author: Person;
    isOwn: boolean;
    appreciations: number;
    viewerAppreciated: boolean;
    imageFileIds: string[];
    quoted: QuotedPostView | null;
  };
  comments: Array<{
    id: string;
    parentId: string | null;
    body: string;
    deleted: boolean;
    createdAt: string;
    author: Person;
    isOwn: boolean;
  }>;
}

const getPost = cache((id: string) => serverApi<PostDetail>(`/social/posts/${id}`));

const clip = (s: string, n = 155) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getPost(id);
  if (!data) return { title: 'Wpis nie znaleziony' };
  const title = `${data.post.author.displayName} — wpis | Leaders of Teams`;
  const description = clip(data.post.body);
  return {
    title,
    description,
    alternates: { canonical: `/wpisy/${id}` },
    openGraph: { type: 'article', title, description, url: `/wpisy/${id}` },
  };
}

function PersonLine({ person, at }: { person: Person; at: string }) {
  return (
    <div className="feed-card-head">
      {person.handle ? (
        <Link href={`/profil/${person.handle}`}>
          <strong>{person.displayName}</strong>
        </Link>
      ) : (
        <strong>{person.displayName}</strong>
      )}
      {person.level >= 1 && <LevelBadge level={person.level} />}
      <time dateTime={at} className="feed-card-time">
        {formatFeedTime(at)}
      </time>
    </div>
  );
}

export default async function SocialPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPost(id);
  if (!data) notFound();
  const { post, comments } = data;

  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  const isLoggedIn = Boolean(me?.user);

  const roots = comments.filter((c) => !c.parentId);
  const repliesOf = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/feed">← Feed społeczności</Link>
      </div>

      <article className="feed-card feed-card--solo">
        <Avatar
          name={post.author.displayName}
          size="lg"
          src={post.author.avatarFileId ? `/api/v1/files/${post.author.avatarFileId}/thumb` : null}
        />
        <div className="feed-card-body">
          <PersonLine person={post.author} at={post.createdAt} />
          {post.body && (
            <p className="feed-post-body large">
              <MentionText>{post.body}</MentionText>
            </p>
          )}
          {post.quoted && <QuotedPost quoted={post.quoted} />}
          <PostMedia
            fileIds={post.imageFileIds}
            alt={`Obraz do wpisu — ${post.author.displayName}`}
          />
          {post.editedAt && <p className="muted feed-edited">(edytowano)</p>}

          <div className="feed-card-actions">
            <AppreciateButton
              postId={post.id}
              initialCount={post.appreciations}
              initialActive={post.viewerAppreciated}
            />
            {isLoggedIn && (
              <Link className="feed-action" href={`/feed?cytuj=${post.id}#composer`}>
                Podaj dalej
              </Link>
            )}
            <ShareButton
              url={`/wpisy/${post.id}`}
              title={`Wpis ${post.author.displayName} — Leaders of Teams`}
            />
            {isLoggedIn && !post.isOwn && (
              <ReportButton subjectType="SOCIAL_POST" subjectId={post.id} />
            )}
          </div>

          {post.isOwn && <OwnPostActions postId={post.id} body={post.body} />}
        </div>
      </article>

      <h2>{comments.length > 0 ? `Komentarze (${comments.length})` : 'Komentarze'}</h2>

      {isLoggedIn ? (
        <CommentForm postId={post.id} />
      ) : (
        <p className="muted">
          <Link href="/logowanie">Zaloguj się</Link>, żeby dołączyć do rozmowy.
        </p>
      )}

      {roots.length === 0 ? (
        <p className="muted">Nikt jeszcze nie skomentował.</p>
      ) : (
        roots.map((comment) => (
          <div key={comment.id} className="comment-block">
            <div className="feed-card">
              <Avatar
                name={comment.author.displayName}
                size="sm"
                src={
                  comment.author.avatarFileId
                    ? `/api/v1/files/${comment.author.avatarFileId}/thumb`
                    : null
                }
              />
              <div className="feed-card-body">
                <PersonLine person={comment.author} at={comment.createdAt} />
                <p className={comment.deleted ? 'muted' : 'feed-post-body'}>
                  {comment.deleted ? '[treść usunięta]' : <MentionText>{comment.body}</MentionText>}
                </p>
                {comment.isOwn && !comment.deleted && <OwnCommentDelete commentId={comment.id} />}
                {isLoggedIn && !comment.deleted && (
                  <CommentForm postId={post.id} parentId={comment.id} />
                )}
              </div>
            </div>

            {repliesOf(comment.id).map((reply) => (
              <div key={reply.id} className="feed-card comment-reply">
                <Avatar
                  name={reply.author.displayName}
                  size="sm"
                  src={
                    reply.author.avatarFileId
                      ? `/api/v1/files/${reply.author.avatarFileId}/thumb`
                      : null
                  }
                />
                <div className="feed-card-body">
                  <PersonLine person={reply.author} at={reply.createdAt} />
                  <p className={reply.deleted ? 'muted' : 'feed-post-body'}>
                    {reply.deleted ? '[treść usunięta]' : <MentionText>{reply.body}</MentionText>}
                  </p>
                  {reply.isOwn && !reply.deleted && <OwnCommentDelete commentId={reply.id} />}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </main>
  );
}
