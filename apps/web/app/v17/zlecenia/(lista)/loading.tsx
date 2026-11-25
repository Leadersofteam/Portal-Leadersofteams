import { Sz } from '@/components/v17/karty';
import { Rama, Stopka } from '@/components/v17/rama';

// loading.tsx leży OBOK listy, w grupie (lista) — nigdy nad [id] (wtedy nieistniejące zlecenie daje 200 zamiast 404, MINY).
// Rama i nagłówek stoją od razu, szkielet zastępuje tylko wiersze; tożsamość nieznana, więc bez awatara.
export default function Loading() {
  return (
    <Rama aktywny="zlecenia">
      <div className="rn-gl">
        <div>
          <h1>Zlecenia</h1>
        </div>
      </div>
      <div role="status" aria-busy="true" aria-label="Wczytywanie zleceń">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div className="zl-w" key={i} aria-hidden="true">
            <span className="sz" style={{ width: 40, height: 40, borderRadius: 8 }} />
            <div style={{ display: 'grid', gap: 10, paddingTop: 2 }}>
              <Sz w="52%" h={11} m />
              <Sz w="86%" h={19} />
              <Sz w="64%" h={13} m />
            </div>
            <span className="sz" style={{ width: 44, height: 30, justifySelf: 'end' }} />
          </div>
        ))}
      </div>
      <div className="rn-stopka">
        <Stopka />
      </div>
    </Rama>
  );
}
