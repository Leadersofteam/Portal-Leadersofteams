'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

interface Option {
  id: string;
  name: string;
}

export function NewOrderForm({
  companies,
  industries,
}: {
  companies: Option[];
  industries: Option[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (companies.length === 0) {
    return (
      <div className="card form-card">
        <h1>Najpierw dodaj firmę</h1>
        <p className="muted">
          Zlecenia publikuje się w imieniu firmy. Utwórz profil firmowy — zajmie to minutę.
        </p>
        <Link className="btn full" href="/firma/nowa">
          Utwórz profil firmy
        </Link>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const { id } = await apiFetch<{ id: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          companyId: form.get('companyId'),
          title: form.get('title'),
          description: form.get('description'),
          industryId: form.get('industryId'),
          budgetMin: Number(form.get('budgetMin')),
          budgetMax: Number(form.get('budgetMax')),
          minLevel: Number(form.get('minLevel') ?? 0),
        }),
      });
      router.push(`/zlecenia/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
      setPending(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: '42rem', margin: '2rem auto' }}>
      <h1>Nowe zlecenie</h1>
      <p className="muted">Zlecenie powstaje jako szkic — opublikujesz je po sprawdzeniu treści.</p>
      {error && <div className="error-box">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="companyId">Firma zlecająca</label>
          <select id="companyId" name="companyId" required>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="title">Tytuł (min. 5 znaków)</label>
          <input id="title" name="title" required minLength={5} maxLength={140} />
        </div>
        <div className="field">
          <label htmlFor="industryId">Branża</label>
          <select id="industryId" name="industryId" required>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="description">Opis potrzeby (min. 20 znaków)</label>
          <textarea id="description" name="description" required minLength={20} maxLength={10000} />
        </div>
        <div className="filters" style={{ margin: '0 0 1rem' }}>
          <div className="field">
            <label htmlFor="budgetMin">Budżet od (zł)</label>
            <input id="budgetMin" name="budgetMin" type="number" min={0} required />
          </div>
          <div className="field">
            <label htmlFor="budgetMax">Budżet do (zł)</label>
            <input id="budgetMax" name="budgetMax" type="number" min={0} required />
          </div>
          <div className="field">
            <label htmlFor="minLevel">Minimalny poziom Lidera</label>
            <select id="minLevel" name="minLevel" defaultValue="0">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl === 0 ? 'Bez wymagań (otwarte dla wszystkich)' : `Poziom ${lvl}+`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? 'Zapisywanie…' : 'Zapisz szkic zlecenia'}
        </button>
      </form>
    </div>
  );
}
