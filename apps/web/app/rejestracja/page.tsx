'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
          displayName: form.get('displayName'),
        }),
      });
      router.push('/panel');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak. Spróbuj ponownie.',
      );
      setPending(false);
    }
  }

  return (
    <main>
      <div className="card form-card">
        <h1>Załóż konto</h1>
        <p className="muted">
          Rejestracja jest otwarta dla każdego. Tytuł Lidera zdobywa się pracą i mentoringiem — w
          Drabince Lidera.
        </p>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="displayName">Imię i nazwisko (lub nazwa)</label>
            <input id="displayName" name="displayName" required minLength={2} maxLength={80} />
          </div>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Hasło (min. 10 znaków)</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
            />
          </div>
          <button className="btn full" type="submit" disabled={pending}>
            {pending ? 'Tworzenie konta…' : 'Utwórz konto'}
          </button>
        </form>
        <p className="muted">
          Masz już konto? <Link href="/logowanie">Zaloguj się</Link>
        </p>
      </div>
    </main>
  );
}
