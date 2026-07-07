'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
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
        <h1>Zaloguj się</h1>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Hasło</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <button className="btn full" type="submit" disabled={pending}>
            {pending ? 'Logowanie…' : 'Zaloguj się'}
          </button>
        </form>
        <p className="muted">
          Nie masz konta? <Link href="/rejestracja">Zarejestruj się</Link>
        </p>
      </div>
    </main>
  );
}
