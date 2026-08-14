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
      disallow: ['/panel', '/panel/', '/powiadomienia', '/logowanie', '/rejestracja', '/healthz'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
