import Link from 'next/link';
import { redirect } from 'next/navigation';

import type { SessionUser } from '@lot/contracts';

import { notificationHref, notificationMessage } from '@/lib/labels';
import { serverApi } from '@/lib/server-api';

import { MarkAllReadButton } from './mark-read-button';

interface NotificationRow {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export const metadata = { title: 'Powiadomienia — Leaders of Teams' };

export default async function NotificationsPage() {
  const me = await serverApi<{ user: SessionUser | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  const data = await serverApi<{ notifications: NotificationRow[]; nextCursor: string | null }>(
    '/me/notifications',
  );
  const notifications = data?.notifications ?? [];

  return (
    <main>
      <div className="list-row">
        <h1>Powiadomienia</h1>
        {notifications.some((n) => !n.readAt) && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <p className="muted">Nie masz jeszcze powiadomień.</p>
      ) : (
        notifications.map((n) => (
          <Link
            key={n.id}
            href={notificationHref(n.type, n.payload)}
            className="list-row"
            style={{ textDecoration: 'none' }}
          >
            <div>
              <strong>{notificationMessage(n.type, n.payload)}</strong>
              <div className="meta">{new Date(n.createdAt).toLocaleString('pl-PL')}</div>
            </div>
            {!n.readAt && <span className="badge accent">nowe</span>}
          </Link>
        ))
      )}
    </main>
  );
}
