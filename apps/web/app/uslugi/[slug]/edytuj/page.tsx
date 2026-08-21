import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { ListingForm } from '@/app/uslugi/listing-form';
import { serverApi } from '@/lib/server-api';

export const metadata = {
  title: 'Edytuj usługę — Leaders of Teams',
  robots: { index: false, follow: false },
};

interface ListingDetail {
  listing: {
    id: string;
    slug: string;
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
    leader: { userId: string };
  };
}

/**
 * Edycja usługi (PD3) — domyka martwą trasę PATCH /listings/:id znalezioną
 * przez strażnika kontraktu w S18. Ownership egzekwuje API (ForbiddenError);
 * redirect poniżej to tylko uprzejmość wobec zabłąkanych.
 */
export default async function EditListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  const [data, industriesData] = await Promise.all([
    serverApi<ListingDetail>(`/listings/slug/${encodeURIComponent(slug)}`),
    serverApi<{ industries: Array<{ id: string; name: string }> }>('/industries'),
  ]);
  if (!data) notFound();
  const { listing } = data;
  if (listing.leader.userId !== me.user.id) redirect(`/uslugi/${listing.slug}`);

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/panel/uslugi">← Moje usługi</Link>
      </div>
      <h1>Edytuj usługę</h1>
      <ListingForm
        industries={industriesData?.industries ?? []}
        initial={{
          id: listing.id,
          slug: listing.slug,
          title: listing.title,
          industryId: listing.industry.id,
          description: listing.description,
          tags: listing.tags.map((t) => t.name),
          packages: listing.packages,
          imageFileIds: listing.images,
        }}
      />
    </main>
  );
}
