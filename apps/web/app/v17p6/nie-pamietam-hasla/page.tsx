'use client';

import Link from 'next/link';

import { Dwie, Pole, Przycisk, StanIkona } from '@/components/v17p6/czesci';
import { RamaPubliczna } from '@/components/v17p6/rama';
import { useProsbaOHaslo } from '@/lib/auth-forms';

export default function NiePamietamV17() {
  const { sent, pending, onSubmit } = useProsbaOHaslo();

  return (
    <RamaPubliczna>
      <Dwie>
        {sent ? (
          <>
            <StanIkona ikona="envelope-simple" rodzaj="p-ok" />
            <h1>Sprawdź skrzynkę</h1>
            {/* Ten sam komunikat, czy adres istnieje, czy nie — patrz app/nie-pamietam-hasla. */}
            <p>
              Jeśli to konto istnieje, wysłaliśmy na nie link do ustawienia nowego hasła. Link jest
              ważny przez godzinę i działa jeden raz.
            </p>
            <p className="cicho">
              Nie ma wiadomości? Zajrzyj do spamu i sprawdź, czy adres nie ma literówki.
            </p>
            <Link className="vbtn obrys pelny" href="/logowanie">
              Wróć do logowania
            </Link>
          </>
        ) : (
          <>
            <h1>Nie pamiętam hasła</h1>
            <p className="cicho">
              Podaj adres e-mail, którym się rejestrowałeś. Wyślemy link do ustawienia nowego hasła.
            </p>
            <form onSubmit={onSubmit}>
              <Pole id="email" etykieta="E-mail" type="email" required autoComplete="email" />
              <Przycisk pending={pending}>{pending ? 'Wysyłanie…' : 'Wyślij link'}</Przycisk>
            </form>
            <p className="pod-przyciskiem">
              Pamiętasz hasło? <Link href="/logowanie">Zaloguj się</Link>
            </p>
          </>
        )}
      </Dwie>
    </RamaPubliczna>
  );
}
