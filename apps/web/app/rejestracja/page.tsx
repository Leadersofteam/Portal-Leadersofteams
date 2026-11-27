'use client';

import Link from 'next/link';

import { ArtSummitLantern } from '@/components/ui/illustrations';
import { useRejestracja } from '@/lib/auth-forms';

export default function RegisterPage() {
  const { error, pending, onSubmit, celFirma, dalejZlecenie } = useRejestracja();

  return (
    <main>
      {/* ≥1024 px: obok formularza cicha kolumna z latarnią szczytu — jedno
          zdanie o tym, PO CO jest to konto. Zero nowych pól, zero frykcji;
          na telefonie kolumna znika i formularz zostaje pierwszy. */}
      <div className="auth-split">
        <div className="card form-card">
          {celFirma && dalejZlecenie && (
            <p className="form-step" data-testid="form-step">
              Krok 2 z 2 · konto i firma
            </p>
          )}
          <h1>{celFirma ? 'Konto i firma — jeden krok' : 'Załóż konto'}</h1>
          <p className="muted">
            {celFirma
              ? 'Twój opis potrzeby czeka w tej karcie. Załóż konto, podaj nazwę firmy — i wracasz do zlecenia.'
              : 'Rejestracja jest otwarta dla każdego. Tytuł Lidera zdobywa się pracą i mentoringiem — w Drabince Lidera.'}
          </p>
          {error && <div className="error-box">{error}</div>}
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="displayName">Imię i nazwisko (lub nazwa)</label>
              <input id="displayName" name="displayName" required minLength={2} maxLength={80} />
            </div>
            {celFirma && (
              <div className="field">
                <label htmlFor="companyName">Nazwa firmy</label>
                <input
                  id="companyName"
                  name="companyName"
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="organization"
                />
              </div>
            )}
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
            {/* POLE-PUŁAPKA na automaty wypełniające wszystkie inputy. Ukryte
              przed wzrokiem I przed czytnikami ekranu (aria-hidden + tabIndex),
              żeby nie zmyliło osoby korzystającej z klawiatury. Nazwa jest
              celowo wiarygodna — „honeypot" w atrybucie zdradzałby zasadzkę. */}
            <div className="hp-field" aria-hidden="true">
              <label htmlFor="nazwaFirmy">Nazwa firmy (nie wypełniaj)</label>
              <input
                id="nazwaFirmy"
                name="nazwaFirmy"
                type="text"
                tabIndex={-1}
                autoComplete="off"
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
        <aside className="auth-aside">
          <ArtSummitLantern className="auth-aside-art" />
          <p>
            Konto to pierwszy szczebel. Dalej wspinasz się już tylko pracą — każdy punkt w Drabince
            ma jawne źródło, a bursztyn szczytu trzeba zdobyć.
          </p>
        </aside>
      </div>
    </main>
  );
}
