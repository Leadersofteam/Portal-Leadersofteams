import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Info } from '@/components/v17/formy';
import { Rama, Stopka } from '@/components/v17/rama';
import { RozmowaBezPunktow, Wiadomosc, kiedyWiadomosc } from '@/components/v17/reszta-watki';
import { OdpowiedzForm, ZapytanieDalej } from '@/components/v17/reszta-watki-formy';
import { Wstecz, zl } from '@/components/v17/rynek';
import { serverApi, serverApiStatus } from '@/lib/server-api';
import { plural } from '@/lib/v17';
import { loadJa } from '@/lib/v17-data';

export const metadata = { title: 'Zapytanie o usługę — Leaders of Teams' };

interface InquiryDetail {
  inquiry: {
    id: string;
    status: 'OPEN' | 'CONVERTED' | 'CLOSED';
    convertedOrderId: string | null;
    companyId: string;
    viewer: { isLeader: boolean; isCompany: boolean };
    listing: {
      slug: string;
      title: string;
      packages: Array<{ tier: string; name: string; priceDeclared: number; deliveryDays: number }>;
    };
    messages: Array<{
      id: string;
      body: string;
      createdAt: string;
      authorName: string;
      isOwn: boolean;
      fromLeader: boolean;
    }>;
  };
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Otwarte',
  CONVERTED: 'Przekształcone w zlecenie',
  CLOSED: 'Zamknięte',
};

const TIER_LABELS: Record<string, string> = {
  BASIC: 'Podstawowy',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
};

// API zapisuje wybrany pakiet jako prefiks treści pierwszej wiadomości — chip to wyłącznie odczyt tego zapisu.
const PAKIET = /^\[pakiet: (BASIC|STANDARD|PREMIUM)\] /;

export default async function ZapytanieV17({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ja = await loadJa();
  if (!ja) redirect('/logowanie');

  const r = await serverApiStatus<InquiryDetail>(`/inquiries/${id}`);
  if (r.status === 404 || r.status === 403) notFound();
  if (!r.data) throw new Error(`Zapytanie ${id}: API zwróciło ${r.status}`);
  const { inquiry } = r.data;
  const { listing, viewer, status } = inquiry;
  const firma = await serverApi<{ company: { name: string } }>(`/companies/${inquiry.companyId}`);
  const nazwaFirmy = firma?.company.name ?? 'Firma';

  return (
    <Rama
      aktywny="uslugi"
      szeroka
      reszta
      ja={{
        name: ja.displayName,
        level: ja.level,
        handle: ja.handle,
        avatarFileId: ja.avatarFileId,
        firma: viewer.isCompany ? { nazwa: nazwaFirmy, branza: nazwaFirmy } : undefined,
      }}
    >
      <div className="wt">
        <div className="gl">
          <Wstecz href="/panel/uslugi">
            {viewer.isCompany ? 'Moje zapytania' : 'Moje usługi i zapytania'}
          </Wstecz>
          <h1 className="st-h1" style={{ fontSize: 30 }}>
            Zapytanie: {listing.title}
          </h1>
          <p className="st-lid" style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Status: <b style={{ color: 'var(--text-strong)' }}>{STATUS_LABELS[status]}</b>
          </p>
          {status === 'CONVERTED' ? (
            <Info
              ikona="check-circle"
              rodzaj="ok"
              akcje={
                inquiry.convertedOrderId ? (
                  <Link className="vbtn glowny" href={`/zlecenia/${inquiry.convertedOrderId}`}>
                    Przejdź do zlecenia
                  </Link>
                ) : undefined
              }
            >
              <b>Z tego zapytania powstało zlecenie.</b> Dalsze ustalenia prowadzicie przy nim.
            </Info>
          ) : null}
        </div>

        <aside aria-label="Usługa i działania">
          <section className="fm-karta">
            <h2>Usługa</h2>
            <p>
              <b>{listing.title}</b>
            </p>
            {listing.packages.length ? (
              <dl className="rn-dl" style={{ marginTop: 10 }}>
                {listing.packages.map((p) => (
                  <div key={p.tier}>
                    <dt>
                      {p.name}
                      <small>
                        {p.deliveryDays} {plural(p.deliveryDays, 'dzień', 'dni', 'dni')}
                      </small>
                    </dt>
                    <dd>{zl(p.priceDeclared)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <Link className="vbtn obrys" href={`/uslugi/${listing.slug}`}>
              Zobacz usługę
            </Link>
          </section>
          {status === 'OPEN' ? (
            <ZapytanieDalej inquiryId={inquiry.id} isCompany={viewer.isCompany} />
          ) : null}
        </aside>

        <div className="tr">
          <ol className="msgs" aria-label="Wiadomości">
            {inquiry.messages.map((m, i) => {
              const tier = i === 0 ? PAKIET.exec(m.body)?.[1] : undefined;
              const pakiet = tier ? listing.packages.find((p) => p.tier === tier) : undefined;
              return (
                <Wiadomosc
                  key={m.id}
                  autor={m.fromLeader ? m.authorName : nazwaFirmy}
                  firma={!m.fromLeader}
                  kiedy={kiedyWiadomosc(m.createdAt)}
                  ja={m.isOwn}
                  dodatek={
                    tier ? (
                      <span
                        className="temat"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          marginTop: 8,
                          padding: '0 8px',
                        }}
                      >
                        Pakiet:{' '}
                        {pakiet
                          ? `${pakiet.name} · ${zl(pakiet.priceDeclared)}`
                          : TIER_LABELS[tier]}
                      </span>
                    ) : null
                  }
                >
                  {tier ? m.body.replace(PAKIET, '') : m.body}
                </Wiadomosc>
              );
            })}
          </ol>
          {status === 'CLOSED' ? (
            <Info ikona="lock-simple">
              <b>Wątek jest zamknięty.</b> Historia rozmowy zostaje.
            </Info>
          ) : status === 'OPEN' ? (
            <OdpowiedzForm
              sciezka={`/inquiries/${inquiry.id}/messages`}
              etykieta="Odpowiedź"
              podpowiedz="Napisz odpowiedź"
            />
          ) : null}
          <RozmowaBezPunktow />
        </div>
      </div>
      <div className="rn-stopka">
        <Stopka />
      </div>
    </Rama>
  );
}
