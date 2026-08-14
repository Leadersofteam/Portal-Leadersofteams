import Link from 'next/link';

import { AppreciateButton } from '@/components/appreciate-button';
import { MentionText } from '@/components/mention-text';
import { ShareButton } from '@/components/share-button';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { LevelBadge } from '@/components/ui/level-badge';
import { formatFeedTime } from '@/lib/labels';
import { PostMedia } from '@/components/post-media';
import { QuotedPost } from '@/components/quoted-post';
import type { QuotedPostView } from '@/components/quoted-post';
import { serverApi } from '@/lib/server-api';

import { Composer } from './composer';

export const metadata = { title: 'Feed społeczności — Leaders of Teams' };

type FeedScope = 'following' | 'all';

interface FeedItem {
  id: string;
  type:
    | 'POST_PUBLISHED'
    | 'LISTING_PUBLISHED'
    | 'ANSWER_ACCEPTED'
    | 'LEVEL_ACHIEVED'
    | 'SOCIAL_POST_PUBLISHED';
  subjectId: string;
  meta: Record<string, unknown>;
  createdAt: string;
  post?: {
    body: string;
    editedAt: string | null;
    imageFileIds: string[];
    quoted: QuotedPostView | null;
    appreciations: number;
    comments: number;
  };
  actor: {
    id: string;
    displayName: string;
    handle: string | null;
    avatarFileId: string | null;
    level: number;
  };
}

