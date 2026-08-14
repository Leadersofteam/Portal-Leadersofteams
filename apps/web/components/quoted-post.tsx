import Link from 'next/link';

import { Avatar } from '@/components/ui/avatar';
import { MentionText } from '@/components/mention-text';

export interface QuotedPostView {
  id: string;
  available: boolean;
  body?: string;
  createdAt?: string;
  author?: {
    id: string;
    displayName: string;
    handle: string | null;
    avatarFileId: string | null;
  };
}

/**
 * Karta cytowanego wpisu („podaj dalej z komentarzem").
 *
 * Cytat jest CAŁY klikalny i prowadzi do oryginału — czytelnik ma dojść do
 * źródła, a nie tylko zobaczyć wycinek. Treść skracamy wizualnie (CSS), nie
 * w danych: obcięcie po stronie serwera odebrałoby czytnikom ekranu resztę zdania.
 */
export function QuotedPost({ quoted }: { quoted: QuotedPostView }) {
  if (!quoted.available) {
    // Mówimy wprost, zamiast pokazywać pustą ramkę. Autor cytatu odniósł się
    // do czegoś, czego już nie ma — i to jest informacja, nie usterka.
    return (
      <div className="quoted-post quoted-post-gone">
        <p className="muted">Cytowany wpis nie jest już dostępny.</p>
      </div>
    );
  }

  return (
    <Link href={`/wpisy/${quoted.id}`} className="quoted-post">
      <div className="quoted-post-head">
        <Avatar
          name={quoted.author?.displayName ?? 'Użytkownik'}
          size="sm"
          src={
            quoted.author?.avatarFileId ? `/api/v1/files/${quoted.author.avatarFileId}/thumb` : null
          }
        />
        <strong>{quoted.author?.displayName ?? 'Użytkownik'}</strong>
        {quoted.author?.handle && (
          <span className="muted quoted-post-handle">@{quoted.author.handle}</span>
        )}
      </div>
      <p className="quoted-post-body">
        <MentionText>{quoted.body ?? ''}</MentionText>
      </p>
    </Link>
  );
}
