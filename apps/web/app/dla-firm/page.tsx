import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/json-ld';
import { LeaderRow, type LeaderRowData } from '@/components/ui/leader-row';
import { ListingCard, type ListingCardData } from '@/components/ui/listing-card';
import { FIRM_STEPS } from '@/lib/firm-steps';
import { SITE_URL } from '@/lib/site';
import { publicApi } from '@/lib/server-api';

// Strona dla drugiej strony rynku (PL2). Landing mówi do Lidera („Dołącz jako
// Lider"), a Firma dostawała jeden przycisk prowadzący do ściany logowania.
// Tu Firma czyta, jak to działa Z JEJ strony, i wchodzi w formularz potrzeby
// bez konta — konto zakłada dopiero po opisaniu zlecenia (model Oferteo/Fixly,
// brief 3.4: publikacja bez weryfikacji na starcie).
// ADR-010: żadnych liczników „X firm już…", żadnej presji — same zasady.
// Fala 2 (21.10): wchłonęła /szukam-wykonawcy (308 w next.config) — trzy drogi
// do Lidera i gotowe usługi są teraz tutaj, jedna strona na jedną intencję.
export const metadata: Metadata = {
  title: 'Dla firm — zleć pracę Liderowi | Leaders of Teams',
  description:
    'Opisz potrzebę i zbieraj oferty, wybierz gotową usługę z jawną ceną albo zapytaj konkretnego Lidera. Poziom i oceny Liderów są zapracowane, nie kupione. Bez prowizji.',
  alternates: { canonical: '/dla-firm' },
};

export const revalidate = 300;

// Trzy drogi do Lidera (dawne /szukam-wykonawcy). Pierwsza jest akcją główną —
// pozostałe dwie to skróty dla kogoś, kto już wie, czego chce.
const PATHS = [
  {
    title: 'Opisz potrzebę',
    body: 'Nie wiesz jeszcze kto — wiesz co. Publikujesz zlecenie z widełkami, Liderzy odpowiadają ofertą, Ty dopytujesz i wybierasz.',
    cta: 'Dodaj zlecenie',
    href: '/zlecenia/nowe',
  },
  {
    title: 'Wybierz gotową usługę',
    body: 'Konkretny zakres, deklarowana cena, pakiety. Wysyłasz zapytanie do Lidera i rozmawiacie w wątku — z niego powstaje zlecenie z pełnym cyklem ocen.',
    cta: 'Przeglądaj usługi',
    href: '/uslugi',
  },
  {
    title: 'Zapytaj konkretnego Lidera',
    body: 'Katalog z poziomem w Drabince, ocenami i liczbą zrealizowanych zleceń. Na profilu Lidera jest przycisk „Zapytaj”.',
    cta: 'Katalog Liderów',
    href: '/liderzy',
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
  const [leadersData, listingsData] = await Promise.all([
    publicApi<{ leaders: LeaderRowData[] }>('/leaders?limit=6').catch(() => null),
    publicApi<{ listings: ListingCardData[] }>('/listings?limit=3').catch(() => null),
  ]);
  const leaders = (leadersData?.leaders ?? []).filter((l) => l.level >= 1).slice(0, 3);
  const listings = (listingsData?.listings ?? []).slice(0, 3);

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
            Opisz, co ma powstać. <span className="rung-mark">Wybierz, komu ufasz.</span>
          </h1>
          <p>
            Zlecenie opisujesz bez konta i bez prowizji. Oferty składają Liderzy, których poziom i
            oceny są jawne i zapracowane — a przy każdej ofercie masz rozmowę, żeby dopytać, zanim
            wybierzesz.
          </p>
          <div className="hero-cta">
            <Link className="btn" href="/zlecenia/nowe">
              Dodaj zlecenie
            </Link>
            <Link className="btn secondary" href="/uslugi">
              Przeglądaj gotowe usługi
            </Link>
          </div>
        </div>
      </section>

      <section>
        <span className="section-eyebrow">Jak to działa</span>
        <h2>Od opisu do ocenionej pracy</h2>
        <ol className="climb">
          {FIRM_STEPS.map((s) => (
            <li key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <span className="section-eyebrow">Trzy drogi do Lidera</span>
        <h2>Wiesz, czego potrzebujesz — wybierz wejście</h2>
        <ul className="paths">
          {PATHS.map((p) => (
            <li key={p.title}>
              <div>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
              <Link href={p.href}>{p.cta} →</Link>
            </li>
          ))}
        </ul>
      </section>

      {listings.length > 0 && (
        <section>
          <span className="section-eyebrow">Gotowe usługi</span>
          <h2>Konkretny zakres, jawna cena</h2>
          <div className="feature-grid">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          <p className="mt-2">
            <Link href="/uslugi">Wszystkie usługi →</Link>
          </p>
        </section>
      )}

      {leaders.length > 0 && (
        <section>
          <span className="section-eyebrow">Kogo spotkasz</span>
          <h2>Poziom to dowód, nie deklaracja</h2>
          <div className="leader-list">
            {leaders.map((leader) => (
              <LeaderRow key={leader.id} leader={leader} />
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

      <section className="closing-cta">
        <h2>Masz konkretną potrzebę?</h2>
        <p className="muted">Formularz zajmie dwie minuty. Konto założysz po nim, razem z firmą.</p>
        <Link className="btn" href="/zlecenia/nowe">
          Dodaj zlecenie
        </Link>
      </section>
    </main>
  );
}
