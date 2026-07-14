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

// Publiczny adres bazowy (prod). Nadpisywalny w buildzie web przez
// NEXT_PUBLIC_SITE_URL. Używany do metadataBase (kanoniczne URL-e, OG, sitemap).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leadersofteams.pl';

const DESCRIPTION =
  'Marketplace usług B2B, społeczność mentoringowa i Drabinka Lidera. Poziom zdobywasz wyłącznie realną pracą i docenionym mentoringiem — to zweryfikowany dowód, nie deklaracja.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Leaders of Teams — portal Liderów i Firm',
  description: DESCRIPTION,
  applicationName: 'Leaders of Teams',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    siteName: 'Leaders of Teams',
    url: SITE_URL,
    title: 'Leaders of Teams — portal Liderów i Firm',
    description: DESCRIPTION,
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
