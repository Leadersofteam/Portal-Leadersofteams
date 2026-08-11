import Link from 'next/link';

export default function NotFound() {
  return (
    <main>
      <div className="empty-state" style={{ marginTop: '3rem' }}>
        <h3>404 — ta strona nie istnieje</h3>
        <p>Rekord mógł zostać usunięty albo adres jest niepełny.</p>
        <Link className="btn" href="/">
          Wróć na stronę główną
        </Link>
      </div>
    </main>
  );
}
