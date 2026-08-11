import type { Metadata } from 'next';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/ui/footer';
import { SITE_DESCRIPTION, SITE_URL } from '@/lib/site';

import './globals.css';

// latin-ext jest obowiązkowy: bez niego polskie znaki spadają do fontu systemowego.
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

const bricolage = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-bricolage',
  weight: ['600', '700', '800'],
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
    <html lang="pl" className={`${inter.variable} ${bricolage.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
