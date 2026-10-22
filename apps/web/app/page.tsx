import Link from 'next/link';

import { JsonLd } from '@/components/json-ld';
import { LadderScene } from '@/components/ui/ladder-scene';
import { LeaderRow, type LeaderRowData } from '@/components/ui/leader-row';
import { FIRM_STEPS } from '@/lib/firm-steps';
import { organizationJsonLd, websiteJsonLd } from '@/lib/jsonld';
import { LEVEL_NAMES } from '@/lib/levels';
import { publicApi } from '@/lib/server-api';

export default async function HomePage() {
  // Social proof: najlepsi realni Liderzy z katalogu (sekcja znika, gdy pusto).
  // publicApi (bez cookies, ISR 5 min) zamiast serverApi: dzięki temu landing
  // się prerenderuje i gość dostaje pełny HTML od razu, bez mignięcia
  // skeletonu z loading.tsx (PD1 — zmierzona podmiana treści ~1 s po wejściu).
  const leadersData = await publicApi<{ leaders: LeaderRowData[] }>('/leaders?limit=3').catch(
    () => null,
  );
  const topLeaders = (leadersData?.leaders ?? []).filter((l) => l.level >= 1).slice(0, 3);

  return (
    <main className="landing">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />

      {/* Fala 2 (21.10, decyzja właściciela): hero mówi, co GOŚĆ dostaje, a akcją
          główną jest Firma — to ona przynosi zlecenia, bez których Drabinka nie ma
          z czego punktować. Zasada „status trzeba zapracować" zostaje, ale jako
          dowód pod obietnicą (podtytuł + liczby), nie jako nagłówek. */}
      <section className="hero hero-split">
        <div className="hero-copy">
          <span className="hero-eyebrow">Marketplace B2B · Liderzy zespołów</span>
          <h1>
            Opisz zlecenie. Oferty złożą <span className="rung-mark">sprawdzeni</span> Liderzy.
          </h1>
          <p>
            Sprzedaż, operacje, projekty, automatyzacja — Liderzy odpowiadają ofertą z kwotą i
            terminem. Przy każdej widzisz poziom w Drabince, oceny innych firm i zrealizowane
            zlecenia. Bez prowizji, bez konta na start.
          </p>
          <div className="hero-cta">
            <Link className="btn" href="/zlecenia/nowe">
              Dodaj zlecenie
            </Link>
            <Link className="btn secondary" href="/rejestracja">
              Szukam zleceń — dołącz jako Lider
            </Link>
          </div>
          {/* Liczby-bohaterowie: statyczne zasady, nie licznik metryk (ADR-010).
              Każda jest prawdą z kodu: brak płatności w Portalu, szkic gościa
              przed kontem, zero punktów za zapraszanie (ADR-004). */}
          <dl className="hero-stats" aria-label="Zasady platformy w liczbach">
            <div>
              <dt>0 zł</dt>
              <dd>prowizji i opłat za zlecenie</dd>
            </div>
            <div>
              <dt>2</dt>
              <dd>kroki: opis potrzeby, potem konto</dd>
            </div>
            <div>
              <dt>0</dt>
              <dd>punktów do kupienia — poziom to oceniona praca</dd>
            </div>
          </dl>
        </div>
        <div className="hero-art-wrap">
          {/* Drabinka 3D (kierunek „Instrument w przestrzeni"); bez WebGL zostaje SVG. */}
          <LadderScene />
        </div>
      </section>

      {/* Zamiast siatki 3 kart z numerami: wspinaczka po szczeblach. Każdy krok
          stoi na szczeblu w kolorze poziomu (--level-*), od chłodnego do
          bursztynu — ta sama nić co Drabinka, bez kart i numerów-cieni. */}
      <section>
        <span className="section-eyebrow">Jak zlecić pracę</span>
        <h2>Od opisu do ocenionej pracy</h2>
        <ol className="climb">
          {FIRM_STEPS.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-2">
          <Link className="btn" href="/zlecenia/nowe">
            Dodaj zlecenie
          </Link>
        </p>
      </section>

      {topLeaders.length > 0 && (
        <section>
          <span className="section-eyebrow">Kogo spotkasz</span>
          <h2>Poziom to dowód, nie deklaracja</h2>
          <div className="leader-list">
            {topLeaders.map((leader) => (
              <LeaderRow key={leader.id} leader={leader} />
            ))}
          </div>
          <p className="mt-2">
            <Link href="/liderzy">Przeglądaj cały katalog Liderów →</Link>
          </p>
        </section>
      )}

      {/* Druga publiczność — Lider. Jedna sekcja zamiast trzech (kroki, drabinka,
          4 karty funkcji): drabinka mówi to samo, co karty, tylko w naszym języku. */}
      <section className="leader-door">
        <span className="section-eyebrow">Dla Liderów</span>
        <h2>Szukasz zleceń? Pozycję budujesz pracą, nie znajomościami.</h2>
        <p className="muted">
          Punkty w Drabince dają wyłącznie oceny Firm po zrealizowanym zleceniu i odpowiedzi uznane
          w Q&amp;A. Wyższy poziom to większe zlecenia, prawo zakładania grup, a od poziomu 5 —
          dostęp do aplikacji LOT, w której prowadzisz własny zespół.
        </p>
        <div className="ladder-visual" aria-hidden="true">
          {LEVEL_NAMES.map((name, i) => (
            <div key={name} className="rung">
              <span>{name}</span>
              {i + 1}
            </div>
          ))}
        </div>
        <div className="hero-cta">
          <Link className="btn secondary" href="/rejestracja">
            Dołącz jako Lider
          </Link>
        </div>
        <p className="muted mt-2">
          <Link href="/droga">Droga Lidera, szczebel po szczeblu →</Link> ·{' '}
          <Link href="/drabinka">Jawne zasady punktacji →</Link>
        </p>
      </section>

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
