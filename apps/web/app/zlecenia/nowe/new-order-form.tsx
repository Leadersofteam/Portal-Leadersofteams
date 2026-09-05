'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

interface Option {
  id: string;
  name: string;
}

// Szkic potrzeby gościa (PL2) żyje w sessionStorage TEJ karty: znika po
// zamknięciu przeglądarki, nie wędruje między urządzeniami i nie trafia na
// serwer, zanim człowiek nie ma konta. Klucz z wersją — zmiana pól = nowy klucz,
// żeby stary szkic nie wypełniał nowego formularza po cichu.
export const DRAFT_KEY = 'lot_szkic_zlecenia_v1';

interface Draft {
  title: string;
  industryId: string;
  description: string;
  budgetMin: string;
  budgetMax: string;
  minLevel: string;
}

function readDraft(): Draft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function draftFromForm(form: FormData): Draft {
  return {
    title: String(form.get('title') ?? ''),
    industryId: String(form.get('industryId') ?? ''),
    description: String(form.get('description') ?? ''),
    budgetMin: String(form.get('budgetMin') ?? ''),
    budgetMax: String(form.get('budgetMax') ?? ''),
    minLevel: String(form.get('minLevel') ?? '0'),
  };
}

export function NewOrderForm({
  guest = false,
  companies,
  industries,
}: {
  guest?: boolean;
  companies: Option[];
  industries: Option[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Szkic czytamy PO montażu (sessionStorage nie istnieje na serwerze) —
  // wartości wchodzą jako defaultValue, więc formularz jest niekontrolowany
  // i nie traci fokusu przy pisaniu.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    setDraft(readDraft());
    setDraftLoaded(true);
  }, []);

  if (!guest && companies.length === 0) {
    return (
      <div className="card form-card">
        <h1>Najpierw dodaj firmę</h1>
        <p className="muted">
          Zlecenia publikuje się w imieniu firmy. Utwórz profil firmowy — zajmie to minutę.
        </p>
        <Link className="btn full" href="/firma/nowa">
          Utwórz profil firmy
        </Link>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);

    if (guest) {
      // Gość: szkic do przeglądarki, konto w następnym kroku. Rejestracja
      // z `cel=firma` zakłada konto i firmę naraz, a `dalej=zlecenie` wraca tu.
      try {
        window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draftFromForm(form)));
      } catch {
        /* prywatny tryb bez storage — formularz i tak przejdzie po zalogowaniu */
      }
      router.push('/rejestracja?cel=firma&dalej=zlecenie');
      return;
    }

    setPending(true);
    try {
      const { id } = await apiFetch<{ id: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          companyId: form.get('companyId'),
          title: form.get('title'),
          description: form.get('description'),
          industryId: form.get('industryId'),
          budgetMin: Number(form.get('budgetMin')),
          budgetMax: Number(form.get('budgetMax')),
          minLevel: Number(form.get('minLevel') ?? 0),
        }),
      });
      try {
        window.sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* nic */
      }
      router.push(`/zlecenia/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
      setPending(false);
    }
  }

  // Formularz montujemy dopiero z odczytanym szkicem: defaultValue ustawia
  // się raz, przy pierwszym renderze pola.
  if (!draftLoaded)
    return <div className="card" style={{ maxWidth: '42rem', margin: '2rem auto' }} />;

  return (
    <div className="card" style={{ maxWidth: '42rem', margin: '2rem auto' }}>
      <h1>{guest ? 'Opisz, co ma powstać' : 'Nowe zlecenie'}</h1>
      {guest ? (
        <p className="muted">
          Bez konta na start. Opiszesz potrzebę, a konto i firmę założysz w następnym kroku — jednym
          formularzem. Zlecenie opublikujesz po potwierdzeniu adresu e-mail.
        </p>
      ) : (
        <p className="muted">
          Zlecenie powstaje jako szkic — opublikujesz je po sprawdzeniu treści.
        </p>
      )}
      {!guest && draft && (
        <p className="muted" data-testid="draft-restored">
          Wypełniliśmy formularz Twoim opisem sprzed rejestracji. Sprawdź i zapisz.
        </p>
      )}
      {error && <div className="error-box">{error}</div>}
      <form onSubmit={onSubmit}>
        {!guest && (
          <div className="field">
            <label htmlFor="companyId">Firma zlecająca</label>
            <select id="companyId" name="companyId" required>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor="title">Tytuł (min. 5 znaków)</label>
          <input
            id="title"
            name="title"
            required
            minLength={5}
            maxLength={140}
            defaultValue={draft?.title ?? ''}
          />
        </div>
        <div className="field">
          <label htmlFor="industryId">Branża</label>
          <select id="industryId" name="industryId" required defaultValue={draft?.industryId}>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="description">Opis potrzeby (min. 20 znaków)</label>
          <textarea
            id="description"
            name="description"
            required
            minLength={20}
            maxLength={10000}
            defaultValue={draft?.description ?? ''}
          />
        </div>
        <div className="filters" style={{ margin: '0 0 1rem' }}>
          <div className="field">
            <label htmlFor="budgetMin">Budżet od (zł)</label>
            <input
              id="budgetMin"
              name="budgetMin"
              type="number"
              min={0}
              required
              defaultValue={draft?.budgetMin ?? ''}
            />
          </div>
          <div className="field">
            <label htmlFor="budgetMax">Budżet do (zł)</label>
            <input
              id="budgetMax"
              name="budgetMax"
              type="number"
              min={0}
              required
              defaultValue={draft?.budgetMax ?? ''}
            />
          </div>
          <div className="field">
            <label htmlFor="minLevel">Minimalny poziom Lidera</label>
            <select id="minLevel" name="minLevel" defaultValue={draft?.minLevel ?? '0'}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl === 0 ? 'Bez wymagań (otwarte dla wszystkich)' : `Poziom ${lvl}+`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? 'Zapisywanie…' : guest ? 'Dalej: konto i firma' : 'Zapisz szkic zlecenia'}
        </button>
        {guest && (
          <p className="muted mt-2">
            Masz już konto? <Link href="/logowanie">Zaloguj się</Link> — szkic zostanie w tej
            karcie.
          </p>
        )}
      </form>
    </div>
  );
}
