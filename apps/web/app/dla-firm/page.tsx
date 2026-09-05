import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/json-ld';
import { LevelBadge } from '@/components/ui/level-badge';
import { hasTrust, TrustStrip } from '@/components/ui/trust-strip';
import { SITE_URL } from '@/lib/site';
import { publicApi } from '@/lib/server-api';

// Strona dla drugiej strony rynku (PL2). Landing mówi do Lidera („Dołącz jako
// Lider"), a Firma dostawała jeden przycisk prowadzący do ściany logowania.
// Tu Firma czyta, jak to działa Z JEJ strony, i wchodzi w formularz potrzeby
// bez konta — konto zakłada dopiero po opisaniu zlecenia (model Oferteo/Fixly,
// brief 3.4: publikacja bez weryfikacji na starcie).
// ADR-010: żadnych liczników „X firm już…", żadnej presji — same zasady.
export const metadata: Metadata = {
  title: 'Dla firm — zleć pracę Liderowi | Leaders of Teams',
  description:
    'Opisz potrzebę, dostań oferty od Liderów z jawnym poziomem i ocenami, dopytaj w rozmowie przy ofercie i wybierz. Bez prowizji, bez weryfikacji na starcie.',
  alternates: { canonical: '/dla-firm' },
};

export const revalidate = 300;

interface LeaderRow {
  id: string;
  displayName: string;
  headline: string;
  industry: { name: string };
  level: number;
  averageRating: number | null;
  reviewCount: number;
  completedOrders?: number;
}

const STEPS = [
  {
    title: 'Opisz potrzebę',
    body: 'Tytuł, branża, widełki budżetu i kilka zdań o tym, co ma powstać. Konto założysz w następnym kroku — jednym formularzem, razem z nazwą firmy.',
  },
  {
    title: 'Dostań oferty',
    body: 'Liderzy odpowiadają ofertą z kwotą i terminem. Przy każdej widzisz poziom w Drabince, oceny od innych Firm i liczbę zrealizowanych zleceń — żadnego z tych sygnałów nie da się kupić.',
  },
  {
    title: 'Dopytaj i wybierz',
    body: 'Każda oferta ma rozmowę: dopytasz o zakres, termin albo cenę, zanim wybierzesz. O nowej ofercie i odpowiedzi dostaniesz e-mail.',
  },
  {
    title: 'Odbierz pracę i oceń',
    body: 'Lider oddaje pracę, Ty potwierdzasz wykonanie. Oceniacie się nawzajem — obie oceny publikują się naraz, więc żadna strona nie ocenia „pod dyktando”.',
  },
];

const FAQ = [
  {
    q: 'Ile to kosztuje?',
    a: 'Nic. Portal nie pośredniczy w płatnościach i nie bierze prowizji — rozliczasz się bezpośrednio z Liderem.',
  },
  {
    q: 'Czy firma musi być zweryfikowana?',
    a: 'Nie. Publikujesz od razu po potwierdzeniu adresu e-mail. NIP jest opcjonalny; wiarygodność firmy budują oceny Liderów po zrealizowanych zleceniach.',
  },
  {
    q: 'Skąd wiem, że Lider jest dobry?',
    a: 'Z jego poziomu w Drabince. Punkty pochodzą wyłącznie z ocen po zrealizowanych zleceniach i z uznanego mentoringu — zero punktów za zapraszanie, płacenie czy aktywność. Każdy punkt ma jawne źródło.',
  },
  {
    q: 'Mogę ograniczyć oferty do doświadczonych Liderów?',
    a: 'Tak — ustawiasz minimalny poziom przy zleceniu. Zlecenia bez wymagań są dobrym startem dla nowych Liderów, którzy budują pierwsze oceny.',
  },
];

export default async function ForCompaniesPage() {
  const data = await publicApi<{ leaders: LeaderRow[] }>('/leaders?limit=6').catch(() => null);
  const leaders = (data?.leaders ?? []).filter((l) => l.level >= 1).slice(0, 3);

  return (
    <main className="landing">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Leaders of Teams', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Dla firm', item: `${SITE_URL}/dla-firm` },
          ],
        }}
      />

      <section className="hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">Dla firm</span>
          <h1>
            Opisz, co ma powstać. <span className="gradient-text">Wybierz, komu ufasz.</span>
          </h1>
          <p>
            Zlecenie publikujesz bez konta w pierwszym kroku i bez prowizji. Oferty składają
            Liderzy, których poziom i oceny są jawne i zapracowane — a przy każdej ofercie masz
            rozmowę, żeby dopytać, zanim wybierzesz.
          </p>
          <div className="hero-cta">
            <Link className="btn" href="/zlecenia/nowe">
              Opisz potrzebę
            </Link>
            <Link className="btn secondary" href="/uslugi">
              Przeglądaj gotowe usługi
            </Link>
          </div>
        </div>
      </section>

      <section>
        <span className="section-eyebrow">Jak to działa</span>
        <h2>Cztery kroki, jedno miejsce</h2>
        <div className="steps">
          {STEPS.map((s) => (
            <div className="step" key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {leaders.length > 0 && (
        <section>
          <span className="section-eyebrow">Kogo spotkasz</span>
          <h2>Poziom to dowód, nie deklaracja</h2>
          <div className="feature-grid">
            {leaders.map((leader) => (
              <Link key={leader.id} href={`/liderzy/${leader.id}`} className="card">
                <LevelBadge level={leader.level} />
                <h3 className="mt-2">{leader.displayName}</h3>
                <p>{leader.headline}</p>
                <p className="muted mt-1">{leader.industry.name}</p>
                {hasTrust({
                  averageRating: leader.averageRating,
                  reviewCount: leader.reviewCount,
                  completedOrders: leader.completedOrders ?? 0,
                }) && (
                  <TrustStrip
                    facts={{
                      averageRating: leader.averageRating,
                      reviewCount: leader.reviewCount,
                      completedOrders: leader.completedOrders ?? 0,
                    }}
                  />
                )}
              </Link>
            ))}
          </div>
          <p className="mt-2">
            <Link href="/liderzy">Przeglądaj cały katalog Liderów →</Link>
          </p>
        </section>
      )}

      <section>
        <span className="section-eyebrow">FAQ</span>
        <h2>Najczęstsze pytania firm</h2>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="card" style={{ textAlign: 'center' }}>
        <h2>Masz konkretną potrzebę?</h2>
        <p className="muted">Formularz zajmie dwie minuty. Konto założysz po nim, razem z firmą.</p>
        <Link className="btn" href="/zlecenia/nowe">
          Opisz potrzebę →
        </Link>
      </section>
    </main>
  );
}
