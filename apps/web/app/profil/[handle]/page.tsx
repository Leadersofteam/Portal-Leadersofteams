import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { ShareButton } from '@/components/share-button';
import { Avatar } from '@/components/ui/avatar';
import { LevelBadge } from '@/components/ui/level-badge';
import { serverApi } from '@/lib/server-api';

import { FollowButton } from './follow-button';

interface SocialProfile {
  user: {
    id: string;
    displayName: string;
    handle: string | null;
    avatarFileId: string | null;
    level: number;
  };
  leaderProfile: { id: string; headline: string } | null;
  followers: number;
  following: number;
  activity: Array<{
    id: string;
    type: string;
    subjectId: string;
    meta: Record<string, unknown>;
    createdAt: string;
  }>;
}

const getProfile = cache((handle: string) =>
  serverApi<SocialProfile>(`/profiles/${encodeURIComponent(handle)}`),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const data = await getProfile(handle);
  if (!data) return { title: 'Profil nie znaleziony' };
  return {
    title: `${data.user.displayName} (@${handle}) | Leaders of Teams`,
    description: data.leaderProfile?.headline ?? `Profil @${handle} w Leaders of Teams.`,
    alternates: { canonical: `/profil/${handle}` },
  };
}

const ACTIVITY_LABELS: Record<string, string> = {
  POST_PUBLISHED: 'Wpis w grupie',
  LISTING_PUBLISHED: 'Nowa usługa',
  ANSWER_ACCEPTED: 'Zaakceptowana odpowiedź',
  LEVEL_ACHIEVED: 'Awans w Drabince',
  SOCIAL_POST_PUBLISHED: 'Wpis',
};

function activityHref(a: SocialProfile['activity'][number]): string | null {
  if (a.type === 'POST_PUBLISHED' && a.meta.groupId)
    return `/grupy/${a.meta.groupId}/post/${a.subjectId}`;
  if (a.type === 'LISTING_PUBLISHED' && a.meta.slug) return `/uslugi/${a.meta.slug}`;
  if (a.type === 'ANSWER_ACCEPTED' && a.meta.threadId) return `/watki/${a.meta.threadId}`;
  if (a.type === 'SOCIAL_POST_PUBLISHED') return `/wpisy/${a.subjectId}`;
  return null;
}

export default async function SocialProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const data = await getProfile(handle);
  if (!data) notFound();

  const me = await serverApi<{ user: { id: string } | null }>('/auth/me').catch(() => null);
  const isSelf = me?.user?.id === data.user.id;
  const initiallyFollowing =
    me?.user && !isSelf
      ? ((
          await serverApi<{ following: boolean }>(`/users/${data.user.id}/follow`).catch(() => null)
        )?.following ?? false)
      : false;

  return (
    <main>
      {/* Nagłówek profilu jako CREDENTIAL: poziom nie jest ozdobą przy nazwisku,
          tylko główną informacją — to jedyna rzecz w Portalu, której nie da się
          kupić ani wyrekrutować. */}
      <header className="credential-header">
        <Avatar
          name={data.user.displayName}
          size="lg"
          src={data.user.avatarFileId ? `/api/v1/files/${data.user.avatarFileId}/thumb` : null}
        />
        <div className="credential-main">
          <h1>{data.user.displayName}</h1>
          <p className="meta muted">
            @{handle} · {data.followers} obserwujących · {data.following} obserwowanych
          </p>
          {data.leaderProfile && (
            <p className="credential-headline">
              {data.leaderProfile.headline}{' '}
              <Link href={`/liderzy/${data.leaderProfile.id}`}>Profil Lidera →</Link>
            </p>
          )}
        </div>

        <div className="credential-side">
          {data.user.level >= 1 ? (
            <div className="credential-level" data-level={data.user.level}>
              <span className="credential-level-num">{data.user.level}</span>
              <LevelBadge level={data.user.level} />
            </div>
          ) : (
            <p className="muted credential-level-empty">U podnóża Drabinki</p>
          )}

          <div className="credential-actions">
            {me?.user && !isSelf && (
              <FollowButton userId={data.user.id} initiallyFollowing={initiallyFollowing} />
            )}
            {isSelf && data.user.level >= 1 && (
              <ShareButton
                url={`/profil/${handle}`}
                title={`Mój poziom ${data.user.level} w Drabince Lidera — Leaders of Teams`}
                label="Udostępnij swój poziom"
              />
            )}
          </div>
        </div>
      </header>

      <h2>Aktywność</h2>
      {data.activity.length === 0 ? (
        <p className="muted">Brak publicznej aktywności.</p>
      ) : (
        data.activity.map((a) => {
          const href = activityHref(a);
          const title = String(a.meta.title ?? a.meta.threadTitle ?? a.meta.excerpt ?? '');
          const label = `${ACTIVITY_LABELS[a.type] ?? a.type}${title ? `: ${title}` : ''}${
            a.type === 'LEVEL_ACHIEVED' ? ` — poziom ${String(a.meta.level ?? '')}` : ''
          }`;
          return (
            <div key={a.id} className="list-row">
              <div>
                {href ? <Link href={href}>{label}</Link> : label}
                <div className="meta muted">{new Date(a.createdAt).toLocaleString('pl-PL')}</div>
              </div>
            </div>
          );
        })
      )}
    </main>
  );
}
