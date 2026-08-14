'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

// Komentarz pod wpisem portalowym. Wzorzec z grup, ale trasa własna modułu
// social (/social/posts/... — /posts/:id należy do grup).
export function CommentForm({ postId, parentId }: { postId: string; parentId?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const el = event.currentTarget;
    setError(null);
    setPending(true);
    void (async () => {
      try {
        await apiFetch(`/social/posts/${postId}/comments`, {
          method: 'POST',
          body: JSON.stringify({
            body: form.get('body'),
            ...(parentId ? { parentId } : {}),
          }),
        });
        el.reset();
        router.refresh();
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 401) {
          router.push('/logowanie');
          return;
        }
        setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
      } finally {
        setPending(false);
      }
    })();
  }

  return (
    <form onSubmit={onSubmit} className={parentId ? 'comment-form nested' : 'comment-form'}>
      {error && <div className="error-box">{error}</div>}
      <div className="field">
        <label className="sr-only" htmlFor={`c-${parentId ?? postId}`}>
          {parentId ? 'Odpowiedź' : 'Komentarz'}
        </label>
        <textarea
          id={`c-${parentId ?? postId}`}
          name="body"
          required
          minLength={1}
          maxLength={2000}
          rows={2}
          placeholder={parentId ? 'Odpowiedz…' : 'Dodaj komentarz…'}
        />
      </div>
      <button className="btn secondary" type="submit" disabled={pending}>
        {pending ? '…' : parentId ? 'Odpowiedz' : 'Skomentuj'}
      </button>
    </form>
  );
}
