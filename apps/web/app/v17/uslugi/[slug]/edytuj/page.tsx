import { notFound, redirect } from 'next/navigation';

import { Rama } from '@/components/v17/rama';
import { jaRamy } from '@/components/v17/reszta-formularze';
import { UslugaFormularz } from '@/components/v17/reszta-formularze-usluga';
import type { StatusUslugi } from '@/components/v17/reszta-formularze-usluga';
import { serverApi, serverApiStatus } from '@/lib/server-api';
import { loadJa } from '@/lib/v17-data';

export const metadata = {
  title: 'Edytuj usługę — Leaders of Teams',
  robots: { index: false, follow: false },
};

interface MojaUsluga {
  listing: {
    id: string;
    slug: string;
    status: StatusUslugi;
    title: string;
    description: string;
    tags: Array<{ name: string; slug: string }>;
    packages: Array<{
      tier: 'BASIC' | 'STANDARD' | 'PREMIUM';
      name: string;
      priceDeclared: number;
      scope: string;
      deliveryDays: number;
    }>;
    images: string[];
    industry: { id: string; name: string };
    leader: {
      displayName: string;
      avatarFileId: string | null;
      level: number;
      averageRating: number | null;
      reviewCount: number;
    };
  };
}

// Bez loading.tsx: nad segmentem [slug] dałby 200 zamiast 404 (MINY).
export default async function EdycjaUslugiV17({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ja = await loadJa();
  if (!ja) redirect('/logowanie');

  // Odczyt właściciela, nie publiczny: publiczny zwraca 404 dla szkicu, a panel pokazuje przy nim „Edytuj”.
  const [moja, branze] = await Promise.all([
    serverApiStatus<MojaUsluga>(`/me/listings/slug/${encodeURIComponent(slug)}`),
    serverApi<{ industries: Array<{ id: string; name: string }> }>('/industries'),
  ]);
  if (moja.status === 404) {
    // Cudza, opublikowana usługa → jej strona; reszta nie istnieje.
    if (await serverApi(`/listings/slug/${encodeURIComponent(slug)}`)) redirect(`/uslugi/${slug}`);
    notFound();
  }
  if (!moja.data || !branze) throw new Error(`Edycja usługi ${slug}: API zwróciło ${moja.status}`);
  const { listing } = moja.data;

  return (
    <Rama aktywny="uslugi" szeroka reszta ja={jaRamy(ja)}>
      <UslugaFormularz
        branze={branze.industries}
        autor={{
          name: listing.leader.displayName,
          level: listing.leader.level,
          avatarFileId: listing.leader.avatarFileId,
          srednia: listing.leader.averageRating,
          liczbaOcen: listing.leader.reviewCount,
        }}
        initial={{
          id: listing.id,
          slug: listing.slug,
          status: listing.status,
          title: listing.title,
          industryId: listing.industry.id,
          description: listing.description,
          tags: listing.tags.map((t) => t.name),
          packages: listing.packages,
          imageFileIds: listing.images,
        }}
      />
    </Rama>
  );
}
