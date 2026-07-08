'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

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
        await apiFetch(`/posts/${postId}/comments`, {
          method: 'POST',
          body: JSON.stringify({
            body: form.get('body'),
            ...(parentId ? { parentId } : {}),
          }),
        });
        el.reset();
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
      } finally {
        setPending(false);
      }
    })();
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: parentId ? '0.5rem' : '1rem' }}>
      {error && <div className="error-box">{error}</div>}
      <div className="field">
        <textarea
          name="body"
          required
          minLength={1}
          maxLength={5000}
          placeholder={parentId ? 'Odpowiedz…' : 'Dodaj komentarz…'}
        />
      </div>
      <button className="btn secondary" type="submit" disabled={pending}>
        {pending ? '…' : parentId ? 'Odpowiedz' : 'Skomentuj'}
      </button>
    </form>
  );
}
