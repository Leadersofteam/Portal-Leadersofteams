import { credentialCard, OG_SIZE, levelColor } from '@/lib/og';

// Root OG — wizytówka całej platformy (Twitter card summary_large_image
// wcześniej nie miał żadnego obrazu).
export const alt = 'Leaders of Teams — marketplace B2B i społeczność Liderów';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function OgImage() {
  return credentialCard({
    kicker: 'Leaders of Teams',
    title: 'Status, którego nie da się kupić — tylko zapracować',
    subtitle: 'Marketplace B2B + społeczność Liderów. Zero punktów za zapraszanie.',
    chips: [
      { label: 'Drabinka Lidera · 7 poziomów', color: levelColor(7) },
      { label: 'Zlecenia i mentoring' },
    ],
  });
}