// Opis zdarzenia w feedzie. Wpis portalowy jest wyjątkiem: nie opisujemy go
// zdaniem, tylko pokazujemy treść — to jedyny typ, który sam w sobie JEST treścią.
function itemDescription(item: FeedItem): { text: string; href: string | null } {
  const meta = item.meta;
  switch (item.type) {
    case 'POST_PUBLISHED':
      return {
        text: `opublikował(a) wpis „${String(meta.title ?? '')}" w grupie ${String(meta.groupName ?? '')}`,
        href: meta.groupId ? `/grupy/${meta.groupId}/post/${item.subjectId}` : null,
      };
    case 'LISTING_PUBLISHED':
      return {
        text: `dodał(a) usługę „${String(meta.title ?? '')}"`,
        href: meta.slug ? `/uslugi/${meta.slug}` : null,
      };
    case 'ANSWER_ACCEPTED':
      return {
        text: `pomógł/pomogła w pytaniu „${String(meta.threadTitle ?? '')}" — odpowiedź zaakceptowana`,
        href: meta.threadId ? `/watki/${meta.threadId}` : null,
      };
    case 'LEVEL_ACHIEVED':
      return {
        text: `zdobył(a) poziom ${String(meta.level ?? '')} w Drabince Lidera`,
        href: '/drabinka',
      };
    default:
      return { text: 'nowa aktywność', href: null };
  }
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  const isLoggedIn = Boolean(me?.user);

  // Gość zawsze ląduje na „całej społeczności" — pusty rynek nie wybacza
  // ekranu logowania jako pierwszego wrażenia.
  const requested = params.zakres === 'wszyscy' ? 'all' : 'following';
  const scope: FeedScope = isLoggedIn ? requested : 'all';
  const cursor = typeof params.cursor === 'string' ? params.cursor : '';

  const query = new URLSearchParams({ scope });
  if (cursor) query.set('cursor', cursor);
  const data = await serverApi<{
    items: FeedItem[];
    nextCursor: string | null;
    followingCount: number;
  }>(`/feed?${query.toString()}`);

  // „Podaj dalej" prowadzi na /feed?cytuj=<id> — cytowany wpis pobieramy po
  // stronie serwera, żeby kompozytor od razu pokazał, CO właściwie podajesz
  // dalej. Bez tego użytkownik widziałby samo „podajesz dalej wybrany wpis"
  // i musiał wierzyć na słowo.
  const quotedPostId = typeof params.cytuj === 'string' ? params.cytuj : undefined;
  const quotedPreview = quotedPostId
    ? await serverApi<{ post: { body: string } }>(`/social/posts/${quotedPostId}`)
    : null;
  const quotedLabel = quotedPreview?.post.body
    ? quotedPreview.post.body.slice(0, 60) + (quotedPreview.post.body.length > 60 ? '…' : '')
    : undefined;

  // Popularne tematy jako NAWIGACJA, nie ranking treści (ADR-010). Feed niżej
  // pozostaje ściśle chronologiczny — chipy tylko pomagają znaleźć rozmowę,
  // której nie da się wyszukać (frazy krótsze niż 3 znaki nie wchodzą do FULLTEXT).
  const topicsData = await serverApi<{
    topics: Array<{ name: string; slug: string; count: number }>;
  }>('/topics/popular');
  const topics = topicsData?.topics ?? [];

  const items = data?.items ?? [];
  const followingCount = data?.followingCount ?? 0;
  const hrefFor = (s: FeedScope) => (s === 'all' ? '/feed?zakres=wszyscy' : '/feed');

  return (
    <main>
      <h1>Feed społeczności</h1>
      <p className="muted">
        Chronologicznie — bez algorytmu, bez nieskończonego scrolla. To Ty decydujesz, kogo
        słuchasz.
      </p>

      {isLoggedIn && (
        <nav className="feed-tabs" aria-label="Zakres feedu">
          <Link href={hrefFor('following')} className={scope === 'following' ? 'active' : ''}>
            Obserwowani
          </Link>
          <Link href={hrefFor('all')} className={scope === 'all' ? 'active' : ''}>
            Cała społeczność
          </Link>
        </nav>
      )}

      {topics.length > 0 && (
        <ul className="tag-chips" aria-label="Popularne tematy">
          {topics.map((topic) => (
            <li key={topic.slug}>
              <Link className="tag-chip" href={`/tematy/${topic.slug}`}>
                #{topic.name} <span className="muted">({topic.count})</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {isLoggedIn ? (
        <Composer quotedPostId={quotedPostId} quotedLabel={quotedLabel} />
      ) : (
        <div className="card mt-2">
          <p className="mt-0">
            <Link href="/rejestracja">Załóż konto</Link>, żeby publikować wpisy, doceniać pracę
            innych i budować swój poziom w Drabince.
          </p>
        </div>
      )}

      {items.length === 0 ? (
        scope === 'following' && followingCount === 0 ? (
          <EmptyState
            art="ladder"
            title="Nie obserwujesz jeszcze nikogo"
            ctaHref="/feed?zakres=wszyscy"
            ctaLabel="Zobacz całą społeczność"
          >
            Wejdź na profil Lidera i kliknij „Obserwuj" — jego wpisy, usługi i awanse pojawią się
            tutaj.
          </EmptyState>
        ) : (
          <EmptyState art="inbox" title="Na razie cisza">
            {scope === 'following'
              ? `Obserwowani (${followingCount}) nie opublikowali jeszcze nic nowego.`
              : 'Nikt jeszcze nic nie opublikował. Możesz być pierwszy.'}
          </EmptyState>
        )
      ) : (
        <div className="feed-list">
          {items.map((item) => {
            const isPost = item.type === 'SOCIAL_POST_PUBLISHED' && item.post;
            const { text, href } = itemDescription(item);
            return (
              <article key={item.id} className="feed-card">
                <Avatar
                  name={item.actor.displayName}
                  size="sm"
                  src={
                    item.actor.avatarFileId
                      ? `/api/v1/files/${item.actor.avatarFileId}/thumb`
                      : null
                  }
                />
                <div className="feed-card-body">
                  <div className="feed-card-head">
                    {item.actor.handle ? (
                      <Link href={`/profil/${item.actor.handle}`}>
                        <strong>{item.actor.displayName}</strong>
                      </Link>
                    ) : (
                      <strong>{item.actor.displayName}</strong>
                    )}
                    {item.actor.level >= 1 && <LevelBadge level={item.actor.level} />}
                    <time dateTime={item.createdAt} className="feed-card-time">
                      {formatFeedTime(item.createdAt)}
                    </time>
                  </div>

                  {isPost ? (
                    <>
                      {item.post!.body && (
                        <p className="feed-post-body">
                          <MentionText>{item.post!.body}</MentionText>
                        </p>
                      )}
                      {item.post!.quoted && <QuotedPost quoted={item.post!.quoted} />}
                      <PostMedia
                        fileIds={item.post!.imageFileIds}
                        alt={`Obraz do wpisu — ${item.actor.displayName}`}
                      />
                      <div className="feed-card-actions">
                        <AppreciateButton
                          postId={item.subjectId}
                          initialCount={item.post!.appreciations}
                          initialActive={false}
                        />
                        <Link className="feed-action" href={`/wpisy/${item.subjectId}`}>
                          {item.post!.comments > 0
                            ? `Komentarze (${item.post!.comments})`
                            : 'Skomentuj'}
                        </Link>
                        {isLoggedIn && (
                          <Link
                            className="feed-action"
                            href={`/feed?cytuj=${item.subjectId}#composer`}
                          >
                            Podaj dalej
                          </Link>
                        )}
                        <ShareButton
                          url={`/wpisy/${item.subjectId}`}
                          title={`Wpis ${item.actor.displayName} — Leaders of Teams`}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="feed-card-text">
                      {href ? <Link href={href}>{text}</Link> : text}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {data?.nextCursor && (
        <p className="mt-2">
          <Link
            className="btn secondary"
            href={`${hrefFor(scope)}${scope === 'all' ? '&' : '?'}cursor=${encodeURIComponent(data.nextCursor)}`}
          >
            Wczytaj więcej
          </Link>
        </p>
      )}
    </main>
  );
}
