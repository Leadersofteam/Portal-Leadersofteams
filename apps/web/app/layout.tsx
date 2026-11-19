import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Inter, Instrument_Serif } from 'next/font/google';
import type { ReactNode } from 'react';

import { BottomNav } from '@/components/bottom-nav';
import { ServiceWorkerRegistrar } from '@/components/service-worker';
import { SiteHeader } from '@/components/site-header';
import { V17Shell } from '@/components/v17/v17-shell';
import { SiteFooter } from '@/components/ui/footer';
import { SITE_DESCRIPTION, SITE_URL } from '@/lib/site';

import './globals.css';
// Warstwy stylów doklejane PO globals.css — kolejność importów jest kolejnością
// kaskady, więc nowe reguły wygrywają bez wojny na !important, a diff sprintu
// nie ginie w pliku, który ma już ponad 1600 linii.
import './styles/mobile-shell.css';
import './styles/social.css';
import './styles/climb.css';
import './styles/search.css';
import './styles/v17.css';

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

// Instrument Serif (V17): kursywą, jedno słowo-akcent w nagłówku. Pobierany przy
// budowie przez next/font — w runtime zero zapytań do Google (ADR-009).
const instrumentSerif = Instrument_Serif({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-serif-v17',
  weight: '400',
  style: 'italic',
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

// Boot motywu (P2/S2): blokujący skrypt inline jako PIERWSZE dziecko <body> —
// parser wykonuje go przed pierwszym paintem treści, więc jasny motyw nie miga.
// WYŁĄCZNIE mutacja atrybutu na <html>: hydracja Reacta zdejmuje węzły DOM
// wstrzyknięte skryptem inline, ale mutację atrybutu przeżywa (mina PD4) —
// stąd też suppressHydrationWarning na <html>. Zero cookies(): odczyt cookies
// w root layoucie uczyniłby dynamiczną KAŻDĄ stronę Portalu (patrz
// lib/server-api.ts — to naprawiał PD1). Logika lustrzana z lib/theme.ts.
const THEME_BOOT = `(function(){try{var t=localStorage.getItem('lot_theme');var l=t==='light'||(t==='system'&&matchMedia('(prefers-color-scheme: light)').matches);if(l){document.documentElement.dataset.theme='light';var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#f6f7fb');}}catch(e){}try{if(localStorage.getItem('lot_wyglad')==='v17')document.documentElement.dataset.wyglad='v17';}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pl"
      className={`${inter.variable} ${bricolage.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <div className="climb-rail" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <V17Shell />
        <SiteHeader />
        {children}
        <SiteFooter />
        <BottomNav />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
