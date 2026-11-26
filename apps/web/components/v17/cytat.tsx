// Karta cytowanego wpisu (makieta braki.js: `cytat`). Cała prowadzi do oryginału; treść to zwykły tekst,
// bo linki wzmianek w środku dawałyby <a> w <a> (błąd hydracji #418, audyt UX 21.10).
import Link from 'next/link';

import type { QuotedPostView } from '@/components/quoted-post';
import { timeAgo } from '@/lib/v17';

import { Aw, Odznaka } from './znaki';

export function Cytat({ cytat, klikalny = true }: { cytat: QuotedPostView; klikalny?: boolean }) {
  if (!cytat.available) {
    return (
      <div className="bcyt">
        <span className="tekst">Cytowany wpis nie jest już dostępny.</span>
      </div>
    );
  }
  const imie = cytat.author?.displayName ?? 'Użytkownik';
  const srodek = (
    <>
      <span className="autor">
        <Aw
          name={imie}
          size={24}
          src={
            cytat.author?.avatarFileId ? `/api/v1/files/${cytat.author.avatarFileId}/thumb` : null
          }
        />
        <b>{imie}</b>
        {cytat.author?.level !== undefined ? <Odznaka level={cytat.author.level} /> : null}
        {cytat.createdAt ? <span className="czas">· {timeAgo(cytat.createdAt)}</span> : null}
      </span>
      <span className="tekst pre-wrap">{cytat.body}</span>
    </>
  );
  return klikalny ? (
    <Link className="bcyt" href={`/wpisy/${cytat.id}`}>
      {srodek}
    </Link>
  ) : (
    <div className="bcyt">{srodek}</div>
  );
}
