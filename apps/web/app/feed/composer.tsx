'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

const MAX = 600;

/**
 * Kompozytor wpisu portalowego.
 *
 * Świadomie bez optimistic UI: feed jest chronologiczny i ma być prawdziwy —
 * wpis pojawia się dopiero, gdy naprawdę istnieje. Licznik znaków ostrzega
 * dopiero na ostatniej setce, żeby nie popędzać piszącego od pierwszej litery.
 */
export function Composer() {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const left = MAX - body.length;
  const canSubmit = body.trim().length > 0 && left >= 0 && !pending;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setPending(true);
    try {
      await apiFetch('/social/posts', { method: 'POST', body: JSON.stringify({ body }) });
      setBody('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Nie udało się opublikować wpisu.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="composer" onSubmit={onSubmit} id="composer">
      {error && <div className="error-box">{error}</div>}
      <label className="sr-only" htmlFor="composer-body">
        Treść wpisu
      </label>
      <textarea
        id="composer-body"
        name="body"
        rows={3}
        maxLength={MAX}
        placeholder="Co dziś zbudowałeś, czego się nauczyłeś, w czym możesz pomóc?"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="composer-foot">
        <span className={left <= 100 ? 'composer-count low' : 'composer-count'}>
          {left <= 100 ? `${left} znaków` : 'do 600 znaków'}
        </span>
        <button className="btn" type="submit" disabled={!canSubmit}>
          {pending ? 'Publikowanie…' : 'Opublikuj'}
        </button>
      </div>
    </form>
  );
}
