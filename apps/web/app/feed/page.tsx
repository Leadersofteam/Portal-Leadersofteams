import Link from 'next/link';
import { Fragment } from 'react';

import { AppreciateButton } from '@/components/appreciate-button';
import { BookmarkButton } from '@/components/bookmark-button';
import { MentionText } from '@/components/mention-text';
import { ShareButton } from '@/components/share-button';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { LevelBadge } from '@/components/ui/level-badge';
import { levelName } from '@/lib/levels';
import { PostMedia } from '@/components/post-media';
import { QuotedPost } from '@/components/quoted-post';
import type { QuotedPostView } from '@/components/quoted-post';
import { serverApi } from '@/lib/server-api';
import { FeedOfflineSnapshot } from '@/components/feed-offline-snapshot';
import type { OfflineFeedItem } from '@/components/feed-offline-snapshot';

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
    viewerAppreciated: boolean;
    viewerBookmarked: boolean;
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
      // Numer poziomu niesie odznaka-bohater pod spodem — tekst go nie
      // powtarza, żeby karta nie mówiła tego samego trzy razy.
      return {
        text: 'wspiął/wspięła się na nowy poziom w Drabince Lidera',
        href: '/drabinka',
      };
    default:
      return { text: 'nowa aktywność', href: null };
  }
}

// Feed jest jawnie chronologiczny (ADR-010) — separatory dni robią z tej
// zasady WIDOCZNĄ cechę, a przy okazji zdejmują z każdej karty powtarzaną
// pełną datę: pod separatorem wystarczy godzina.
function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function dayLabel(iso: string, now: Date): string {
  const date = new Date(iso);
  if (date.toDateString() === now.toDateString()) return 'Dziś';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Wczoraj';
  return date.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
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
  // Sześć chipów = maks. dwa rzędy na 390 px. Jedenaście spychało pierwszą
  // treść o cały ekran w dół — nawigacja nie może przesłaniać rozmowy.
  const topics = (topicsData?.topics ?? []).slice(0, 6);

  const items = data?.items ?? [];
  const followingCount = data?.followingCount ?? 0;
  const now = new Date();

  // Migawka offline (PD4): tylko zakres „cała społeczność" i tylko pola,
  // które widzi gość — uzasadnienie przy FeedOfflineSnapshot.
  const offlineItems: OfflineFeedItem[] =
    scope === 'all'
      ? items.map((item) => ({
          name: item.actor.displayName,
          time: item.createdAt,
          text:
            item.type === 'SOCIAL_POST_PUBLISHED' && item.post
              ? item.post.body.slice(0, 500)
              : itemDescription(item).text,
          lv: item.actor.level,
        }))
      : [];
  const hrefFor = (s: FeedScope) => (s === 'all' ? '/feed?zakres=wszyscy' : '/feed');

  return (
    <main>
      {scope === 'all' && offlineItems.length > 0 && <FeedOfflineSnapshot items={offlineItems} />}
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
          // Pusty stan podpowiada ruch (PD2): zalogowany ma kompozytor na tej
          // samej stronie, gość — rejestrację. CTA nigdy nie zaprasza do
          // zapraszania (ADR-004).
          <EmptyState
            art="inbox"
            title="Na razie cisza"
            ctaHref={isLoggedIn ? '#composer' : '/rejestracja'}
            ctaLabel={isLoggedIn ? 'Napisz pierwszy wpis' : 'Załóż konto i napisz pierwszy wpis'}
          >
            {scope === 'following'
              ? `Obserwowani (${followingCount}) nie opublikowali jeszcze nic nowego. Zajrzyj do całej społeczności albo zacznij rozmowę.`
              : 'Nikt jeszcze nic nie opublikował. Pierwszy wpis będzie tu na Ciebie czekał.'}
          </EmptyState>
        )
      ) : (
        <div className="feed-list">
          {items.map((item, index) => {
            const isPost = item.type === 'SOCIAL_POST_PUBLISHED' && item.post;
            const { text, href } = itemDescription(item);
            const previous = index > 0 ? items[index - 1] : null;
            const newDay = !previous || dayKey(previous.createdAt) !== dayKey(item.createdAt);
            const achievedLevel = item.type === 'LEVEL_ACHIEVED' ? Number(item.meta.level ?? 0) : 0;
            return (
              <Fragment key={item.id}>
                {newDay && (
                  <p
                    className="feed-day"
                    aria-label={`Wpisy z dnia: ${dayLabel(item.createdAt, now)}`}
                  >
                    {dayLabel(item.createdAt, now)}
                  </p>
                )}
                <article
                  className={item.actor.level >= 1 ? 'feed-card feed-card--lv' : 'feed-card'}
                  style={
                    item.actor.level >= 1
                      ? ({
                          '--actor-lv': `var(--level-${Math.min(item.actor.level, 7)})`,
                        } as React.CSSProperties)
                      : undefined
                  }
                >
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
                      {/* W karcie awansu chip przy nazwisku by się dublował
                        z odznaką-bohaterem niżej — zostaje tylko bohater. */}
                      {item.actor.level >= 1 && item.type !== 'LEVEL_ACHIEVED' && (
                        <LevelBadge level={item.actor.level} name={levelName(item.actor.level)} />
                      )}
                      <time dateTime={item.createdAt} className="feed-card-time">
                        {timeLabel(item.createdAt)}
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
                          {/* ZASTANE do S17: `initialActive` było tu na sztywno
                            `false`, więc docenione wpisy wyglądały na
                            niedocenione, a ponowne kliknięcie kasowało własne
                            docenienie. Feed zwraca teraz stan widza. */}
                          <AppreciateButton
                            postId={item.subjectId}
                            initialCount={item.post!.appreciations}
                            initialActive={item.post!.viewerAppreciated}
                          />
                          <Link className="feed-action" href={`/wpisy/${item.subjectId}`}>
                            {item.post!.comments > 0
                              ? `Komentarze (${item.post!.comments})`
                              : 'Skomentuj'}
                          </Link>
                          <BookmarkButton
                            subjectType="SOCIAL_POST"
                            subjectId={item.subjectId}
                            initialActive={item.post!.viewerBookmarked}
                          />
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
                      <>
                        <p className="feed-card-text">
                          {href ? <Link href={href}>{text}</Link> : text}
                        </p>
                        {/* Awans to jedyne celebrowane zdarzenie — i celowo: dotyczy
                          zapracowanego statusu, nie aktywności (ADR-004/010).
                          Odznaka-bohater niesie temperaturę ZDOBYTEGO poziomu. */}
                        {achievedLevel >= 1 && (
                          <p className="feed-card-achievement">
                            <LevelBadge
                              level={achievedLevel}
                              name={levelName(achievedLevel)}
                              size="md"
                            />
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </article>
              </Fragment>
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
