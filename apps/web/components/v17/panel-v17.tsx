import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  Briefcase,
  Ladder,
  Plus,
  Star,
  Tag,
  WarningCircle,
} from '@phosphor-icons/react/dist/ssr';

import { formatBudget, OFFER_STATUS_LABELS, ORDER_STATUS_LABELS } from '@/lib/labels';
import { serverApi } from '@/lib/server-api';

// Widok /panel w wyglądzie V17 PRO — wg zaakceptowanej makiety
// docs/redesign-propozycje/v17/panel.html (Maciej 19.11). Renderowany obok
// starego widoku; który z nich widać, rozstrzyga WYŁĄCZNIE CSS po fladze
// html[data-wyglad='v17'] (serwer nie zna localStorage).
// Zasada liczb: tylko to, co Portal liczy dziś (ADR-004). Punkty pochodzą z
// ocen i uznanych odpowiedzi — nic tu nie liczy aktywności.

interface Ladder {
  state: { level: number; totalPoints: number; marketplacePoints: number; communityPoints: number };
  nextLevel: { level: number; missingPoints: number } | null;
}
interface MyOrder {
  id: string;
  title: string;
  status: string;
  offersCount: number;
  companyName: string;
}
interface MyOffer {
  id: string;
  status: string;
  proposedBudget: number | null;
  messagesCount: number;
  order: { id: string; title: string; status: string };
}

const LEVELS = [1, 2, 3, 4, 5, 6, 7] as const;

