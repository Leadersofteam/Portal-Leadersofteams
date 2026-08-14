'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

// Akcje na WŁASNYCH treściach (S4): edycja i usunięcie (soft delete).
export function OwnPostActions({
  postId,
  groupId,
  title,
  body,
}: {
  postId: string;
  groupId: string;
  title: string;
  body: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: form.get('title'), body: form.get('body') }),
      });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!window.confirm('Usunąć ten wpis? Tej operacji nie można cofnąć.')) return;
    setPending(true);
    try {
      await apiFetch(`/posts/${postId}`, { method: 'DELETE' });
      router.push(`/grupy/${groupId}`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
      setPending(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={onSave} className="card mt-2">
        {error && <div className="error-box">{error}</div>}
        <div className="field">
          <label htmlFor="edit-title">Tytuł</label>
          <input
            id="edit-title"
            name="title"
            required
            minLength={5}
            maxLength={140}
            defaultValue={title}
          />
        </div>
        <div className="field">
          <label htmlFor="edit-body">Treść</label>
          <textarea
            id="edit-body"
            name="body"
            required
            minLength={10}
            maxLength={20000}
            defaultValue={body}
          />
        </div>
        <div className="actions-row" style={{ margin: 0 }}>
          <button className="btn" type="submit" disabled={pending}>
            {pending ? 'Zapisywanie…' : 'Zapisz'}
          </button>
          <button className="btn secondary" type="button" onClick={() => setEditing(false)}>
            Anuluj
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="actions-row" style={{ margin: '0.5rem 0 0' }}>
      {error && <span className="badge warning">{error}</span>}
      <button
        className="btn secondary"
        type="button"
        disabled={pending}
        onClick={() => setEditing(true)}
      >
        Edytuj
      </button>
      <button
        className="btn secondary"
        type="button"
        disabled={pending}
        onClick={() => void onDelete()}
      >
        Usuń
      </button>
    </div>
  );
}

export function OwnCommentDelete({ commentId }: { commentId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (!window.confirm('Usunąć komentarz?')) return;
    setPending(true);
    try {
      await apiFetch(`/comments/${commentId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      className="btn secondary"
      type="button"
      style={{ padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}
      disabled={pending}
      onClick={() => void onDelete()}
    >
      Usuń
    </button>
  );
}
