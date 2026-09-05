'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

// Odpowiedź w wątku oferty — ten sam kształt co ReplyForm przy zapytaniach
// (/zapytania/[id]/thread-actions.tsx). Treść zostaje w polu przy błędzie sieci:
// na VPS pod obciążeniem submit potrafi paść, a przepisywanie akapitu to
// tarcie, które dziennik wyprawy zapisał jako „zachował treść — dobrze".
export function OfferReplyForm({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const body = new FormData(formEl).get('body');
    setError(null);
    setPending(true);
    try {
      await apiFetch(`/offers/${offerId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      formEl.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ maxWidth: '44rem' }}>
      {error && <div className="error-box">{error}</div>}
      <div className="field">
        <label htmlFor="offer-reply-body">Wiadomość</label>
        <textarea id="offer-reply-body" name="body" required minLength={1} maxLength={5000} />
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Wysyłanie…' : 'Wyślij'}
      </button>
    </form>
  );
}
