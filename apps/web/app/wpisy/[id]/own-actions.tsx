'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

// Akcje na WŁASNYM wpisie portalowym: edycja i usunięcie (soft delete).
export function OwnPostActions({ postId, body }: { postId: string; body: string }) {
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
      await apiFetch(`/social/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify({ body: form.get('body') }),
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
    if (!window.confirm('Usunąć ten wpis? Zniknie też z feedu obserwujących.')) return;
    setPending(true);
    try {
      await apiFetch(`/social/posts/${postId}`, { method: 'DELETE' });
      router.push('/feed');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
      setPending(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={onSave} className="mt-2">
        {error && <div className="error-box">{error}</div>}
        <div className="field">
          <label className="sr-only" htmlFor="edit-body">
            Treść wpisu
          </label>
          <textarea
            id="edit-body"
            name="body"
            required
            minLength={1}
            maxLength={600}
            rows={3}
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
      await apiFetch(`/social/comments/${commentId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      className="btn secondary comment-delete"
      type="button"
      disabled={pending}
      onClick={() => void onDelete()}
    >
      Usuń
    </button>
  );
}
