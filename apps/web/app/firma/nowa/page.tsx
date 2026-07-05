'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

export default function NewCompanyPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const nip = String(form.get('nip') ?? '').trim();
    try {
      await apiFetch('/companies', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          ...(nip ? { nip } : {}),
          ...(form.get('description') ? { description: form.get('description') } : {}),
        }),
      });
      router.push('/zlecenia/nowe');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
      setPending(false);
    }
  }

  return (
    <main>
      <div className="card form-card">
        <h1>Profil firmy</h1>
        <p className="muted">
          Rejestracja firmy jest otwarta — bez weryfikacji na starcie. Wiarygodność firmy budują
          oceny Liderów po zrealizowanych zleceniach.
        </p>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="name">Nazwa firmy</label>
            <input id="name" name="name" required minLength={2} maxLength={120} />
          </div>
          <div className="field">
            <label htmlFor="nip">NIP (opcjonalnie, 10 cyfr)</label>
            <input id="nip" name="nip" pattern="\d{10}" title="10 cyfr" />
          </div>
          <div className="field">
            <label htmlFor="description">Krótki opis (opcjonalnie)</label>
            <textarea id="description" name="description" maxLength={2000} />
          </div>
          <button className="btn full" type="submit" disabled={pending}>
            {pending ? 'Tworzenie…' : 'Utwórz firmę'}
          </button>
        </form>
      </div>
    </main>
  );
}
