// Wiersze społecznościowe strumienia (makieta braki.js): wpis portalowy i awans na szczebel.
// ADR-010: bez liczników docenień i wyświetleń. ADR-004: wpis nie daje punktów — wiersz niczego takiego nie sugeruje.
import Link from 'next/link';
import { fileVariantUrl } from '@lot/contracts';

import { MentionText } from '@/components/mention-text';
import { LEVEL_NAMES } from '@/lib/levels';
import { timeAgo } from '@/lib/v17';
import type { Aktor, Wpis } from '@/lib/v17-data';

import { Cytat } from './cytat';
import { Ico } from './ico';
import { AkcjeWpisu } from './wpis-akcje';
import { Glowa } from './wpisy';
import { Aw } from './znaki';

const awatar = (a: Aktor) => (a.avatarFileId ? `/api/v1/files/${a.avatarFileId}/thumb` : null);
const profil = (a: Aktor) => (a.handle ? `/profil/${a.handle}` : null);

// Miniatura w strumieniu, pełny wariant po kliknięciu (na sieci komórkowej nie pobieramy czterech dużych obrazów).
function Zdjecia({ pliki, autor }: { pliki: string[]; autor: string }) {
  const lista = pliki.slice(0, 4);
  return (
    <div className="zdjecia" data-ile={lista.length}>
      {lista.map((id, i) => (
        <a
          key={id}
          href={fileVariantUrl(id, 'full')}
          target="_blank"
          rel="noreferrer"
          aria-label={
            lista.length > 1 ? `Zdjęcie ${i + 1} z ${lista.length}` : `Zdjęcie do wpisu — ${autor}`
          }
        >
          <img src={fileVariantUrl(id, 'thumb')} alt="" loading="lazy" />
        </a>
      ))}
    </div>
  );
}

export function WierszWpisu({
  w,
  zalogowany,
}: {
  w: Extract<Wpis, { k: 'wpis' }>;
  zalogowany: boolean;
}) {
  const czas = timeAgo(w.at);
  const href = `/wpisy/${w.id}`;
  return (
    <article className="wpis">
      <Aw name={w.autor.name} size={40} src={awatar(w.autor)} />
      <div>
        <Glowa
          imie={w.autor.name}
          href={profil(w.autor)}
          level={w.autor.level}
          czas={czas}
          czasHref={href}
          k="wpis"
          meta={w.branza ?? ''}
        />
        {w.tresc ? (
          <p className="tresc">
            <MentionText>{w.tresc}</MentionText>
          </p>
        ) : null}
        {w.cytat ? <Cytat cytat={w.cytat} /> : null}
        {w.zdjecia.length ? <Zdjecia pliki={w.zdjecia} autor={w.autor.name} /> : null}
        <AkcjeWpisu
          postId={w.id}
          autor={w.autor.name}
          komentarze={w.komentarze}
          doceniony={w.doceniony}
          zapisany={w.zapisany}
          zalogowany={zalogowany}
        />
      </div>
    </article>
  );
}

export function WierszAwansu({ w }: { w: Extract<Wpis, { k: 'awans' }> }) {
  return (
    <article className="wpis">
      <Aw name={w.lider.name} size={40} ring level={w.lider.level} src={awatar(w.lider)} />
      <div>
        <Glowa
          imie={w.lider.name}
          href={profil(w.lider)}
          level={w.lider.level}
          czas={timeAgo(w.at)}
          k="awans"
          meta={w.branza ?? ''}
        />
        <Link className="awans" href="/drabinka">
          <Ico n="ladder" />
          <span>
            <b>Awans na szczebel „{LEVEL_NAMES[w.szczebel - 1]}”</b>
            <small>Zdobyty z ocen po zleceniach i uznanych odpowiedzi</small>
          </span>
        </Link>
      </div>
    </article>
  );
}
