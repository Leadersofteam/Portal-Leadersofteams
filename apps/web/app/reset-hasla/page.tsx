'use client';

import Link from 'next/link';

import { useNoweHaslo } from '@/lib/auth-forms';

/**
 * Strona z linku resetu hasła.
 *
 * DO S15 TEJ STRONY NIE BYŁO — i to był poważniejszy brak niż martwa aktywacja.
 * Aktywacja niczego nie blokuje (konto działa i tak), ale kto zapomniał hasła,
 * NIE MIAŁ ŻADNEJ drogi powrotu: mail przychodził, link prowadził w 404.
 * Dokładnie ten scenariusz roadmapa wskazywała jako „nie wróci i nie powie dlaczego".
 */
export default function ResetPasswordPage() {
  const { token, done, error, pending, onSubmit } = useNoweHaslo();

  if (done) {
    return (
      <main>
        <div className="card form-card">
          <h1>Hasło ustawione</h1>
          <p>Możesz się teraz zalogować nowym hasłem.</p>
          {/* Mówimy o tym wprost, bo inaczej wylogowanie na telefonie wygląda
              jak awaria. Reset unieważnia WSZYSTKIE sesje (bezpieczeństwo:
              jeśli ktoś przejął konto, traci dostęp w tym momencie). */}
          <p className="muted">
            Ze względów bezpieczeństwa wylogowaliśmy Cię ze wszystkich urządzeń — na każdym trzeba
            zalogować się ponownie.
          </p>
          <p>
            <Link className="btn" href="/logowanie">
              Zaloguj się
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="card form-card">
        <h1>Ustaw nowe hasło</h1>

        {token === null ? (
          <>
            <div className="error-box">W adresie zabrakło tokenu.</div>
            <p className="muted">
              Otwórz link dokładnie tak, jak przyszedł w wiadomości. Możesz też poprosić o nowy —
              link resetu traci ważność po godzinie.
            </p>
            <p>
              <Link className="btn secondary" href="/nie-pamietam-hasla">
                Wyślij nowy link
              </Link>
            </p>
          </>
        ) : (
          <>
            {error && <div className="error-box">{error}</div>}
            <form onSubmit={onSubmit}>
              <div className="field">
                <label htmlFor="password">Nowe hasło (min. 10 znaków)</label>
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
              <div className="field">
                <label htmlFor="password2">Powtórz hasło</label>
                <input
                  id="password2"
                  name="password2"
                  type="password"
                  required
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </div>
              <button className="btn full" type="submit" disabled={pending}>
                {pending ? 'Zapisywanie…' : 'Ustaw hasło'}
              </button>
            </form>
            <p className="muted">
              Link stracił ważność? <Link href="/nie-pamietam-hasla">Poproś o nowy</Link>.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
