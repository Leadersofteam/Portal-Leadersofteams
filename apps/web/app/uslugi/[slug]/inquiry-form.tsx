'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

const TIER_LABELS: Record<string, string> = {
  BASIC: 'Podstawowy',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
};

export function InquiryForm({
  listingId,
  companies,
  packages,
}: {
  listingId: string;
  companies: Array<{ id: string; name: string }>;
  packages: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const res = await apiFetch<{ id: string }>(`/listings/${listingId}/inquiries`, {
        method: 'POST',
        body: JSON.stringify({
          companyId: form.get('companyId'),
          message: form.get('message'),
          ...(form.get('packageTier') ? { packageTier: form.get('packageTier') } : {}),
        }),
      });
      router.push(`/zapytania/${res.id}`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ maxWidth: '36rem' }}>
      {error && <div className="error-box">{error}</div>}
      <div className="field">
        <label htmlFor="inq-company">Firma</label>
        <select id="inq-company" name="companyId" required defaultValue={companies[0]?.id}>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="inq-package">Pakiet (opcjonalnie)</label>
        <select id="inq-package" name="packageTier" defaultValue="">
          <option value="">Jeszcze nie wiem</option>
          {packages.map((tier) => (
            <option key={tier} value={tier}>
              {TIER_LABELS[tier] ?? tier}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="inq-message">Wiadomość (min. 20 znaków)</label>
        <textarea
          id="inq-message"
          name="message"
          required
          minLength={20}
          maxLength={5000}
          placeholder="Opisz potrzebę, kontekst i termin — Lider odpowie w wątku zapytania."
        />
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Wysyłanie…' : 'Wyślij zapytanie'}
      </button>
    </form>
  );
}
