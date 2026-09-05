import Link from 'next/link';

import { Avatar } from '@/components/ui/avatar';
import { LevelBadge } from '@/components/ui/level-badge';
import { levelName } from '@/lib/levels';

// Wiersz Lidera na listach (/liderzy i huby branżowe PL4) — jeden komponent
// zamiast kopii; uzasadnienie jak przy OrderRow.
export interface LeaderRowData {
  id: string;
  displayName: string;
  avatarFileId: string | null;
  headline: string;
  industry: { name: string; slug: string };
  level: number;
  averageRating: number | null;
  reviewCount: number;
}

export function LeaderRow({ leader }: { leader: LeaderRowData }) {
  return (
    <div className="list-row list-row--stack">
      <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
        <Avatar
          name={leader.displayName}
          src={leader.avatarFileId ? `/api/v1/files/${leader.avatarFileId}/thumb` : null}
        />
        <div>
          <h3>
            <Link href={`/liderzy/${leader.id}`}>{leader.displayName}</Link>
          </h3>
          <div className="meta">{leader.headline}</div>
          <div className="meta muted">{leader.industry.name}</div>
        </div>
      </div>
      <div className="text-right list-row-aside">
        <LevelBadge level={leader.level} name={levelName(leader.level)} />
        {leader.reviewCount > 0 && (
          <div className="mt-1">
            <span className="badge">
              ★ {leader.averageRating}/5 ({leader.reviewCount}{' '}
              {leader.reviewCount === 1 ? 'ocena' : 'ocen'})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
