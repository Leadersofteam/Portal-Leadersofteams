import type { Metadata } from 'next';

import { EmptyState } from '@/components/ui/empty-state';

import { OfflineFeed } from './offline-feed';

// Strona-zaślepka dla service workera: musi być statyczna, bo w chwili jej
// pokazania nie ma sieci — żadnego serverApi, żadnych danych. Migawkę feedu
// renderuje klientowy OfflineFeed (localStorage po hydracji), a jego chunki
// trafiają do precache przy instalacji SW — patrz public/sw.js.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Jesteś offline — Leaders of Teams',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main>
      <EmptyState
        art="ladder"
        title="Jesteś offline — drabina poczeka"
        ctaHref="/feed"
        ctaLabel="Spróbuj ponownie"
      >
        Nie mamy teraz połączenia z siecią. Twoje szczeble nigdzie nie uciekną: wróć, gdy zasięg
        wróci, a wszystko będzie na swoim miejscu.
      </EmptyState>
      <OfflineFeed />
    </main>
  );
}
