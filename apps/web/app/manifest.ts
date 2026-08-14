import type { MetadataRoute } from 'next';

/**
 * Manifest PWA — Portal ma być apką w kieszeni Lidera, nie stroną, która „też
 * działa na telefonie".
 *
 * start_url = /feed, bo po zainstalowaniu ikony na ekranie głównym człowiek
 * wraca do społeczności, nie do landingu sprzedażowego (ten ma sens raz).
 * Serwowany przez Next pod /manifest.webmanifest — dlatego w public/ NIE MOŻE
 * leżeć plik o tej nazwie (kolizja tras).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Leaders of Teams — portal Liderów i Firm',
    short_name: 'Leaders',
    description:
      'Marketplace Liderów zespołów i Firm: usługi, zlecenia, społeczność i Drabinka Lidera.',
    lang: 'pl',
    dir: 'ltr',
    start_url: '/feed',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0b12',
    theme_color: '#0a0b12',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Usługi Liderów', short_name: 'Usługi', url: '/uslugi' },
      { name: 'Dodaj zlecenie', short_name: 'Zlecenie', url: '/zlecenia/nowe' },
      { name: 'Panel', short_name: 'Panel', url: '/panel' },
    ],
  };
}
