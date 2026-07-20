// Stałe strony współdzielone przez metadata/SEO/sitemap. Trzymane poza route
// module (layout.tsx nie może eksportować dowolnych nazw — kontrakt Next).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leadersofteams.pl';

export const SITE_DESCRIPTION =
  'Marketplace usług B2B, społeczność mentoringowa i Drabinka Lidera. Poziom zdobywasz wyłącznie realną pracą i docenionym mentoringiem — to zweryfikowany dowód, nie deklaracja.';