export async function PanelV17({
  displayName,
  profileId,
  ladder,
}: {
  displayName: string;
  profileId: string | null;
  ladder: Ladder | null;
}) {
  const [ordersData, offersData, unread, catalog, leader] = await Promise.all([
    serverApi<{ orders: MyOrder[] }>('/me/orders'),
    serverApi<{ offers: MyOffer[] }>('/me/offers'),
    serverApi<{ count: number }>('/me/notifications/unread-count'),
    serverApi<{
      orders: Array<{
        id: string;
        title: string;
        budgetMin: number;
        budgetMax: number;
        companyName: string;
      }>;
    }>('/orders?limit=2'),
    profileId
      ? serverApi<{ profile: { averageRating: number | null; reviewCount: number } }>(
          `/leaders/${profileId}`,
        )
      : Promise.resolve(null),
  ]);

  // Błąd = API nie odpowiedziało na nic z tego, co panel czyta (null ≠ pusto).
  if (!ordersData && !offersData && !ladder) {
    return (
      <div className="v17-panel v17-only">
        <Glowka name={displayName} />
        <div className="v17-blad" role="alert">
          <WarningCircle size={22} weight="duotone" aria-hidden="true" />
          Nie udało się wczytać panelu. Twoje dane są bezpieczne.
          <Link className="v17-cta" href="/panel">
            Spróbuj ponownie
          </Link>
        </div>
      </div>
    );
  }

  const orders = ordersData?.orders ?? [];
  const offers = offersData?.offers ?? [];
  const open = orders.filter((o) => o.status === 'PUBLISHED');
  const toAnswer = open.filter((o) => o.offersCount > 0);
  const offersTotal = toAnswer.reduce((a, o) => a + o.offersCount, 0);
  // „W toku": najpierw zlecenie Lidera (moja zaakceptowana oferta), potem zlecenie firmy.
  const myLive = offers.find((o) => o.status === 'ACCEPTED' && o.order.status === 'IN_PROGRESS');
  const orderLive = orders.find((o) => o.status === 'IN_PROGRESS');
  const level = ladder?.state.level ?? 1;
  const points = ladder?.state.totalPoints ?? 0;
  const rating = leader?.profile.averageRating ?? null;
  const ratings = leader?.profile.reviewCount ?? 0;
  const empty = orders.length === 0 && offers.length === 0 && points === 0;

  const kpi: Array<[React.ReactNode, string, string, string]> = [
    [
      <Briefcase key="a" size={18} weight="duotone" />,
      'Moje zlecenia',
      String(open.length),
      'otwarte',
    ],
    [
      <Tag key="b" size={18} weight="duotone" />,
      'Oferty na moje zlecenia',
      String(offersTotal),
      'ofert',
    ],
    [
      <Star key="c" size={18} weight="duotone" />,
      'Ocena',
      rating === null ? '—' : rating.toString().replace('.', ','),
      rating === null ? 'brak ocen' : `z ${ratings} ocen`,
    ],
    [
      <Ladder key="d" size={18} weight="duotone" />,
      'Poziom Drabinki',
      String(level),
      empty ? 'nowy w Portalu' : `${points} pkt`,
    ],
  ];

  return (
    <div className="v17-panel v17-only">
      <Glowka
        name={displayName}
        cta={
          empty || offersTotal === 0
            ? { href: '/zlecenia/nowe', label: 'Dodaj pierwsze zlecenie', plus: true }
            : {
                href: '#oferty',
                label: `Odpowiedz na ${offersTotal} ${offersTotal === 1 ? 'ofertę' : 'ofert'}`,
              }
        }
      />
      <div className="v17-g">
        <div className="v17-c12 v17-kpis" data-przesuw>
          {kpi.map(([ic, t, v, u], i) => (
            <article className="v17-k v17-kpi" key={t} style={{ animationDelay: `${0.04 * i}s` }}>
              <div className="t">
                <span className="v17-ik">{ic}</span>
                {t}
              </div>
              <div className="v">
                {v}
                <small> {u}</small>
              </div>
            </article>
          ))}
        </div>

        <article
          className="v17-k v17-c7"
          aria-label="Drabinka Lidera"
          style={{ animationDelay: '.05s' }}
        >
          <div className="v17-kh">
            <span className="v17-ik" style={{ color: 'var(--level-3)' }}>
              <Ladder size={18} weight="duotone" />
            </span>
            <h3>Drabinka</h3>
            <div className="r">
              <Link className="v17-lnk" href="/panel/punkty">
                Moje punkty <ArrowRight size={12} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </div>
          {empty ? (
            <div className="v17-pusty">
              <b>Nowy w Portalu</b>
              <span>
                Pierwszy punkt przyznaje drugi człowiek — ocena po zleceniu albo uznana odpowiedź.
              </span>
              <Link className="v17-lnk" href="/pytania">
                Odpowiedz na pytanie <ArrowRight size={12} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <>
              <div className="v17-lvl">
                <span className="nm">{level}</span>
                <small>
                  poziom z 7 · {points} pkt
                  {ladder?.nextLevel
                    ? ` · jeszcze ${ladder.nextLevel.missingPoints} do poziomu ${ladder.nextLevel.level}`
                    : ''}
                </small>
              </div>
              <div className="v17-lad" role="img" aria-label={`Poziom ${level} z 7`}>
                {LEVELS.map((n) => (
                  <i
                    key={n}
                    style={{ '--c': `var(--level-${n})` } as React.CSSProperties}
                    className={`${n <= level ? 'on' : ''} ${n === level ? 'tu' : ''}`}
                  />
                ))}
              </div>
              <div className="v17-ladl" aria-hidden="true">
                {LEVELS.map((n) => (
                  <span key={n} className={n === level ? 'tu' : ''}>
                    {n}
                  </span>
                ))}
              </div>
              <div className="v17-zrodla">
                <div>
                  <small>Oceny po zleceniach</small>
                  <b>{ladder?.state.marketplacePoints ?? 0} pkt</b>
                </div>
                <div>
                  <small>Uznane odpowiedzi</small>
                  <b>{ladder?.state.communityPoints ?? 0} pkt</b>
                </div>
              </div>
            </>
          )}
        </article>

        {/* Najwyżej jedna ciemna karta na ekran: zlecenie w toku. „W toku" raz — w plakietce. */}
        <aside
          className="v17-k v17-live v17-c5"
          aria-label="Zlecenie w toku"
          style={{ animationDelay: '.1s' }}
        >
          <div className="v17-kh">
            <span className="v17-plak em">W toku</span>
            <h3>Zlecenie w realizacji</h3>
          </div>
          {myLive || orderLive ? (
            <>
              <div className="v17-wiersz">
                <div>
                  <b>{myLive ? myLive.order.title : orderLive!.title}</b>
                  <small>
                    {myLive
                      ? OFFER_STATUS_LABELS[myLive.status]
                      : `${orderLive!.companyName} · ${ORDER_STATUS_LABELS[orderLive!.status]}`}
                  </small>
                </div>
              </div>
              <div className="v17-pary">
                {myLive ? (
                  <>
                    <div>
                      <small>Twoja oferta</small>
                      <b>
                        {myLive.proposedBudget != null
                          ? formatBudget(myLive.proposedBudget, myLive.proposedBudget)
                          : '—'}
                      </b>
                    </div>
                    <div>
                      <small>Wiadomości</small>
                      <b>{myLive.messagesCount}</b>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <small>Firma</small>
                      <b style={{ fontSize: '1rem' }}>{orderLive!.companyName}</b>
                    </div>
                    <div>
                      <small>Ofert</small>
                      <b>{orderLive!.offersCount}</b>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="v17-pusty">
              <b>Brak zleceń w toku</b>
              <span>Gdy przyjmiesz ofertę, zlecenie pojawi się tutaj.</span>
            </div>
          )}
        </aside>

        <article id="oferty" className="v17-k v17-c4" style={{ animationDelay: '.05s' }}>
          <div className="v17-kh">
            <span className="v17-ik">
              <Tag size={18} weight="duotone" />
            </span>
            <h3>Oferty do odpowiedzi</h3>
            <div className="r">
              <Link className="v17-lnk" href="/panel/zlecenia">
                Wszystkie <ArrowRight size={12} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </div>
          {toAnswer.length ? (
            toAnswer.slice(0, 3).map((o) => (
              <Link key={o.id} className="v17-wiersz" href={`/zlecenia/${o.id}`}>
                <div>
                  <b>{o.title}</b>
                  <small>{o.companyName}</small>
                </div>
                <span className="v17-plak em">
                  {o.offersCount}{' '}
                  {o.offersCount < 2 ? 'oferta' : o.offersCount < 5 ? 'oferty' : 'ofert'}
                </span>
              </Link>
            ))
          ) : (
            <div className="v17-pusty">
              <b>Brak ofert do odpowiedzi</b>
              <span>Opublikuj zlecenie, a oferty trafią tutaj.</span>
              <Link className="v17-lnk" href="/zlecenia/nowe">
                Dodaj zlecenie <ArrowRight size={12} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          )}
        </article>

        <article className="v17-k v17-c4" style={{ animationDelay: '.1s' }}>
          <div className="v17-kh">
            <span className="v17-ik">
              <Bell size={18} weight="duotone" />
            </span>
            <h3>Powiadomienia</h3>
            <div className="r">
              <Link className="v17-lnk" href="/powiadomienia">
                Wszystkie <ArrowRight size={12} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </div>
          {unread && unread.count > 0 ? (
            <Link className="v17-wiersz" href="/powiadomienia">
              <div>
                <b>{unread.count} nieprzeczytanych</b>
                <small>Nowe oferty, oceny i uznane odpowiedzi</small>
              </div>
            </Link>
          ) : (
            <div className="v17-pusty">
              <b>Nic nowego</b>
              <span>Gdy ktoś odpowie na Twoje zlecenie lub pytanie, zobaczysz to tutaj.</span>
            </div>
          )}
        </article>

        <article className="v17-k v17-c4" style={{ animationDelay: '.15s' }}>
          <div className="v17-kh">
            <span className="v17-ik">
              <Briefcase size={18} weight="duotone" />
            </span>
            <h3>Nowe zlecenia</h3>
            <div className="r">
              <Link className="v17-lnk" href="/zlecenia">
                Katalog <ArrowRight size={12} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </div>
          {catalog?.orders?.length ? (
            catalog.orders.map((o) => (
              <Link key={o.id} className="v17-wiersz" href={`/zlecenia/${o.id}`}>
                <div>
                  <b>{o.title}</b>
                  <small>
                    {formatBudget(o.budgetMin, o.budgetMax)} · {o.companyName}
                  </small>
                </div>
                <span className="v17-plak ok">otwarte</span>
              </Link>
            ))
          ) : (
            <div className="v17-pusty">
              <b>Brak nowych zleceń</b>
              <span>Zajrzyj do katalogu za chwilę.</span>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}

function Glowka({
  name,
  cta,
}: {
  name: string;
  cta?: { href: string; label: string; plus?: boolean };
}) {
  return (
    <div className="v17-glowka">
      <h1>
        Co dziś, <span className="v17-akc">{name.split(' ')[0]}</span>
      </h1>
      <span className="v17-sp" />
      {cta && (
        <Link className="v17-cta" href={cta.href}>
          {cta.plus ? (
            <Plus size={16} weight="bold" aria-hidden="true" />
          ) : (
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
          )}
          {cta.label}
        </Link>
      )}
    </div>
  );
}
