'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

export function ReviewForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch(`/orders/${orderId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating: Number(form.get('rating')),
          ...(form.get('comment') ? { comment: form.get('comment') } : {}),
        }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <h3>Oceń współpracę</h3>
      <p className="muted">
        Oceny publikują się symultanicznie: druga strona zobaczy Twoją ocenę dopiero, gdy sama oceni
        (albo po 14 dniach). To chroni przed ocenami odwetowymi.
      </p>
      {error && <div className="error-box">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="rating">Ocena</label>
          <select id="rating" name="rating" required defaultValue="5">
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r}/5{' '}
                {r === 5
                  ? '— znakomicie'
                  : r === 4
                    ? '— dobrze'
                    : r === 3
                      ? '— w porządku'
                      : r === 2
                        ? '— słabo'
                        : '— bardzo słabo'}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="comment">Komentarz (opcjonalnie)</label>
          <textarea id="comment" name="comment" maxLength={2000} />
        </div>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? 'Wysyłanie…' : 'Wyślij ocenę'}
        </button>
      </form>
    </div>
  );
}
