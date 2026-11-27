'use client';

import Link from 'next/link';

import { Blad, Dwie, Pole, Przycisk } from '@/components/v17p6/czesci';
import { RamaPubliczna } from '@/components/v17p6/rama';
import { useRejestracja } from '@/lib/auth-forms';

export default function RejestracjaV17() {
  const { error, pending, onSubmit, celFirma, dalejZlecenie } = useRejestracja();

  return (
    <RamaPubliczna>
      <Dwie bok="Konto to pierwszy szczebel. Dalej wspinasz się już tylko pracą — każdy punkt w Drabince ma jawne źródło, a bursztyn szczytu trzeba zdobyć.">
        {celFirma && dalejZlecenie && (
          <p className="krok-z" data-testid="form-step">
            Krok 2 z 2 · konto i firma
          </p>
        )}
        <h1>{celFirma ? 'Konto i firma — jeden krok' : 'Załóż konto'}</h1>
        <p className="cicho">
          {celFirma
            ? 'Twój opis potrzeby czeka w tej karcie. Załóż konto, podaj nazwę firmy — i wracasz do zlecenia.'
            : 'Rejestracja jest otwarta dla każdego. Tytuł Lidera zdobywa się pracą i mentoringiem — w Drabince Lidera.'}
        </p>
        {error && <Blad>{error}</Blad>}
        <form onSubmit={onSubmit}>
          <Pole
            id="displayName"
            etykieta="Imię i nazwisko (lub nazwa)"
            required
            minLength={2}
            maxLength={80}
          />
          {celFirma && (
            <Pole
              id="companyName"
              etykieta="Nazwa firmy"
              required
              minLength={2}
              maxLength={120}
              autoComplete="organization"
            />
          )}
          <Pole id="email" etykieta="E-mail" type="email" required autoComplete="email" />
          <Pole
            id="password"
            etykieta="Hasło (min. 10 znaków)"
            type="password"
            required
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
          />
          {/* Pole-pułapka na automaty — jak w app/rejestracja/page.tsx. */}
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="nazwaFirmy">Nazwa firmy (nie wypełniaj)</label>
            <input id="nazwaFirmy" name="nazwaFirmy" type="text" tabIndex={-1} autoComplete="off" />
          </div>
          <Przycisk pending={pending}>{pending ? 'Tworzenie konta…' : 'Utwórz konto'}</Przycisk>
        </form>
        {/* Regulamin §2 mówi o akceptacji — formularz musi do niego prowadzić. */}
        <p className="zgoda">
          Zakładając konto, akceptujesz <Link href="/regulamin">Regulamin</Link> i{' '}
          <Link href="/prywatnosc">Politykę prywatności</Link>.
        </p>
        <p className="pod-przyciskiem">
          Masz już konto? <Link href="/logowanie">Zaloguj się</Link>
        </p>
      </Dwie>
    </RamaPubliczna>
  );
}
