import { Sz, SzkieletStrumienia } from '@/components/v17/karty';
import { Rama, Stopka } from '@/components/v17/rama';
import { FILTRY } from '@/lib/v17-data';

// loading.tsx leży OBOK page.tsx listy (/feed). Nigdy nad [id]/[handle] — wtedy strona zwraca 200
// zamiast 404 (MINY). Rama, kompozytor, zakładki i prawa kolumna stoją od razu (jak w makiecie),
// szkielet zastępuje tylko wiersze strumienia; tożsamość nieznana, więc bez awatara i „Zaloguj się”.
export default function Loading() {
  return (
    <Rama
      aktywny="feed"
      boczna={
        <aside className="bok">
          <div className="bok-lepki" aria-hidden="true">
            <section className="karta hero-dr">
              <div style={{ display: 'grid', gap: 12 }}>
                <Sz w="40%" />
                <Sz w="60%" h={44} />
                <Sz w="80%" m />
              </div>
            </section>
            <Stopka />
          </div>
        </aside>
      }
    >
      <div className="naglowek">
        <h1>Strumień</h1>
      </div>
      <div className="zakres" aria-hidden="true">
        <a aria-current="true">Cała społeczność</a>
        <a>Obserwowani</a>
      </div>
      <div className="kompozytor" aria-hidden="true">
        <Sz w="48px" h={48} kolo />
        <div className="pole">
          <Sz w="70%" h={20} m />
        </div>
      </div>
      <nav className="filtry" data-przesuw aria-label="Filtr strumienia">
        {FILTRY.map(([k, t], i) => (
          <span key={k} className="filtr" aria-current={i === 0 ? 'true' : undefined}>
            {t}
          </span>
        ))}
      </nav>
      <SzkieletStrumienia />
    </Rama>
  );
}
