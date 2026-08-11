'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

export function ReplyForm({ inquiryId }: { inquiryId: string }) {
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
      await apiFetch(`/inquiries/${inquiryId}/messages`, {
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
        <label htmlFor="reply-body">Odpowiedź</label>
        <textarea id="reply-body" name="body" required minLength={1} maxLength={5000} />
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Wysyłanie…' : 'Wyślij'}
      </button>
    </form>
  );
}

export function InquiryThreadActions({
  inquiryId,
  isCompany,
}: {
  inquiryId: string;
  isCompany: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function convert() {
    setPending(true);
    setError(null);
    try {
      const res = await apiFetch<{ orderId: string }>(`/inquiries/${inquiryId}/convert`, {
        method: 'POST',
      });
      router.push(`/zlecenia/${res.orderId}`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
      setPending(false);
    }
  }

  async function close() {
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/inquiries/${inquiryId}/close`, { method: 'POST' });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
      setPending(false);
    }
  }

  return (
    <div className="actions-row">
      {error && <div className="error-box">{error}</div>}
      {isCompany && (
        <button className="btn" disabled={pending} onClick={() => void convert()}>
          Przekształć w zlecenie
        </button>
      )}
      <button className="btn secondary" disabled={pending} onClick={() => void close()}>
        Zamknij wątek
      </button>
    </div>
  );
}
