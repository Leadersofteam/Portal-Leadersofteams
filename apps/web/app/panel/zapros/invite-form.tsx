'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

export function InviteForm() {
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const email = String(form.get('email') ?? '');
    const message = String(form.get('message') ?? '').trim();
    setError(null);
    setPending(true);
    try {
      await apiFetch('/me/invitations', {
        method: 'POST',
        body: JSON.stringify({ email, ...(message ? { message } : {}) }),
      });
      setSentTo(email);
      formEl.reset();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ maxWidth: '44rem' }}>
      {error && <div className="error-box">{error}</div>}
      {sentTo && (
        <p className="muted" data-testid="invite-sent">
          Wysłane do {sentTo}. To wszystko — reszta zależy od tej osoby.
        </p>
      )}
      <div className="field">
        <label htmlFor="invite-email">Adres e-mail osoby, którą zapraszasz</label>
        <input id="invite-email" name="email" type="email" required autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="invite-message">Kilka słów od Ciebie (opcjonalnie)</label>
        <textarea
          id="invite-message"
          name="message"
          maxLength={500}
          placeholder="Np. „Pamiętasz, jak szukałeś zleceń poza LinkedInem? Zobacz to.”"
        />
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Wysyłanie…' : 'Wyślij zaproszenie'}
      </button>
    </form>
  );
}
