export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <h1>Portal Liderów i Firm — praca, mentoring, awans</h1>
        <p>
          Budujemy platformę, na której Liderzy zdobywają pozycję wyłącznie realną pracą ocenianą
          przez Firmy i mentoringiem docenianym przez innych Liderów. Bez punktów za zapraszanie.
          Bez sztucznych mechanik. Najwyższe poziomy Drabinki Lidera odblokowują darmowy dostęp do
          app.leadersofteams.com i możliwość zbudowania własnego zespołu.
        </p>
        <p className="muted">Trwają prace nad platformą — start wkrótce.</p>
      </section>
      <section className="feature-grid">
        <div className="card">
          <h2>Marketplace zleceń</h2>
          <p>
            Firmy publikują potrzeby, Liderzy odpowiadają ofertą. Nowi zaczynają od mniejszych
            zleceń — zaufanie rośnie z poziomem.
          </p>
        </div>
        <div className="card">
          <h2>Grupy branżowe</h2>
          <p>
            Społeczność podzielona na sektory biznesu: dyskusje, pomysły i case studies zespołów —
            także tych działających w app.leadersofteams.com.
          </p>
        </div>
        <div className="card">
          <h2>Drabinka Lidera</h2>
          <p>
            7 poziomów. Punkty wyłącznie za ocenioną pracę i uznany mentoring. Zawsze widzisz, za co
            i ile — oraz ile brakuje do awansu.
          </p>
        </div>
        <div className="card">
          <h2>Zespoły</h2>
          <p>
            Liderzy z poziomem 7 budują zespoły i rekrutują w trybie ciągłym. Aplikować może każdy
            Lider od poziomu 3.
          </p>
        </div>
      </section>
    </main>
  );
}
