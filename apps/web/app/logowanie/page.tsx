'use client';

import Link from 'next/link';

import { useLogowanie } from '@/lib/auth-forms';

export default function LoginPage() {
  const { error, pending, onSubmit } = useLogowanie();

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
        {/* Do S15 tego linku NIE BYŁO — reset hasła istniał w API, ale nie dało
            się go z portalu poprosić. Osoba bez hasła nie miała żadnej drogi
            powrotu poza założeniem drugiego konta. */}
        <p className="muted">
          <Link href="/nie-pamietam-hasla">Nie pamiętam hasła</Link>
        </p>
        <p className="muted">
          Nie masz konta? <Link href="/rejestracja">Zarejestruj się</Link>
        </p>
      </div>
    </main>
  );
}
