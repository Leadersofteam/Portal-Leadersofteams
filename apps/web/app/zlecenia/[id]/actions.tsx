'use client';

import type { FormEvent } from 'react';

import { useAction } from '@/components/action-button';
import { apiFetch } from '@/lib/api';

export function OfferForm({ orderId }: { orderId: string }) {
  const { run, error, pending } = useAction();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const proposedBudget = form.get('proposedBudget');
    const proposedDays = form.get('proposedDays');
    void run(() =>
      apiFetch(`/orders/${orderId}/offers`, {
        method: 'POST',
        body: JSON.stringify({
          message: form.get('message'),
          ...(proposedBudget ? { proposedBudget: Number(proposedBudget) } : {}),
          ...(proposedDays ? { proposedDays: Number(proposedDays) } : {}),
        }),
      }),
    );
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

// `ActionButton` przeniesiony do `components/action-button.tsx` (S18) — używa go
// też panel ofert. Re-eksport zostaje, żeby nie ruszać importów strony zlecenia.
export { ActionButton } from '@/components/action-button';
