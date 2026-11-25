import { SzWiersz, Sz } from '@/components/v17/karty';
import { Rama } from '@/components/v17/rama';

export default function Loading() {
  return (
    <Rama aktywny="drabinka" szeroka>
      <div role="status" aria-busy="true" aria-label="Wczytywanie Drabinki">
        <section className="dr-hero" style={{ display: 'grid', gap: 14 }}>
          <Sz w="30%" />
          <Sz w="70%" h={36} />
          <Sz w="55%" h={14} m />
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 8 }}>
            <Sz w="60px" h={60} kolo />
            <div style={{ flex: 1, display: 'grid', gap: 10 }}>
              <Sz w="40%" h={16} />
              <Sz w="100%" h={8} m />
            </div>
          </div>
        </section>
        <section className="sekcja">
          <Sz w="36%" h={18} />
          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <SzWiersz key={i} />
            ))}
          </div>
        </section>
      </div>
    </Rama>
  );
}
