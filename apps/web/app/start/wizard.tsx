'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

type Intent = 'LEADER' | 'COMPANY' | 'BOTH';

const INTENTS: Array<{ value: Intent; title: string; hint: string }> = [
  {
    value: 'LEADER',
    title: 'Jestem Liderem',
    hint: 'Prowadzę zespoły albo wykonuję projekty. Chcę pokazać, co potrafię, i dostawać zlecenia.',
  },
  {
    value: 'COMPANY',
    title: 'Reprezentuję Firmę',
    hint: 'Szukam ludzi do konkretnej roboty. Chcę opisać potrzebę i dostać oferty.',
  },
  {
    value: 'BOTH',
    title: 'Jedno i drugie',
    hint: 'Czasem zlecam, czasem realizuję. Chcę mieć obie strony w jednym koncie.',
  },
];

/**
 * Kreator pierwszej mili — trzy kroki, każdy pomijalny.
 *
 * Zasada: kreator ma PROWADZIĆ, nie przesłuchiwać. Dlatego zbieramy absolutne
 * minimum (kim jesteś + jedno pole), a resztę zostawiamy panelowi. Nic tu nie
 * daje punktów — to mapa, nie nagroda (ADR-004).
 */
export function Wizard({ industries }: { industries: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [industryId, setIndustryId] = useState('');
  const [headline, setHeadline] = useState('');
  const [companyName, setCompanyName] = useState('');

  async function patch(payload: Record<string, unknown>) {
    try {
      await apiFetch('/me/onboarding', { method: 'PATCH', body: JSON.stringify(payload) });
    } catch {
      // Stan kreatora to komfort — jego zapis nigdy nie może zablokować drogi
      // dalej. Użytkownik ma iść do przodu nawet, gdy zapis się nie uda.
    }
  }

  async function finish() {
    await patch({ completed: true });
    router.push('/panel');
    router.refresh();
  }

  async function chooseIntent(value: Intent) {
    setIntent(value);
    setStep(2);
    await patch({ intent: value, step: 2 });
  }

  async function saveProfile() {
    setError(null);
    setPending(true);
    try {
      if (intent !== 'COMPANY') {
        if (!industryId || headline.trim().length < 5) {
          setError('Wybierz branżę i napisz jedno zdanie o sobie (min. 5 znaków).');
          return;
        }
        await apiFetch('/me/leader-profile', {
          method: 'POST',
          body: JSON.stringify({ industryId, headline: headline.trim(), isVisible: true }),
        });
      }
      if (intent !== 'LEADER') {
        if (companyName.trim().length < 2) {
          setError('Podaj nazwę firmy.');
          return;
        }
        await apiFetch('/companies', {
          method: 'POST',
          body: JSON.stringify({ name: companyName.trim() }),
        });
      }
      setStep(3);
      await patch({ step: 3 });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Nie udało się zapisać.');
    } finally {
      setPending(false);
    }
  }

  const firstActions =
    intent === 'COMPANY'
      ? [
          { href: '/zlecenia/nowe', label: 'Opisz pierwsze zlecenie' },
          { href: '/liderzy', label: 'Przejrzyj katalog Liderów' },
          { href: '/uslugi', label: 'Zobacz gotowe usługi' },
        ]
      : [
          { href: '/uslugi/nowa', label: 'Opublikuj pierwszą usługę' },
          { href: '/grupy', label: 'Odpowiedz na pytanie w grupie' },
          { href: '/zlecenia', label: 'Znajdź zlecenie dla siebie' },
        ];

  return (
    <div className="wizard">
      <ol className="wizard-steps" aria-label="Postęp kreatora">
        {[1, 2, 3].map((n) => (
          <li key={n} className={n === step ? 'active' : n < step ? 'done' : ''}>
            <span>{n}</span>
          </li>
        ))}
      </ol>

      {error && <div className="error-box">{error}</div>}

      {step === 1 && (
        <section>
          <h2>Kim jesteś w Portalu?</h2>
          <p className="muted">Możesz to później zmienić — to tylko ustawia Ci punkt startowy.</p>
          <div className="wizard-choices">
            {INTENTS.map((option) => (
              <button
                key={option.value}
                type="button"
                className="wizard-choice"
                onClick={() => void chooseIntent(option.value)}
              >
                <strong>{option.title}</strong>
                <em>{option.hint}</em>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2>Minimum, żeby ludzie wiedzieli, z kim mają do czynienia</h2>
          {intent !== 'COMPANY' && (
            <>
              <div className="field">
                <label htmlFor="w-industry">Branża / kompetencja</label>
                <select
                  id="w-industry"
                  value={industryId}
                  onChange={(e) => setIndustryId(e.target.value)}
                >
                  <option value="">Wybierz branżę</option>
                  {industries.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="w-headline">W czym jesteś dobry? (jedno zdanie)</label>
                <input
                  id="w-headline"
                  value={headline}
                  maxLength={120}
                  autoComplete="organization-title"
                  placeholder="np. Buduję i prowadzę zespoły sprzedażowe B2B"
                  onChange={(e) => setHeadline(e.target.value)}
                />
              </div>
            </>
          )}
          {intent !== 'LEADER' && (
            <div className="field">
              <label htmlFor="w-company">Nazwa firmy</label>
              <input
                id="w-company"
                value={companyName}
                maxLength={160}
                autoComplete="organization"
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          )}
          <div className="wizard-actions">
            <button
              className="btn"
              type="button"
              disabled={pending}
              onClick={() => void saveProfile()}
            >
              {pending ? 'Zapisywanie…' : 'Dalej'}
            </button>
            <button className="btn secondary" type="button" onClick={() => void finish()}>
              Pomiń
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2>Pierwszy ruch</h2>
          <p className="muted">
            Wybierz jedną rzecz. Reszta poczeka — do wszystkiego wrócisz z panelu.
          </p>
          <div className="wizard-choices">
            {firstActions.map((action) => (
              <button
                key={action.href}
                type="button"
                className="wizard-choice"
                onClick={() => {
                  void patch({ completed: true }).then(() => router.push(action.href));
                }}
              >
                <strong>{action.label}</strong>
              </button>
            ))}
          </div>
          <div className="wizard-actions">
            <button className="btn secondary" type="button" onClick={() => void finish()}>
              Przejdź do panelu
            </button>
          </div>
        </section>
      )}

      {step < 3 && (
        <p className="wizard-skip">
          <button type="button" className="link-button" onClick={() => void finish()}>
            Pomiń kreator
          </button>
        </p>
      )}
    </div>
  );
}
