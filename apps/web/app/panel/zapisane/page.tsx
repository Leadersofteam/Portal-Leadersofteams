import Link from 'next/link';
import { redirect } from 'next/navigation';

import { BookmarkButton } from '@/components/bookmark-button';
import { MentionText } from '@/components/mention-text';
import { EmptyState } from '@/components/ui/empty-state';
import { formatFeedTime } from '@/lib/labels';
import { serverApi } from '@/lib/server-api';

export const metadata = { title: 'Zapisane — Leaders of Teams' };

interface BookmarkItem {
  subjectType: 'SOCIAL_POST' | 'POST';
  subjectId: string;
  savedAt: string;
  title: string | null;
  body: string;
  authorName: string;
  groupId: string | null;
  groupName: string | null;
  publishedAt: string;
}

// Strona jest pod /panel świadomie: robots.ts wyklucza z indeksacji CAŁĄ tę
// strefę, więc prywatna półka nie wymaga osobnej reguły, o której ktoś by
// kiedyś zapomniał.
export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  const sp = await searchParams;
  const cursor = typeof sp.cursor === 'string' ? sp.cursor : '';
  const data = await serverApi<{ items: BookmarkItem[]; nextCursor: string | null }>(
    `/me/bookmarks${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
  );
  const items = data?.items ?? [];

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/panel">← Baza wspinacza</Link>
      </div>

      <h1>Zapisane</h1>
      <p className="muted">
        Twoja prywatna półka. Nikt nie widzi, co zapisujesz, i nigdzie nie ma liczby zapisań —
        zakładka jest notatką dla siebie, nie oceną dla innych.
      </p>

      {items.length === 0 ? (
        <EmptyState
          art="inbox"
          title={cursor ? 'To już koniec listy' : 'Nic tu jeszcze nie leży'}
          ctaHref="/feed"
          ctaLabel="Przejrzyj feed"
        >
          Kliknij „Zapisz" pod wpisem albo postem w grupie, a wróci tutaj — także po tygodniu.
        </EmptyState>
      ) : (
        items.map((item) => {
          const href =
            item.subjectType === 'SOCIAL_POST'
              ? `/wpisy/${item.subjectId}`
              : `/grupy/${item.groupId}/post/${item.subjectId}`;
          return (
            <article key={`${item.subjectType}:${item.subjectId}`} className="card mt-2">
              <div className="meta">
                {item.authorName}
                {item.groupName ? ` · grupa ${item.groupName}` : ' · wpis portalowy'} · zapisano{' '}
                <time dateTime={item.savedAt}>{formatFeedTime(item.savedAt)}</time>
              </div>
              {item.title ? (
                <h3>
                  <Link href={href}>{item.title}</Link>
                </h3>
              ) : null}
              <p className="description">
                <MentionText>
                  {item.body.length > 280 ? `${item.body.slice(0, 280)}…` : item.body}
                </MentionText>
              </p>
              <div className="actions-row">
                <Link className="btn secondary" href={href}>
                  Otwórz
                </Link>
                {/* `initialActive` zawsze true — to lista zapisanych, więc
                    przycisk służy tu wyłącznie do zdjęcia z półki. */}
                <BookmarkButton
                  subjectType={item.subjectType}
                  subjectId={item.subjectId}
                  initialActive
                />
              </div>
            </article>
          );
        })
      )}

      {data?.nextCursor && (
        <p className="mt-3">
          <Link
            className="btn secondary"
            href={`/panel/zapisane?cursor=${encodeURIComponent(data.nextCursor)}`}
          >
            Wczytaj więcej
          </Link>
        </p>
      )}
    </main>
  );
}
