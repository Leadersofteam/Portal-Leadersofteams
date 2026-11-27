'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { apiFetch } from '@/lib/api';
import { useSession } from '@/lib/use-session';

import { Rama } from './rama';
import type { Ja, MenuKlucz } from './rama';

// Rama stron indeksowanych (branże, porównania, „Dla firm”). Sesję czytamy w przeglądarce, bo odczyt cookies
// na serwerze zabrałby tym stronom prerender i ISR. HTML z serwera to wariant gościa (jak w makiecie),
// zalogowany po chwili dostaje swoją nawigację zamiast zaproszenia do logowania.
export function RamaPubliczna({ aktywny, children }: { aktywny: MenuKlucz; children: ReactNode }) {
  const { user } = useSession();
  const [ja, setJa] = useState<Ja | null>(null);

  useEffect(() => {
    if (!user) return;
    let przerwane = false;
    void Promise.all([
      apiFetch<{ user: { avatarFileId?: string | null } | null }>('/auth/me').catch(() => null),
      apiFetch<{ handle: string | null }>('/me/social').catch(() => null),
      apiFetch<{ state: { level: number } }>('/me/ladder').catch(() => null),
    ]).then(([me, social, ladder]) => {
      if (przerwane) return;
      setJa({
        name: user.displayName,
        handle: social?.handle ?? null,
        avatarFileId: me?.user?.avatarFileId ?? null,
        level: ladder?.state.level ?? 0,
      });
    });
    return () => {
      przerwane = true;
    };
  }, [user]);

  return (
    <Rama aktywny={aktywny} ja={ja} szeroka reszta>
      {children}
    </Rama>
  );
}
