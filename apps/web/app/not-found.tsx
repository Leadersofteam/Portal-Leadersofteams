import Link from 'next/link';

import { Stan404 } from '@/components/v17p6/stany';

export default function NotFound() {
  return (
    <Stan404
      dzis={
        <main>
          <div className="empty-state" style={{ marginTop: '3rem' }}>
            <h3>404 — ta strona nie istnieje</h3>
            <p>Rekord mógł zostać usunięty albo adres jest niepełny.</p>
            <Link className="btn" href="/">
              Wróć na stronę główną
            </Link>
          </div>
        </main>
      }
    />
  );
}
