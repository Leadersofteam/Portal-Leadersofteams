import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { LevelBadge } from '@/components/ui/level-badge';
import { serverApi } from '@/lib/server-api';

export const metadata = { title: 'Twój feed — Leaders of Teams' };

interface FeedItem {
  id: string;
  type: 'POST_PUBLISHED' | 'LISTING_PUBLISHED' | 'ANSWER_ACCEPTED' | 'LEVEL_ACHIEVED';
  subjectId: string;
  meta: Record<string, unknown>;
  createdAt: string;
  actor: {
    id: string;
    displayName: string;
    handle: string | null;
    avatarFileId: string | null;
    level: number;
  };
}

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
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  const params = await searchParams;
  const cursor = typeof params.cursor === 'string' ? params.cursor : '';
  const data = await serverApi<{
    items: FeedItem[];
    nextCursor: string | null;
    followingCount: number;
  }>(`/feed${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);

  const items = data?.items ?? [];
  const followingCount = data?.followingCount ?? 0;

  return (
    <main>
      <h1>Twój feed</h1>
      <p className="muted">
        Chronologiczna aktywność obserwowanych — bez algorytmu, bez nieskończonego scrolla. To Ty
        decydujesz, kogo słuchasz.
      </p>

      {followingCount === 0 ? (
        <EmptyState
          title="Nie obserwujesz jeszcze nikogo"
          ctaHref="/liderzy"
          ctaLabel="Przeglądaj katalog Liderów"
        >
          Wejdź na profil Lidera i kliknij „Obserwuj" — jego wpisy, usługi i awanse pojawią się
          tutaj.
        </EmptyState>
      ) : items.length === 0 ? (
        <EmptyState title="Na razie cisza">
          Obserwowani ({followingCount}) nie opublikowali jeszcze nic nowego.
        </EmptyState>
      ) : (
        <div className="message-thread">
          {items.map((item) => {
            const { text, href } = itemDescription(item);
            return (
              <div key={item.id} className="message" style={{ maxWidth: 'none' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <Avatar
                    name={item.actor.displayName}
                    size="sm"
                    src={
                      item.actor.avatarFileId
                        ? `/api/v1/files/${item.actor.avatarFileId}/thumb`
                        : null
                    }
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      {item.actor.handle ? (
                        <Link href={`/profil/${item.actor.handle}`}>
                          <strong>{item.actor.displayName}</strong>
                        </Link>
                      ) : (
                        <strong>{item.actor.displayName}</strong>
                      )}
                      {item.actor.level >= 1 && <LevelBadge level={item.actor.level} />}
                      <span className="muted" style={{ fontSize: '0.8rem' }}>
                        {new Date(item.createdAt).toLocaleString('pl-PL')}
                      </span>
                    </div>
                    <p style={{ margin: '0.3rem 0 0' }}>
                      {href ? <Link href={href}>{text}</Link> : text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data?.nextCursor && (
        <p className="mt-2">
          <Link
            className="btn secondary"
            href={`/feed?cursor=${encodeURIComponent(data.nextCursor)}`}
          >
            Wczytaj więcej
          </Link>
        </p>
      )}
    </main>
  );
}
