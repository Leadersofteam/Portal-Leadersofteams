import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { SiteHeader } from '@/components/site-header';
import { SITE_DESCRIPTION, SITE_URL } from '@/lib/site';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Adres bazowy i opis serwisu są w @/lib/site (jedyne źródło prawdy — route
// module nie powinien eksportować dowolnych stałych; kontrakt Next).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Leaders of Teams — portal Liderów i Firm',
  description: SITE_DESCRIPTION,
  applicationName: 'Leaders of Teams',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    siteName: 'Leaders of Teams',
    url: SITE_URL,
    title: 'Leaders of Teams — portal Liderów i Firm',
    description: SITE_DESCRIPTION,
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className={inter.variable}>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
