import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { NotificationBell } from '@/components/notification-bell';

import './globals.css';

export const metadata: Metadata = {
  title: 'Leaders of Teams — portal Liderów i Firm',
  description:
    'Marketplace usług B2B, społeczność mentoringowa i Drabinka Lidera. Zdobywaj poziomy realną pracą i mentoringiem.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            Leaders of Teams
          </Link>
          <nav>
            <Link href="/zlecenia">Zlecenia</Link>
            <Link href="/grupy">Grupy</Link>
            <Link href="/drabinka">Drabinka</Link>
            <Link href="/panel">Panel</Link>
            <NotificationBell />
            <Link href="/logowanie">Zaloguj się</Link>
            <Link href="/rejestracja" className="btn secondary">
              Dołącz
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
