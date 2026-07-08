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

export function JoinLeaveButton({
  groupId,
  membershipStatus,
}: {
  groupId: string;
  membershipStatus: 'ACTIVE' | 'PENDING' | 'BANNED' | null;
}) {
  const { run, error, pending } = useAction();

  if (membershipStatus === 'ACTIVE') {
    return (
      <span>
        <button
          className="btn secondary"
          disabled={pending}
          onClick={() => void run(() => apiFetch(`/groups/${groupId}/leave`, { method: 'POST' }))}
        >
          {pending ? '…' : 'Opuść grupę'}
        </button>
        {error && <span className="error-box">{error}</span>}
      </span>
    );
  }
  if (membershipStatus === 'PENDING') {
    return <span className="badge">Prośba oczekuje na akceptację</span>;
  }
  return (
    <span>
      <button
        className="btn"
        disabled={pending}
        onClick={() => void run(() => apiFetch(`/groups/${groupId}/join`, { method: 'POST' }))}
      >
        {pending ? '…' : 'Dołącz do grupy'}
      </button>
      {error && <span className="error-box">{error}</span>}
    </span>
  );
}

export function PostForm({ groupId }: { groupId: string }) {
  const { run, error, pending } = useAction();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const el = event.currentTarget;
    void run(async () => {
      await apiFetch(`/groups/${groupId}/posts`, {
        method: 'POST',
        body: JSON.stringify({
          type: form.get('type'),
          title: form.get('title'),
          body: form.get('body'),
        }),
      });
      el.reset();
    });
  }

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <h3>Opublikuj w grupie</h3>
      {error && <div className="error-box">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="type">Typ</label>
          <select id="type" name="type" defaultValue="DISCUSSION">
            <option value="DISCUSSION">Dyskusja</option>
            <option value="CASE_STUDY">Case study</option>
            <option value="IDEA">Pomysł</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="title">Tytuł</label>
          <input id="title" name="title" required minLength={5} maxLength={140} />
        </div>
        <div className="field">
          <label htmlFor="body">Treść</label>
          <textarea id="body" name="body" required minLength={10} maxLength={20000} />
        </div>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? 'Publikowanie…' : 'Opublikuj'}
        </button>
      </form>
    </div>
  );
}

export function ReactButton({
  postId,
  reacted,
  count,
}: {
  postId: string;
  reacted: boolean;
  count: number;
}) {
  const { run, pending } = useAction();
  return (
    <button
      className={reacted ? 'btn' : 'btn secondary'}
      disabled={pending}
      onClick={() =>
        void run(() => apiFetch(`/posts/${postId}/react`, { method: reacted ? 'DELETE' : 'POST' }))
      }
    >
      👏 Doceniam ({count})
    </button>
  );
}

export function ApproveButton({ membershipId }: { membershipId: string }) {
  const { run, error, pending } = useAction();
  return (
    <span>
      <button
        className="btn secondary"
        disabled={pending}
        onClick={() =>
          void run(() => apiFetch(`/memberships/${membershipId}/approve`, { method: 'POST' }))
        }
      >
        {pending ? '…' : 'Akceptuj'}
      </button>
      {error && <span className="error-box">{error}</span>}
    </span>
  );
}
