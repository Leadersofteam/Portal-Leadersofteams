// Wspólne klocki ekranów P5/P6 (port z pro/publiczne.js). Czysto prezentacyjne.
import Link from 'next/link';
import type { InputHTMLAttributes, ReactNode } from 'react';

import { Ico } from '@/components/v17/ico';
import type { IcoName } from '@/components/v17/ico';
import { FIRST_POINT, LEVEL_RULES_FALLBACK } from '@/lib/levels';
import type { OnboardingArt } from '@/lib/use-onboarding';

export function DrabinaArt({ przerywane = false }: { przerywane?: boolean }) {
  return (
    <svg viewBox="0 0 340 480" fill="none" aria-hidden="true">
      {przerywane && (
        <path
          d="M20 424h30M300 52h24"
          style={{ stroke: 'var(--line-2)' }}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="2 12"
        />
      )}
      <path
        d="M96 478 150 6M268 478 250 6"
        style={{ stroke: 'var(--line-2)' }}
        strokeWidth="10"
        strokeLinecap="round"
      />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const t = i / 6;
        const y = 424 - t * 372;
        return (
          <line
            key={i}
            x1={102 + t * 44}
            y1={y}
            x2={262 - t * 14}
            y2={y - 6}
            style={{ stroke: `var(--level-${i + 1})` }}
            strokeWidth={i === 6 ? 14 : 11}
            strokeLinecap="round"
            opacity={0.45 + t * 0.55}
          />
        );
      })}
    </svg>
  );
}

/** Formularz w karcie; `bok` = zdanie obok, pod drabiną (na telefonie znika). */
export function Dwie({ children, bok }: { children: ReactNode; bok?: string }) {
  return (
    <div className={`p-dwie${bok ? '' : ' jedna'}`}>
      <div className="forma">{children}</div>
      {bok && (
        <aside className="bok-auth">
          <DrabinaArt />
          <p>{bok}</p>
        </aside>
      )}
    </div>
  );
}

export function Pole({
  id,
  etykieta,
  zle = false,
  ...input
}: { id: string; etykieta: string; zle?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`pole-f${zle ? ' zle' : ''}`}>
      <label htmlFor={id}>{etykieta}</label>
      <input id={id} name={id} aria-invalid={zle || undefined} {...input} />
    </div>
  );
}

export function Blad({ children }: { children: ReactNode }) {
  return (
    <div className="blad-box" role="alert" id="blad-formularza">
      <Ico n="warning-circle" />
      <span>{children}</span>
    </div>
  );
}

export function Przycisk({ children, pending }: { children: ReactNode; pending: boolean }) {
  return (
    <button className="vbtn glowny pelny duzy" type="submit" disabled={pending}>
      {children}
    </button>
  );
}

export function StanIkona({ ikona, rodzaj }: { ikona: IcoName; rodzaj: 'p-ok' | 'zle' }) {
  return (
    <div className={`stan-ikona ${rodzaj}`}>
      <Ico n={ikona} />
    </div>
  );
}

/** „Twój pierwszy punkt” — te same liczby i zdania co components/ui/first-point.tsx. */
export function PierwszyPunkt({ compact = false }: { compact?: boolean }) {
  const adept = LEVEL_RULES_FALLBACK[0]!;
  return (
    <section className="pierwszy" aria-labelledby="p6-pierwszy">
      <h3 id="p6-pierwszy">
        Pierwszy szczebel, {adept.name}, to {adept.pointsRequired}
        {'\u00a0'}pkt. Dają je tylko inni ludzie.
      </h3>
      <ul>
        <li>
          <strong>+{FIRST_POINT.reviewTopPoints} pkt</strong>
          <span>
            Firma ocenia Twoją pracę na 5/5 po zakończonym zleceniu. Jedno takie zlecenie wystarcza
            na {adept.name}a.
          </span>
          {!compact && (
            <Link className="p-link" href="/zlecenia">
              Znajdź zlecenie →
            </Link>
          )}
        </li>
        <li>
          <strong>+{FIRST_POINT.answerAcceptedPoints} pkt</strong>
          <span>
            Autor pytania uznaje Twoją odpowiedź w Q&amp;A (do {FIRST_POINT.communityWeeklyCap} pkt
            w 7 dni).
          </span>
          {!compact && (
            <Link className="p-link" href="/pytania">
              Odpowiedz na pytanie →
            </Link>
          )}
        </li>
        <li className="bez-pkt">
          <strong>0 pkt</strong>
          <span>za zaproszenia, logowanie, wpisy i obserwujących.</span>
        </li>
      </ul>
      <p>
        Punkty liczą się do awansu po {FIRST_POINT.maturationDays} dniach.{' '}
        <Link className="p-link" href="/drabinka">
          Pełne zasady Drabinki
        </Link>
      </p>
    </section>
  );
}

const ART: Record<OnboardingArt, ReactNode> = {
  rung: (
    <>
      <path
        d="M18 60 26 4M50 60 42 4"
        style={{ stroke: 'var(--line-2)' }}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M22 46h24M23 32h22"
        style={{ stroke: 'var(--text-muted)' }}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M25 18h18"
        style={{ stroke: 'var(--level-3)' }}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="5 5"
      />
    </>
  ),
  search: (
    <>
      <circle cx="27" cy="27" r="17" style={{ stroke: 'var(--text-muted)' }} strokeWidth="4" />
      <path
        d="m40 40 16 16"
        style={{ stroke: 'var(--text-muted)' }}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="27" cy="27" r="6" style={{ fill: 'var(--level-3)' }} />
    </>
  ),
  lantern: (
    <>
      <path
        d="M22 20h20l4 28H18z"
        style={{ stroke: 'var(--text-muted)' }}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M26 20c0-14 12-14 12 0M20 56h24"
        style={{ stroke: 'var(--text-muted)' }}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="35" r="8" style={{ fill: 'var(--level-5)' }} />
    </>
  ),
  ladder: (
    <>
      <path
        d="M18 60 26 4M50 60 42 4"
        style={{ stroke: 'var(--line-2)' }}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M22 46h24"
        style={{ stroke: 'var(--level-1)' }}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M23 32h22"
        style={{ stroke: 'var(--level-2)' }}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M25 18h18"
        style={{ stroke: 'var(--level-3)' }}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </>
  ),
};

export function Ilustracja({ n }: { n: OnboardingArt }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {ART[n]}
    </svg>
  );
}
