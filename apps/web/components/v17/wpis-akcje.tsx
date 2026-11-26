'use client';

// Pasek akcji wpisu (makieta braki.js: komentarze, docenienie, zapis, „Podaj dalej”, udostępnij).
// Logika docenienia i zakładki wspólna ze starym wyglądem (lib/use-reakcje); różni się tylko przycisk —
// tu BEZ licznika docenień (ADR-010).
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useDocenienie, useZakladka } from '@/lib/use-reakcje';

import { Ico } from './ico';
import type { IcoName } from './ico';
import { Udostepnij } from './udostepnij';

function Przelacznik({
  ikona,
  nazwa,
  wlaczony,
  zajety,
  onClick,
}: {
  ikona: IcoName;
  nazwa: string;
  wlaczony: boolean;
  zajety: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`akcja${wlaczony ? ' wl' : ''}`}
      type="button"
      aria-pressed={wlaczony}
      aria-label={nazwa}
      title={nazwa}
      disabled={zajety}
      onClick={onClick}
    >
      <Ico n={ikona} />
    </button>
  );
}

export function AkcjeWpisu({
  postId,
  autor,
  komentarze,
  doceniony,
  zapisany,
  zalogowany,
}: {
  postId: string;
  autor: string;
  komentarze: number;
  doceniony: boolean;
  zapisany: boolean;
  zalogowany: boolean;
}) {
  const router = useRouter();
  const d = useDocenienie(postId, doceniony);
  const z = useZakladka('SOCIAL_POST', postId, zapisany);
  const href = `/wpisy/${postId}`;
  return (
    <div className="akcje wpisu">
      <Link
        className="akcja odp"
        href={href}
        aria-label={`Skomentuj${komentarze ? `, komentarzy: ${komentarze}` : ''}`}
      >
        <Ico n="chat-circle" />
        {komentarze ? <span aria-hidden="true">{komentarze}</span> : null}
      </Link>
      <Przelacznik
        ikona="hands-clapping"
        nazwa={d.active ? 'Cofnij docenienie' : 'Doceniam'}
        wlaczony={d.active}
        zajety={d.pending}
        onClick={() => void d.toggle()}
      />
      <Przelacznik
        ikona="bookmark-simple"
        nazwa={z.active ? 'Usuń z zapisanych' : 'Zapisz na później'}
        wlaczony={z.active}
        zajety={z.pending}
        onClick={() => void z.toggle()}
      />
      <button
        className="akcja"
        type="button"
        aria-label="Podaj dalej"
        title="Podaj dalej"
        onClick={() => router.push(zalogowany ? `/feed?cytuj=${postId}` : '/logowanie')}
      >
        <Ico n="repeat" />
      </button>
      <Udostepnij href={href} tytul={`Wpis ${autor} — Leaders of Teams`} />
    </div>
  );
}
