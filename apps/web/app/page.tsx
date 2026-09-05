import Link from 'next/link';

import { JsonLd } from '@/components/json-ld';
import { LadderArt } from '@/components/ui/ladder-art';
import { LevelBadge } from '@/components/ui/level-badge';
import { organizationJsonLd, websiteJsonLd } from '@/lib/jsonld';
import { LEVEL_NAMES } from '@/lib/levels';
import { publicApi } from '@/lib/server-api';

interface LeaderRow {
  id: string;
  displayName: string;
  headline: string;
  industry: { name: string };
  level: number;
  averageRating: number | null;
  reviewCount: number;
}

export default async function HomePage() {
  // Social proof: najlepsi realni Liderzy z katalogu (sekcja znika, gdy pusto).
  // publicApi (bez cookies, ISR 5 min) zamiast serverApi: dzięki temu landing
  // się prerenderuje i gość dostaje pełny HTML od razu, bez mignięcia
  // skeletonu z loading.tsx (PD1 — zmierzona podmiana treści ~1 s po wejściu).
  const leadersData = await publicApi<{ leaders: LeaderRow[] }>('/leaders?limit=3').catch(
    () => null,
  );
  const topLeaders = (leadersData?.leaders ?? []).filter((l) => l.level >= 1).slice(0, 3);

  return (
    <main className="landing">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />

      <section className="hero hero-split">
        <div className="hero-copy">
          <span className="hero-eyebrow">Marketplace B2B + społeczność Liderów</span>
          <h1>
            Status, którego nie da się kupić —{' '}
            <span className="gradient-text">tylko zapracować</span>
          </h1>
          <p>
            Liderzy zdobywają pozycję wyłącznie realną pracą ocenianą przez Firmy i mentoringiem
            docenianym przez innych Liderów. Bez punktów za zapraszanie. Bez sztucznych mechanik.
            Każdy punkt w Drabince ma jawne źródło.
          </p>
          <div className="hero-cta">
            <Link className="btn" href="/rejestracja">
              Dołącz jako Lider
            </Link>
            <Link className="btn secondary" href="/zlecenia/nowe">
              Dodaj zlecenie jako Firma
            </Link>
          </div>
          {/* PL3: droga od zera do Lidera ma własną stronę — landing tylko
              ją zapowiada, żeby nie stać się regulaminem. */}
          <p className="muted">
            <Link href="/droga">Zobacz całą Drogę Lidera: siedem szczebli, punkt po punkcie →</Link>
          </p>
          {/* Liczby-bohaterowie: statyczna narracja zasad, nie licznik metryk
              (ADR-010). „0 za zapraszanie" to nasz najważniejszy wyróżnik —
              stoi w jednym rzędzie z resztą, bo to zasada, nie przechwałka. */}
          <dl className="hero-stats" aria-label="Zasady platformy w liczbach">
            <div>
              <dt>7</dt>
              <dd>poziomów Drabinki</dd>
            </div>
            <div>
              <dt>2</dt>
              <dd>źródła punktów: praca i mentoring</dd>
            </div>
            <div>
              <dt>0</dt>
              <dd>punktów za zapraszanie</dd>
            </div>
          </dl>
        </div>
        <div className="hero-art-wrap">
          <LadderArt />
        </div>
      </section>

      <section>
        <span className="section-eyebrow">Jak to działa</span>
        <h2>Ucz się → Udowodnij → Wspinaj się</h2>
        <div className="steps">
          <div className="step">
            <h3>Zacznij od mniejszych zleceń</h3>
            <p>
              Firmy publikują potrzeby, Ty odpowiadasz ofertą. Nowi Liderzy zaczynają od zleceń
              dostępnych od poziomu 1 — zaufanie rośnie z każdą oceną.
            </p>
          </div>
          <div className="step">
            <h3>Zbieraj punkty za realną pracę</h3>
            <p>
              Punkty w Drabince pochodzą tylko z dwóch źródeł: zleceń ocenionych przez Firmy i
              odpowiedzi docenionych w Q&A. Wszystko widzisz w jawnym rejestrze.
            </p>
          </div>
          <div className="step">
            <h3>Odblokowuj kolejne poziomy</h3>
            <p>
              Wyższy poziom to większe zlecenia, prawo zakładania grup, a od poziomu Mentora —
              dostęp do aplikacji LOT: CRM, w którym na szczycie prowadzisz własny zespół.
            </p>
          </div>
        </div>
      </section>

      <section>
        <span className="section-eyebrow">Drabinka Lidera</span>
        <h2>7 poziomów. Im wyżej, tym cieplejsze światło.</h2>
        <div className="ladder-visual" aria-hidden="true">
          {LEVEL_NAMES.map((name, i) => (
            <div key={name} className="rung">
              <span>{name}</span>
              {i + 1}
            </div>
          ))}
        </div>
        <p className="muted">
          Bursztyn poziomu 7 trzeba zdobyć — nie da się go kupić, wynegocjować ani wyrekrutować.{' '}
          <Link href="/droga">Przejdź Drogę Lidera →</Link> ·{' '}
          <Link href="/drabinka">Jawne zasady punktacji →</Link>
        </p>
      </section>

      <section className="feature-grid">
        <div className="card feature-card" data-num="01">
          <h2>Marketplace zleceń</h2>
          <p>
            Firmy publikują potrzeby, Liderzy odpowiadają ofertą. Nowi zaczynają od mniejszych
            zleceń — zaufanie rośnie z poziomem.
          </p>
        </div>
        <div className="card feature-card" data-num="02">
          <h2>Grupy branżowe</h2>
          <p>
            Społeczność podzielona na sektory biznesu: dyskusje, pomysły, case studies oraz pytania
            i odpowiedzi, w których mentoring nagradzają sami Liderzy.
          </p>
        </div>
        <div className="card feature-card" data-num="03">
          <h2>Drabinka Lidera</h2>
          <p>
            7 poziomów. Punkty wyłącznie za ocenioną pracę i uznany mentoring. Zawsze widzisz, za co
            i ile — oraz ile brakuje do awansu.
          </p>
        </div>
        <div className="card feature-card" data-num="04">
          <h2>Zespoły</h2>
          <p>
            Docelowo Liderzy z poziomem 7 będą budować w Portalu własne zespoły i rekrutować w
            trybie ciągłym — aplikować będzie mógł każdy Lider od poziomu 3.
          </p>
        </div>
      </section>

      {topLeaders.length > 0 && (
        <section>
          <span className="section-eyebrow">Liderzy na platformie</span>
          <h2>Poziom to dowód, nie deklaracja</h2>
          <div className="feature-grid">
            {topLeaders.map((leader) => (
              <Link key={leader.id} href={`/liderzy/${leader.id}`} className="card">
                <LevelBadge level={leader.level} />
                <h3 className="mt-2">{leader.displayName}</h3>
                <p>{leader.headline}</p>
                <p className="muted mt-1">
                  {leader.industry.name}
                  {leader.reviewCount > 0 ? ` · ★ ${leader.averageRating}/5` : ''}
                </p>
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
        <h2>Najczęstsze pytania</h2>
        <div className="faq">
          <details>
            <summary>Czym to się różni od Fiverr czy Oferteo?</summary>
            <p>
              Tam kupujesz widoczność albo licytujesz ceną. Tu pozycję Lidera buduje wyłącznie
              oceniona praca i uznany mentoring — poziom w Drabince jest zweryfikowanym dowodem
              kompetencji, którego nie można kupić.
            </p>
          </details>
          <details>
            <summary>Czy to jakiś system MLM?</summary>
            <p>
              Nie — i to jest wbudowane w architekturę, nie tylko w regulamin. Zero punktów za
              zapraszanie, rekrutację, publikowanie treści czy samo logowanie. Rejestr punktów jest
              jawny: zawsze widać, za co i ile.
            </p>
          </details>
          <details>
            <summary>Ile kosztuje udział w platformie?</summary>
            <p>
              Rejestracja i korzystanie z marketplace, grup i Q&A są bezpłatne. Platforma nie
              pośredniczy w płatnościach — rozliczasz się bezpośrednio z drugą stroną.
            </p>
          </details>
          <details>
            <summary>Jak Firma może zlecić pracę?</summary>
            <p>
              Opisz potrzebę bez konta — konto i firmę założysz jednym krokiem po formularzu.
              Publikujesz po potwierdzeniu adresu e-mail. Oferty składają Liderzy o wymaganym
              poziomie, przy każdej masz rozmowę, a po realizacji oceniacie się nawzajem.{' '}
              <Link href="/dla-firm">Więcej dla firm →</Link>
            </p>
          </details>
          <details>
            <summary>Co daje wyższy poziom w Drabince?</summary>
            <p>
              Dostęp do większych zleceń, prawo zakładania grup branżowych (od poziomu 2), od
              poziomu 5 — dostęp do aplikacji LOT (CRM dla zespołów), a na poziomie 7 — własny
              zespół prowadzony w tej aplikacji. Poziom raz zdobyty nie wygasa.
            </p>
          </details>
        </div>
      </section>
      <span className="watermark" aria-hidden="true">
        LEADERS OF TEAMS
      </span>
    </main>
  );
}
