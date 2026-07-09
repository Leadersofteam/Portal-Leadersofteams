'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setPending(true);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  return { run, error, pending };
}

export function AnswerForm({ threadId }: { threadId: string }) {
  const { run, error, pending } = useAction();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const el = event.currentTarget;
    void run(async () => {
      await apiFetch(`/threads/${threadId}/answers`, {
        method: 'POST',
        body: JSON.stringify({ body: form.get('body') }),
      });
      el.reset();
    });
  }

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <h3>Twoja odpowiedź</h3>
      {error && <div className="error-box">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="body">Treść odpowiedzi</label>
          <textarea id="body" name="body" required minLength={10} maxLength={10000} />
        </div>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? 'Wysyłanie…' : 'Odpowiedz'}
        </button>
      </form>
    </div>
  );
}

export function VoteButton({
  answerId,
  voted,
  count,
}: {
  answerId: string;
  voted: boolean;
  count: number;
}) {
  const { run, error, pending } = useAction();
  return (
    <span>
      <button
        className={voted ? 'btn' : 'btn secondary'}
        disabled={pending || voted}
        onClick={() => void run(() => apiFetch(`/answers/${answerId}/vote`, { method: 'POST' }))}
      >
        👏 Doceniam ({count})
      </button>
      {error && <span className="error-box">{error}</span>}
    </span>
  );
}

export function AcceptButton({ answerId }: { answerId: string }) {
  const { run, error, pending } = useAction();
  return (
    <span>
      <button
        className="btn"
        disabled={pending}
        onClick={() => void run(() => apiFetch(`/answers/${answerId}/accept`, { method: 'POST' }))}
      >
        {pending ? '…' : '✓ Zaakceptuj odpowiedź'}
      </button>
      {error && <span className="error-box">{error}</span>}
    </span>
  );
}
