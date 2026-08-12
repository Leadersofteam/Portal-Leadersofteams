import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { BottomNav } from '@/components/bottom-nav';
import { ServiceWorkerRegistrar } from '@/components/service-worker';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/ui/footer';
import { SITE_DESCRIPTION, SITE_URL } from '@/lib/site';

import './globals.css';
// Warstwy stylów doklejane PO globals.css — kolejność importów jest kolejnością
// kaskady, więc nowe reguły wygrywają bez wojny na !important, a diff sprintu
// nie ginie w pliku, który ma już ponad 1600 linii.
import './styles/mobile-shell.css';
import './styles/social.css';
import './styles/climb.css';

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
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icons/apple-touch-icon-180.png' },
  appleWebApp: { capable: true, title: 'Leaders', statusBarStyle: 'black-translucent' },
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

// viewportFit: 'cover' + safe-area w CSS — bez tego dolny pasek chowa się pod
// paskiem gestów iPhone'a. themeColor musi być TUTAJ (w metadata jest przestarzały).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0b12',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className={`${inter.variable} ${bricolage.variable}`}>
      <body>
        <div className="climb-rail" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <SiteHeader />
        {children}
        <SiteFooter />
        <BottomNav />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
