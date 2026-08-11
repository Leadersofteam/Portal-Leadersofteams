import { JsonLd } from '@/components/json-ld';
import { organizationJsonLd, websiteJsonLd } from '@/lib/jsonld';

export default function HomePage() {
  return (
    <main>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <section className="hero">
        <span className="hero-eyebrow">Marketplace B2B + społeczność Liderów</span>
        <h1>
          Portal Liderów i Firm —{' '}
          <span className="gradient-text">praca, mentoring, awans</span>
        </h1>
        <p>
          Budujemy platformę, na której Liderzy zdobywają pozycję wyłącznie realną pracą ocenianą
          przez Firmy i mentoringiem docenianym przez innych Liderów. Bez punktów za zapraszanie.
          Bez sztucznych mechanik. Najwyższe poziomy Drabinki Lidera dają prestiżowe odznaki,
          pierwszeństwo w katalogu i prawo do budowy własnego zespołu w Portalu.
        </p>
      </section>
      <section className="feature-grid">
        <div className="card">
          <span className="card-eyebrow">01</span>
          <h2>Marketplace zleceń</h2>
          <p>
            Firmy publikują potrzeby, Liderzy odpowiadają ofertą. Nowi zaczynają od mniejszych
            zleceń — zaufanie rośnie z poziomem.
          </p>
        </div>
        <div className="card">
          <span className="card-eyebrow">02</span>
          <h2>Grupy branżowe</h2>
          <p>
            Społeczność podzielona na sektory biznesu: dyskusje, pomysły, case studies oraz pytania
            i odpowiedzi, w których mentoring nagradzają sami Liderzy.
          </p>
        </div>
        <div className="card">
          <span className="card-eyebrow">03</span>
          <h2>Drabinka Lidera</h2>
          <p>
            7 poziomów. Punkty wyłącznie za ocenioną pracę i uznany mentoring. Zawsze widzisz, za co
            i ile — oraz ile brakuje do awansu.
          </p>
        </div>
        <div className="card">
          <span className="card-eyebrow">04</span>
          <h2>Zespoły</h2>
          <p>
            Docelowo Liderzy z poziomem 7 będą budować w Portalu własne zespoły i rekrutować w
            trybie ciągłym — aplikować będzie mógł każdy Lider od poziomu 3.
          </p>
        </div>
      </section>
    </main>
  );
}
