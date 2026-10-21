'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

export function OfferForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const proposedBudget = form.get('proposedBudget');
    const proposedDays = form.get('proposedDays');
    setError(null);
    setPending(true);
    try {
      const res = await apiFetch<{ id: string }>(`/orders/${orderId}/offers`, {
        method: 'POST',
        body: JSON.stringify({
          message: form.get('message'),
          ...(proposedBudget ? { proposedBudget: Number(proposedBudget) } : {}),
          ...(proposedDays ? { proposedDays: Number(proposedDays) } : {}),
        }),
      });
      // Po złożeniu oferty Lider ląduje w JEJ wątku z banerem „Twoja oferta
      // czeka" (PL1) — nie na odświeżonym zleceniu, gdzie musiał szukać
      // linijki „Twoja oferta: Złożona" (dziennik wyprawy, dzień 6).
      router.push(`/oferty/${res.id}?wyslana=1`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
      setPending(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <h3>Złóż ofertę</h3>
      {error && <div className="error-box">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="message">Wiadomość do firmy (min. 20 znaków)</label>
          <textarea id="message" name="message" required minLength={20} maxLength={5000} />
        </div>
        <div className="filters" style={{ margin: '0 0 1rem' }}>
          <div className="field">
            <label htmlFor="proposedBudget">Proponowany budżet (zł)</label>
            <input id="proposedBudget" name="proposedBudget" type="number" min={0} />
          </div>
          <div className="field">
            <label htmlFor="proposedDays">Czas realizacji (dni)</label>
            <input id="proposedDays" name="proposedDays" type="number" min={1} max={365} />
          </div>
        </div>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? 'Wysyłanie…' : 'Wyślij ofertę'}
        </button>
      </form>
    </div>
  );
}

/**
 * Główna akcja szkicu bez potwierdzonego adresu (audyt UX 21.10, P04): zamiast
 * aktywnego „Opublikuj", który mógł tylko zwrócić błąd, ponowna wysyłka linku
 * — w miejscu, bez odsyłania do panelu.
 */
export function ResendVerificationButton({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'pending' | 'sent' | 'error'>('idle');

  async function resend() {
    setState('pending');
    try {
      await apiFetch('/auth/resend-verification', { method: 'POST' });
      setState('sent');
    } catch {
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <p role="status">
        Wysłaliśmy nowy link na <strong>{email}</strong>. Sprawdź skrzynkę, także folder spam.
      </p>
    );
  }

  return (
    <>
      {state === 'error' && (
        <div className="error-box" role="alert">
          Nie udało się wysłać linku. Spróbuj za chwilę.
        </div>
      )}
      <button
        type="button"
        className="btn"
        onClick={() => void resend()}
        disabled={state === 'pending'}
      >
        {state === 'pending' ? 'Wysyłanie…' : 'Wyślij link ponownie'}
      </button>
    </>
  );
}

// `ActionButton` przeniesiony do `components/action-button.tsx` (S18) — używa go
// też panel ofert. Re-eksport zostaje, żeby nie ruszać importów strony zlecenia.
export { ActionButton } from '@/components/action-button';
