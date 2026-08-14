import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ReportButton } from '@/components/report-button';
import { POST_TYPE_LABELS } from '@/lib/labels';
import { serverApi } from '@/lib/server-api';

import { ReactButton } from '../../group-actions';
import { CommentForm } from './comment-form';
import { OwnCommentDelete, OwnPostActions } from './own-actions';

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
    isOwn: boolean;
    editedAt: string | null;
    createdAt: string;
  };
  comments: Array<{
    id: string;
    parentId: string | null;
    body: string;
    authorName: string;
    isOwn: boolean;
    deletedAt: string | null;
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
        <p className="description">{post.body}</p>
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
          {canParticipate && <ReportButton subjectType="POST" subjectId={post.id} />}
        </div>
        {post.isOwn && (
          <OwnPostActions
            postId={post.id}
            groupId={post.groupId}
            title={post.title}
            body={post.body}
          />
        )}
        {post.editedAt && <p className="muted mt-1">(edytowano)</p>}
      </article>

      <h2 className="mt-4">Komentarze ({comments.length})</h2>
      {canParticipate && <CommentForm postId={post.id} />}

      {topLevel.length === 0 ? (
        <p className="muted">Brak komentarzy — bądź pierwszy.</p>
      ) : (
        topLevel.map((comment) => (
          <div key={comment.id} className="card mt-2">
            <div
              className="meta"
              style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}
            >
              <span>{comment.authorName}</span>
              {comment.isOwn && !comment.deletedAt && <OwnCommentDelete commentId={comment.id} />}
            </div>
            <p className="pre-wrap">{comment.body}</p>

            {(repliesByParent.get(comment.id) ?? []).map((reply) => (
              <div key={reply.id} className="comment-reply">
                <div className="meta">{reply.authorName}</div>
                <p className="pre-wrap">{reply.body}</p>
              </div>
            ))}

            {canParticipate && <CommentForm postId={post.id} parentId={comment.id} />}
          </div>
        ))
      )}
    </main>
  );
}
