import { credentialCard, OG_SIZE, levelColor } from '@/lib/og';

// Obraz OG strony /droga — ta sama karta co reszta encji, z siedmioma
// szczeblami jako plakietkami: od stali do bursztynu.
export const alt = 'Droga Lidera — od zera do Lidera, punkt po punkcie';
export const size = OG_SIZE;
export const contentType = 'image/png';

const NAMES = ['Adept', 'Praktyk', 'Specjalista', 'Ekspert', 'Mentor', 'Autorytet', 'Architekt'];

export default function OgImage() {
  return credentialCard({
    kicker: 'Droga Lidera · Leaders of Teams',
    title: 'Od zera do Lidera',
    subtitle: 'Siedem szczebli. Punkty tylko od drugiego człowieka — za pracę i mentoring.',
    chips: NAMES.map((name, i) => ({ label: `${i + 1} · ${name}`, color: levelColor(i + 1) })),
  });
}
