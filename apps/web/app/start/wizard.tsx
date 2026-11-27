'use client';

import { FirstPoint } from '@/components/ui/first-point';
import { ART } from '@/components/ui/illustrations';
import { INTENTS, useOnboarding } from '@/lib/use-onboarding';

/**
 * Kreator pierwszej mili — trzy kroki, każdy pomijalny.
 *
 * Zasada: kreator ma PROWADZIĆ, nie przesłuchiwać. Dlatego zbieramy absolutne
 * minimum (kim jesteś + jedno pole), a resztę zostawiamy panelowi. Nic tu nie
 * daje punktów — to mapa, nie nagroda (ADR-004).
 */
export function Wizard({ industries }: { industries: Array<{ id: string; name: string }> }) {
  const {
    step,
    intent,
    error,
    pending,
    industryId,
    setIndustryId,
    headline,
    setHeadline,
    companyName,
    setCompanyName,
    patch,
    finish,
    chooseIntent,
    saveProfile,
    firstActions,
    router,
  } = useOnboarding();

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
            {firstActions.map((action) => {
              const Art = ART[action.art];
              return (
                <button
                  key={action.href}
                  type="button"
                  className="wizard-choice wizard-choice--art"
                  onClick={() => {
                    void patch({ completed: true }).then(() => router.push(action.href));
                  }}
                >
                  <Art className="wizard-choice-art" />
                  <strong>{action.label}</strong>
                </button>
              );
            })}
          </div>
          {intent !== 'COMPANY' && <FirstPoint compact />}
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
