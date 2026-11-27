'use client';

import Link from 'next/link';

import { Blad, Dwie, Pole, Przycisk } from '@/components/v17p6/czesci';
import { RamaPubliczna } from '@/components/v17p6/rama';
import { useLogowanie } from '@/lib/auth-forms';

export default function LogowanieV17() {
  const { error, pending, onSubmit } = useLogowanie();

  // Pole hasła oznaczamy tylko przy błędnych danych, nie przy awarii sieci.
  const zleDane = /Nieprawidłow/.test(error ?? '');

  return (
    <RamaPubliczna>
      <Dwie bok="Twoje szczeble czekają. Poziom raz zdobyty nie wygasa.">
        <h1>Zaloguj się</h1>
        {error && <Blad>{error}</Blad>}
        <form onSubmit={onSubmit}>
          <Pole id="email" etykieta="E-mail" type="email" required autoComplete="email" />
          <Pole
            id="password"
            etykieta="Hasło"
            type="password"
            required
            autoComplete="current-password"
            zle={zleDane}
            aria-describedby={zleDane ? 'blad-formularza' : undefined}
          />
          <Przycisk pending={pending}>{pending ? 'Logowanie…' : 'Zaloguj się'}</Przycisk>
        </form>
        <p className="pod-przyciskiem">
          <Link href="/nie-pamietam-hasla">Nie pamiętam hasła</Link>
        </p>
        <p className="pod-przyciskiem">
          Nie masz konta? <Link href="/rejestracja">Zarejestruj się</Link>
        </p>
      </Dwie>
    </RamaPubliczna>
  );
}
