import { Sz } from '@/components/v17/karty';
import { Rama, Stopka } from '@/components/v17/rama';

// loading.tsx obok listy (grupa (lista)), nigdy nad [slug] — patrz komentarz w zlecenia/(lista)/loading.tsx.
export default function Loading() {
  return (
    <Rama aktywny="uslugi" szeroka>
      <div className="rn-gl">
        <div>
          <h1>Usługi</h1>
        </div>
      </div>
      <div className="rn-siatka" role="status" aria-busy="true" aria-label="Wczytywanie usług">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div className="uk" key={i} aria-hidden="true">
            <div className="sz" style={{ aspectRatio: '16/9', borderRadius: 'var(--radius)' }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
              <Sz w="28px" h={28} kolo />
              <Sz w="46%" h={12} m />
            </div>
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              <Sz w="96%" h={15} />
              <Sz w="62%" h={15} />
            </div>
          </div>
        ))}
      </div>
      <div className="rn-stopka">
        <Stopka />
      </div>
    </Rama>
  );
}
