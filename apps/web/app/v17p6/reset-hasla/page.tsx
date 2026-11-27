'use client';

import Link from 'next/link';

import { Blad, Dwie, Pole, Przycisk, StanIkona } from '@/components/v17p6/czesci';
import { RamaPubliczna } from '@/components/v17p6/rama';
import { useNoweHaslo } from '@/lib/auth-forms';

export default function ResetHaslaV17() {
  const { token, odczytany, done, error, pending, onSubmit } = useNoweHaslo();
  const rozne = error === 'Hasła nie są takie same.';

  return (
    <RamaPubliczna>
      <Dwie>
        {done ? (
          <>
            <StanIkona ikona="check-circle" rodzaj="p-ok" />
            <h1>Hasło ustawione</h1>
            <p>Możesz się teraz zalogować nowym hasłem.</p>
            <p className="cicho">
              Ze względów bezpieczeństwa wylogowaliśmy Cię ze wszystkich urządzeń — na każdym trzeba
              zalogować się ponownie.
            </p>
            <Link className="vbtn glowny pelny" href="/logowanie">
              Zaloguj się
            </Link>
          </>
        ) : !odczytany ? (
          <h1>Ustaw nowe hasło</h1>
        ) : token === null ? (
          <>
            <h1>Ustaw nowe hasło</h1>
            <Blad>W adresie zabrakło tokenu.</Blad>
            <p className="cicho">
              Otwórz link dokładnie tak, jak przyszedł w wiadomości. Możesz też poprosić o nowy —
              link resetu traci ważność po godzinie.
            </p>
            <p>
              <Link className="vbtn glowny pelny" href="/nie-pamietam-hasla">
                Wyślij nowy link
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1>Ustaw nowe hasło</h1>
            {error && <Blad>{error}</Blad>}
            <form onSubmit={onSubmit}>
              <Pole
                id="password"
                etykieta="Nowe hasło (min. 10 znaków)"
                type="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
              />
              <Pole
                id="password2"
                etykieta="Powtórz hasło"
                type="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                zle={rozne}
              />
              <Przycisk pending={pending}>{pending ? 'Zapisywanie…' : 'Ustaw hasło'}</Przycisk>
            </form>
            <p className="pod-przyciskiem">
              Link stracił ważność? <Link href="/nie-pamietam-hasla">Poproś o nowy</Link>.
            </p>
          </>
        )}
      </Dwie>
    </RamaPubliczna>
  );
}
