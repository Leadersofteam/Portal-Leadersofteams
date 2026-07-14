import type { MetadataRoute } from 'next';

import { SITE_URL } from './layout';

// robots.txt. Strefy prywatne/transakcyjne wyłączone z indeksacji; publiczne
// (profile, zlecenia, grupy, wątki Q&A) otwarte. Sitemap wskazany dla crawlerów.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/panel', '/panel/', '/powiadomienia', '/logowanie', '/rejestracja'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
