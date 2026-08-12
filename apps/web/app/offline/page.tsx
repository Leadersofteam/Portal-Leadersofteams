import type { Metadata } from 'next';
import Link from 'next/link';

// Strona-zaślepka dla service workera: musi być statyczna, bo w chwili jej
// pokazania nie ma sieci — żadnego serverApi, żadnych danych.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Jesteś offline — Leaders of Teams',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main>
      <div className="empty-state" style={{ marginTop: '3rem' }}>
        <h3>Jesteś offline — drabina poczeka</h3>
        <p>
          Nie mamy teraz połączenia z siecią. Twoje szczeble nigdzie nie uciekną: wróć, gdy zasięg
          wróci, a wszystko będzie na swoim miejscu.
        </p>
        <Link className="btn" href="/feed">
          Spróbuj ponownie
        </Link>
      </div>
    </main>
  );
}
