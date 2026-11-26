import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';

// robots.txt. Strefy prywatne/transakcyjne wyłączone z indeksacji; publiczne
// (profile, zlecenia, grupy, wątki Q&A) otwarte. Sitemap wskazany dla crawlerów.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // `/healthz` to sonda kontenera, nie treść — nie ma czego indeksować.
      // `/wypis-digest` nosi token wypisu w URL — nie może wylądować w indeksie.
      disallow: [
        '/panel',
        '/panel/',
        '/powiadomienia',
        '/logowanie',
        '/rejestracja',
        '/healthz',
        '/wypis-digest',
        // Zaplecze rewrite'u V17 — te same ekrany żyją pod zwykłymi adresami (i tam wskazuje canonical).
        // Tu, a nie nagłówkiem w middleware: rewrite potrafi przejść przez middleware dwa razy i oznaczyć adres publiczny.
        '/v17/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
