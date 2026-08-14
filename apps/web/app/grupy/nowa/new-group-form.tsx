'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

/**
 * Zakładanie grupy.
 *
 * ZASTANY BRAK do S17: `POST /groups` istniał od Sprintu 4 (razem z bramką
 * poziomu 2), ale w całym interfejsie NIE BYŁO ani jednego wejścia w tę trasę.
 * Grupę dało się założyć wyłącznie curl-em, więc jedyne grupy na produkcji to
 * dziesięć systemowych z seeda — a te nie mają założyciela, czyli nie mają też
 * moderatora. To ten sam wzorzec błędu co przy resecie hasła: „backend gotowy"
 * nie znaczy „funkcja działa".
 */
export function NewGroupForm({ industries }: { industries: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setPending(true);
    void (async () => {
      try {
        const industryId = String(form.get('industryId') ?? '');
        const description = String(form.get('description') ?? '').trim();
        const created = await apiFetch<{ id: string }>('/groups', {
          method: 'POST',
          body: JSON.stringify({
            name: form.get('name'),
            type: form.get('type'),
            ...(description ? { description } : {}),
            ...(industryId ? { industryId } : {}),
          }),
        });
        router.push(`/grupy/${created.id}`);
        router.refresh();
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 401) {
          router.push('/logowanie');
          return;
        }
        // Bramka poziomu 2 wraca tu jako czytelny komunikat z serwera
        // („Zakładanie grup wymaga poziomu 2… Twój poziom: 0”) — nie tłumaczymy
        // go drugi raz po swojemu, żeby nie rozjechać dwóch wersji tej zasady.
        setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
      } finally {
        setPending(false);
      }
    })();
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      {error && <div className="error-box">{error}</div>}
      <div className="field">
        <label htmlFor="name">Nazwa grupy</label>
        <input id="name" name="name" required minLength={3} maxLength={120} />
      </div>
      <div className="field">
        <label htmlFor="description">Opis (opcjonalny)</label>
        <textarea id="description" name="description" maxLength={2000} />
      </div>
      <div className="field">
        <label htmlFor="industryId">Branża (opcjonalna)</label>
        <select id="industryId" name="industryId" defaultValue="">
          <option value="">Przekrojowa</option>
          {industries.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="type">Kto może dołączyć</label>
        <select id="type" name="type" defaultValue="OPEN">
          <option value="OPEN">Otwarta — każdy dołącza od razu</option>
          <option value="MODERATED">Moderowana — akceptujesz zgłoszenia</option>
        </select>
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Zakładanie…' : 'Załóż grupę'}
      </button>
    </form>
  );
}
