'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

export function AskQuestionForm({ groupId }: { groupId: string }) {
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
        const res = await apiFetch<{ id: string }>(`/groups/${groupId}/threads`, {
          method: 'POST',
          body: JSON.stringify({ title: form.get('title'), body: form.get('body') }),
        });
        el.reset();
        router.push(`/watki/${res.id}`);
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
      } finally {
        setPending(false);
      }
    })();
  }

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <h3>Zadaj pytanie</h3>
      {error && <div className="error-box">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="title">Tytuł pytania</label>
          <input id="title" name="title" required minLength={5} maxLength={200} />
        </div>
        <div className="field">
          <label htmlFor="body">Treść</label>
          <textarea id="body" name="body" required minLength={10} maxLength={10000} />
        </div>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? 'Wysyłanie…' : 'Opublikuj pytanie'}
        </button>
      </form>
    </div>
  );
}
