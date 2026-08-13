'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { apiFetch } from '@/lib/api';

/**
 * Zamówienie linku do resetu hasła.
 *
 * DO S15 nie było ani tej strony, ani linku do niej na `/logowanie` — czyli
 * resetu nie dało się nawet POPROSIĆ, mimo że backend obsługiwał go od dawna.
 */
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      await apiFetch('/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email') }),
      });
    } catch {
      // Celowo połykamy błąd: patrz komentarz przy komunikacie niżej.
    } finally {
      setPending(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <main>
        <div className="card form-card">
          <h1>Sprawdź skrzynkę</h1>
          {/* Komunikat jest TAKI SAM niezależnie od tego, czy adres istnieje —
              i tak samo zachowuje się backend. Inaczej ten formularz stałby się
              wyrocznią „czy X ma konto na Portalu", czyli wyciekiem listy
              użytkowników dla każdego, kto zna czyjś adres. */}
          <p>
            Jeśli to konto istnieje, wysłaliśmy na nie link do ustawienia nowego hasła. Link jest
            ważny przez godzinę i działa jeden raz.
          </p>
          <p className="muted">
            Nie ma wiadomości? Zajrzyj do spamu i sprawdź, czy adres nie ma literówki.
          </p>
          <p>
            <Link className="btn secondary" href="/logowanie">
              Wróć do logowania
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="card form-card">
        <h1>Nie pamiętam hasła</h1>
        <p className="muted">
          Podaj adres e-mail, którym się rejestrowałeś. Wyślemy link do ustawienia nowego hasła.
        </p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <button className="btn full" type="submit" disabled={pending}>
            {pending ? 'Wysyłanie…' : 'Wyślij link'}
          </button>
        </form>
        <p className="muted">
          Pamiętasz hasło? <Link href="/logowanie">Zaloguj się</Link>
        </p>
      </div>
    </main>
  );
}
