'use client';

import { Blad, Ilustracja, PierwszyPunkt, Pole } from '@/components/v17p6/czesci';
import { INTENTS, useOnboarding } from '@/lib/use-onboarding';
import type { Intent, OnboardingArt } from '@/lib/use-onboarding';

const IKONA: Record<Intent, OnboardingArt> = { LEADER: 'ladder', COMPANY: 'search', BOTH: 'rung' };
const KROKI = ['Kim jesteś', 'Minimum', 'Pierwszy ruch'];

export function Kreator({ industries }: { industries: Array<{ id: string; name: string }> }) {
  const k = useOnboarding();
  const brakBranzy = k.error === 'Wybierz branżę / kompetencję.';

  return (
    <>
      <ol className="kroki" aria-label="Postęp kreatora">
        {KROKI.map((t, i) => (
          <li
            key={t}
            className={i + 1 === k.step ? 'p-teraz' : i + 1 < k.step ? 'zrobione' : ''}
            aria-current={i + 1 === k.step ? 'step' : undefined}
          >
            <span>{i + 1}</span>
            <span className="sr">{t}</span>
          </li>
        ))}
      </ol>

      {k.step === 1 && (
        <section>
          <h2>Kim jesteś w Portalu?</h2>
          <p className="cicho">Możesz to później zmienić — to tylko ustawia Ci punkt startowy.</p>
          <div className="wybory">
            {INTENTS.map((o) => (
              <button
                key={o.value}
                type="button"
                className="wybor"
                onClick={() => void k.chooseIntent(o.value)}
              >
                <Ilustracja n={IKONA[o.value]} />
                <strong>{o.title}</strong>
                <em>{o.hint}</em>
              </button>
            ))}
          </div>
        </section>
      )}

      {k.step === 2 && (
        <section>
          <h2>Minimum, żeby ludzie wiedzieli, z kim mają do czynienia</h2>
          <form
            className="pola"
            onSubmit={(e) => {
              e.preventDefault();
              void k.saveProfile();
            }}
          >
            {k.error && <Blad>{k.error}</Blad>}
            {k.intent !== 'COMPANY' && (
              <>
                <div className={`pole-f${brakBranzy ? ' zle' : ''}`}>
                  <label htmlFor="w-industry">Branża / kompetencja</label>
                  <select
                    id="w-industry"
                    value={k.industryId}
                    aria-invalid={brakBranzy || undefined}
                    onChange={(e) => k.setIndustryId(e.target.value)}
                  >
                    <option value="">Wybierz branżę</option>
                    {industries.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Pole
                  id="w-headline"
                  etykieta="W czym jesteś dobry? (jedno zdanie)"
                  value={k.headline}
                  maxLength={120}
                  autoComplete="organization-title"
                  placeholder="np. Buduję i prowadzę zespoły sprzedażowe B2B"
                  onChange={(e) => k.setHeadline(e.target.value)}
                />
              </>
            )}
            {k.intent !== 'LEADER' && (
              <Pole
                id="w-company"
                etykieta="Nazwa firmy"
                value={k.companyName}
                maxLength={160}
                autoComplete="organization"
                onChange={(e) => k.setCompanyName(e.target.value)}
              />
            )}
            <div className="akcje-k">
              <button className="vbtn glowny" type="submit" disabled={k.pending}>
                {k.pending ? 'Zapisywanie…' : 'Dalej'}
              </button>
              <button className="vbtn obrys" type="button" onClick={() => void k.finish()}>
                Pomiń
              </button>
            </div>
          </form>
        </section>
      )}

      {k.step === 3 && (
        <section>
          <h2>Pierwszy ruch</h2>
          <p className="cicho">
            Wybierz jedną rzecz. Reszta poczeka — do wszystkiego wrócisz z panelu.
          </p>
          <div className="wybory">
            {k.firstActions.map((a) => (
              <button
                key={a.href}
                type="button"
                className="wybor"
                onClick={() => {
                  void k.patch({ completed: true }).then(() => k.router.push(a.href));
                }}
              >
                <Ilustracja n={a.art} />
                <strong>{a.label}</strong>
              </button>
            ))}
          </div>
          {k.intent !== 'COMPANY' && <PierwszyPunkt compact />}
          <div className="akcje-k" style={{ marginTop: 20 }}>
            <button className="vbtn obrys" type="button" onClick={() => void k.finish()}>
              Przejdź do panelu
            </button>
          </div>
        </section>
      )}

      {k.step < 3 && (
        <p className="pomin">
          <button type="button" className="p-link" onClick={() => void k.finish()}>
            Pomiń kreator
          </button>
        </p>
      )}
    </>
  );
}
