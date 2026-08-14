'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

// Anty-bot Turnstile (D7). Widget renderujemy TYLKO gdy podano publiczny site-key
// (flaga; jak backendowy TURNSTILE_SECRET_KEY). Brak klucza = brak widgetu, a backend
// z wyłączoną ochroną przepuszcza rejestrację — bezpieczny domyślny stan otwarty.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    // Widget Turnstile wstrzykuje ukryte pole `cf-turnstile-response` do formularza.
    const turnstileToken = form.get('cf-turnstile-response');
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
          displayName: form.get('displayName'),
          ...(turnstileToken ? { turnstileToken } : {}),
        }),
      });
      // Świeże konto trafia do kreatora, nie do pustego panelu — na pustym
      // rynku pierwsze „co teraz?" kosztuje nas użytkownika. Kreator jest
      // w całości pomijalny (patrz app/start/wizard.tsx).
      router.push('/start');
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
          {TURNSTILE_SITE_KEY && (
            <>
              <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
              <div className="cf-turnstile field" data-sitekey={TURNSTILE_SITE_KEY} />
            </>
          )}
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
