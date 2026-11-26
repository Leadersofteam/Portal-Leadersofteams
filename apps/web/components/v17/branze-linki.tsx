import Link from 'next/link';

// Linki do stron branż (PL4) pod listą: filtry listy to nie adresy, więc bez tego rzędu /zlecenia/branza/*
// i /uslugi/branza/* traciły linki z list głównych. Odstępstwo od makiety „Rynek” przyjęte 26.11 („Dodaj linki i włącz”).
export function BranzeLinki({
  branze,
  base,
}: {
  branze: { id: string; name: string; slug: string }[];
  base: '/zlecenia' | '/uslugi';
}) {
  if (!branze.length) return null;
  return (
    <div className="rn-branze">
      <span aria-hidden="true">Przeglądaj branże</span>
      <ul aria-label="Branże">
        {branze.map((b) => (
          <li key={b.id}>
            <Link href={`${base}/branza/${b.slug}`}>{b.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
