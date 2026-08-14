import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Avatar } from '@/components/ui/avatar';
import { LevelBadge } from '@/components/ui/level-badge';
import { MentionText } from '@/components/mention-text';
import { serverApi } from '@/lib/server-api';

interface TopicPage {
  topic: { name: string; slug: string };
  items: Array<{
    kind: 'social' | 'group';
    id: string;
    title: string | null;
    body: string;
    createdAt: string;
    groupId: string | null;
    groupName: string | null;
    author: {
      id: string;
      displayName: string;
      handle: string | null;
      avatarFileId: string | null;
      level: number;
    };
  }>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await serverApi<TopicPage>(`/topics/${slug}`);
  const name = data?.topic.name ?? slug;
  return {
    title: `#${name} — Leaders of Teams`,
    description: `Rozmowy Liderów oznaczone tematem #${name} na Leaders of Teams.`,
  };
}

/**
 * Strona tematu (#hashtag).
 *
 * CHRONOLOGICZNIE, bez rankingu (ADR-010) — to jest oś rozmowy, nie lista
 * przebojów. Łączy wpisy portalowe i posty w grupach, bo dla czytelnika „#HR"
 * to jedna rozmowa, niezależnie od tego, w której części Portalu się toczy.
 *
 * Po co to w ogóle jest, skoro mamy wyszukiwarkę: `innodb_ft_min_token_size`
 * wynosi 3, więc „HR", „AI" i „UX" NIGDY nie trafią do indeksu FULLTEXT.
 * Temat jest jedyną drogą do tych rozmów.
 */
export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await serverApi<TopicPage>(`/topics/${slug}`);
  if (!data) notFound();

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/feed?zakres=wszyscy">← Feed społeczności</Link>
      </div>
      <h1>#{data.topic.name}</h1>
      <p className="muted">
        Wszystko, co Liderzy oznaczyli tym tematem — wpisy i dyskusje w grupach, chronologicznie.
        Bez algorytmu i bez rankingu popularności.
      </p>

      {data.items.length === 0 ? (
        <p className="muted">Nikt jeszcze nie użył tego tematu.</p>
      ) : (
        <div className="feed-list">
          {data.items.map((item) => (
            <article key={`${item.kind}-${item.id}`} className="feed-card">
              <Avatar
                name={item.author.displayName}
                size="sm"
                src={
                  item.author.avatarFileId
                    ? `/api/v1/files/${item.author.avatarFileId}/thumb`
                    : null
                }
              />
              <div className="feed-card-body">
                <div className="feed-card-head">
                  {item.author.handle ? (
                    <Link href={`/profil/${item.author.handle}`}>
                      <strong>{item.author.displayName}</strong>
                    </Link>
                  ) : (
                    <strong>{item.author.displayName}</strong>
                  )}
                  {item.author.level >= 1 && <LevelBadge level={item.author.level} />}
                  <time dateTime={item.createdAt} className="feed-card-time">
                    {new Date(item.createdAt).toLocaleDateString('pl-PL')}
                  </time>
                </div>

                {/* Post w grupie ma tytuł i kontekst grupy — wpis portalowy nie.
                    Pokazujemy tę różnicę, bo to dwa różne rodzaje rozmowy. */}
                {item.kind === 'group' && item.title && (
                  <h3 style={{ margin: '0 0 0.35rem' }}>
                    <Link href={`/grupy/${item.groupId}/post/${item.id}`}>{item.title}</Link>
                  </h3>
                )}

                <p className="feed-post-body">
                  <MentionText>{item.body}</MentionText>
                </p>

                <div className="feed-card-actions">
                  <Link
                    className="feed-action"
                    href={
                      item.kind === 'social'
                        ? `/wpisy/${item.id}`
                        : `/grupy/${item.groupId}/post/${item.id}`
                    }
                  >
                    {item.kind === 'social'
                      ? 'Otwórz wpis'
                      : `Otwórz dyskusję · ${item.groupName ?? 'grupa'}`}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
