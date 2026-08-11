import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { serverApi } from '@/lib/server-api';

import { InquiryThreadActions, ReplyForm } from './thread-actions';

export const metadata = { title: 'Zapytanie o usługę — Leaders of Teams' };

interface InquiryDetail {
  inquiry: {
    id: string;
    status: 'OPEN' | 'CONVERTED' | 'CLOSED';
    convertedOrderId: string | null;
    viewer: { isLeader: boolean; isCompany: boolean };
    listing: {
      slug: string;
      title: string;
      packages: Array<{ tier: string; name: string; priceDeclared: number }>;
    };
    messages: Array<{
      id: string;
      body: string;
      createdAt: string;
      authorName: string;
      isOwn: boolean;
    }>;
  };
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Otwarte',
  CONVERTED: 'Przekształcone w zlecenie',
  CLOSED: 'Zamknięte',
};

export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await serverApi<{ user: { id: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');

  const data = await serverApi<InquiryDetail>(`/inquiries/${id}`);
  if (!data) notFound();
  const { inquiry } = data;

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/panel/uslugi">← Moje usługi i zapytania</Link>
      </div>
      <h1>Zapytanie: {inquiry.listing.title}</h1>
      <p className="meta">
        <span className="badge accent">{STATUS_LABELS[inquiry.status]}</span>{' '}
        <Link href={`/uslugi/${inquiry.listing.slug}`}>Zobacz usługę →</Link>
        {inquiry.convertedOrderId && (
          <>
            {' '}
            · <Link href={`/zlecenia/${inquiry.convertedOrderId}`}>Przejdź do zlecenia →</Link>
          </>
        )}
      </p>

      <div className="message-thread">
        {inquiry.messages.map((message) => (
          <div key={message.id} className={message.isOwn ? 'message own' : 'message'}>
            <div className="meta">
              {message.authorName} · {new Date(message.createdAt).toLocaleString('pl-PL')}
            </div>
            <div className="pre-wrap">{message.body}</div>
          </div>
        ))}
      </div>

      {inquiry.status === 'OPEN' && (
        <>
          <ReplyForm inquiryId={inquiry.id} />
          <InquiryThreadActions inquiryId={inquiry.id} isCompany={inquiry.viewer.isCompany} />
        </>
      )}
    </main>
  );
}
