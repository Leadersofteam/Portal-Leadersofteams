import Link from 'next/link';
import { notFound } from 'next/navigation';

import { POST_TYPE_LABELS } from '@/lib/labels';
import { serverApi } from '@/lib/server-api';

import { ReactButton } from '../../group-actions';
import { CommentForm } from './comment-form';

interface PostDetail {
  post: {
    id: string;
    groupId: string;
    type: string;
    title: string;
    body: string;
    authorName: string;
    reactionsCount: number;
    viewerReacted: boolean;
    createdAt: string;
  };
  comments: Array<{
    id: string;
    parentId: string | null;
    body: string;
    authorName: string;
    createdAt: string;
  }>;
}

interface GroupViewer {
  viewer: { membershipStatus: 'ACTIVE' | 'PENDING' | 'BANNED' | null };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string; postId: string }>;
}) {
  const { id, postId } = await params;
  const [data, group] = await Promise.all([
    serverApi<PostDetail>(`/posts/${postId}`),
    serverApi<GroupViewer>(`/groups/${id}`),
  ]);
  if (!data) notFound();

  const { post, comments } = data;
  const canParticipate = group?.viewer.membershipStatus === 'ACTIVE';
  const topLevel = comments.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, typeof comments>();
  for (const c of comments) {
    if (c.parentId) {
      const list = repliesByParent.get(c.parentId) ?? [];
      list.push(c);
      repliesByParent.set(c.parentId, list);
    }
  }

  return (
    <main>
      <p className="breadcrumbs">
        <Link href={`/grupy/${post.groupId}`}>← Powrót do grupy</Link>
      </p>

      <article className="card">
        <span className="badge">{POST_TYPE_LABELS[post.type] ?? post.type}</span>
        <h1>{post.title}</h1>
        <div className="meta">{post.authorName}</div>
        <p className="description" style={{ whiteSpace: 'pre-wrap' }}>
          {post.body}
        </p>
        <div className="actions-row">
          {canParticipate ? (
            <ReactButton
              postId={post.id}
              reacted={post.viewerReacted}
              count={post.reactionsCount}
            />
          ) : (
            <span className="badge">👏 {post.reactionsCount}</span>
          )}
        </div>
      </article>

      <h2 style={{ marginTop: '2rem' }}>Komentarze ({comments.length})</h2>
      {canParticipate && <CommentForm postId={post.id} />}

      {topLevel.length === 0 ? (
        <p className="muted">Brak komentarzy — bądź pierwszy.</p>
      ) : (
        topLevel.map((comment) => (
          <div key={comment.id} className="card" style={{ marginTop: '1rem' }}>
            <div className="meta">{comment.authorName}</div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{comment.body}</p>

            {(repliesByParent.get(comment.id) ?? []).map((reply) => (
              <div
                key={reply.id}
                style={{
                  marginLeft: '1.5rem',
                  marginTop: '0.75rem',
                  borderLeft: '2px solid #eee',
                  paddingLeft: '1rem',
                }}
              >
                <div className="meta">{reply.authorName}</div>
                <p style={{ whiteSpace: 'pre-wrap' }}>{reply.body}</p>
              </div>
            ))}

            {canParticipate && <CommentForm postId={post.id} parentId={comment.id} />}
          </div>
        ))
      )}
    </main>
  );
}
