// Wiersze strumienia w czterech formach (makieta pro.js: wZlecenie / wPytanie / wRealizacja / wUsluga).
// Każdy typ treści ma własną formę: zlecenie = fakty + licznik ofert, pytanie = tytuł jako treść,
// realizacja = promień firma → Lider z „+pkt”, usługa = okładka + cena „od”.
import Link from 'next/link';

import { LEVEL_NAMES, FIRST_POINT } from '@/lib/levels';
import { budget, plural, timeAgo } from '@/lib/v17';
import { dniDoDojrzenia } from '@/lib/v17-data';
import type { Wpis } from '@/lib/v17-data';

import { Ico } from './ico';
import type { IcoName } from './ico';
import { Udostepnij } from './udostepnij';
import { WierszAwansu, WierszWpisu } from './wpis-spolecznosci';
import { Aw, Odznaka, Okladka, rodzajZBranzy } from './znaki';

export const TYP: Record<Wpis['k'], [string, IcoName, string]> = {
  wpis: ['Wpis', 'article', 'var(--text-muted)'],
  awans: ['Awans', 'ladder', 'var(--text-muted)'],
  zlecenie: ['Zlecenie', 'clipboard-text', 'var(--t-zlecenie)'],
  pytanie: ['Pytanie', 'chats-circle', 'var(--t-pytanie)'],
  realizacja: ['Realizacja', 'seal-check', 'var(--t-realizacja)'],
  usluga: ['Nowa usługa', 'storefront', 'var(--t-usluga)'],
};

export function Glowa({
  imie,
  href,
  level,
  czas,
  czasHref,
  k,
  meta,
}: {
  imie: string;
  href: string | null;
  level: number | null;
  czas: string;
  /** Wpis portalowy: czas jest odnośnikiem do strony wpisu. */
  czasHref?: string;
  k: Wpis['k'];
  meta: string;
}) {
  const [t, ik, c] = TYP[k];
  return (
    <>
      <div className="glowa">
        {href ? (
          <Link href={href} className="imie">
            {imie}
          </Link>
        ) : (
          <span className="imie">{imie}</span>
        )}
        {level !== null ? <Odznaka level={level} /> : null}
        {czasHref ? (
          <Link className="czas" href={czasHref} aria-label={`Otwórz wpis, ${czas}`}>
            · {czas}
          </Link>
        ) : (
          <span className="czas">· {czas}</span>
        )}
      </div>
      <div className="vmeta">
        <span className="typ" style={{ '--c': c } as React.CSSProperties}>
          <Ico n={ik} />
          <span>{t}</span>
        </span>
        {meta ? (
          <>
            <span className="sep" aria-hidden="true">
              ·
            </span>
            {meta}
          </>
        ) : null}
      </div>
    </>
  );
}

function Akcje({ href, odp, tytul }: { href: string; odp: string; tytul: string }) {
  return (
    <div className="akcje">
      <Link className="akcja" href={href} aria-label={odp} title={odp}>
        <Ico n="arrow-bend-up-left" />
      </Link>
      <Udostepnij href={href} tytul={tytul} />
    </div>
  );
}

const Nic = ({ t, od }: { t: string; od: string }) => (
  <div className="nic">
    <Ico n="seal-check" />
    <span>{t}</span>
    <b>{od}</b>
  </div>
);

export function WierszStrumienia({
  w,
  idx,
  zalogowany = false,
}: {
  w: Wpis;
  idx: number;
  zalogowany?: boolean;
}) {
  const czas = timeAgo(w.at);
  if (w.k === 'wpis') return <WierszWpisu w={w} zalogowany={zalogowany} />;
  if (w.k === 'awans') return <WierszAwansu w={w} />;
  if (w.k === 'zlecenie') {
    const href = `/zlecenia/${w.id}`;
    return (
      <article className="wpis">
        <Aw name={w.firma} size={40} company industry={w.branza} />
        <div>
          <Glowa imie={w.firma} href={null} level={null} czas={czas} k="zlecenie" meta={w.branza} />
          <div className="zlec">
            <div className="tyt">
              <Link href={href}>{w.tytul}</Link>
            </div>
            {/* API zlecenia nie niesie terminu ani miasta — pokazujemy tylko to, co jest (budżet, branża). */}
            <dl className="fakty">
              <div>
                <dt>Budżet</dt>
                <dd>{budget(w.budzetMin, w.budzetMax)}</dd>
              </div>
              <div>
                <dt>Branża</dt>
                <dd>{w.branza.split(' ')[0]}</dd>
              </div>
            </dl>
            <div className="zaufanie">
              {w.zweryfikowana ? (
                <>
                  <Ico n="seal-check" />
                  <span>Firma zweryfikowana</span>
                </>
              ) : (
                <span>Firma bez potwierdzonego NIP</span>
              )}
              {w.minLevel ? (
                <span className="wymaga">
                  <Ico n="lock-simple" />
                  Oferty od L{w.minLevel} · {LEVEL_NAMES[w.minLevel - 1]}
                </span>
              ) : null}
            </div>
            <div className="oferty">
              <span>
                <b>
                  {w.oferty
                    ? `${w.oferty} ${plural(w.oferty, 'oferta', 'oferty', 'ofert')}`
                    : 'Bez ofert'}
                </b>
              </span>
              <span className="pasek" aria-hidden="true">
                <span style={{ width: `${Math.min(100, w.oferty * 12.5)}%` }} />
              </span>
              <Link className="vbtn obrys maly" href={href}>
                Złóż ofertę
              </Link>
            </div>
            <Nic
              t={`Po ocenie 5/5 po realizacji zlecenia`}
              od={`do +${FIRST_POINT.reviewTopPoints} pkt dla Lidera`}
            />
          </div>
          <Akcje href={href} odp="Otwórz zlecenie" tytul={w.tytul} />
        </div>
      </article>
    );
  }
  if (w.k === 'pytanie') {
    const href = `/watki/${w.id}`;
    return (
      <article className="wpis">
        <Aw name={w.autor} size={40} />
        <div>
          <Glowa imie={w.autor} href={null} level={null} czas={czas} k="pytanie" meta={w.grupa} />
          <div className="pyt">
            <div className="tyt">
              <Link href={href}>{w.tytul}</Link>
            </div>
            <div className="pod">
              <span className="temat">{w.grupa}</span>
              <span>
                {w.odpowiedzi
                  ? `${w.odpowiedzi} ${plural(w.odpowiedzi, 'odpowiedź', 'odpowiedzi', 'odpowiedzi')}`
                  : 'Bez odpowiedzi'}
              </span>
            </div>
            <Nic
              t="Gdy autor uzna odpowiedź"
              od={`+${FIRST_POINT.answerAcceptedPoints} pkt dla odpowiadającego`}
            />
          </div>
          <Akcje href={href} odp="Odpowiedz" tytul={w.tytul} />
        </div>
      </article>
    );
  }
  if (w.k === 'realizacja') {
    const lh = w.lider.handle ? `/profil/${w.lider.handle}` : null;
    const src = w.lider.avatarFileId ? `/api/v1/files/${w.lider.avatarFileId}/thumb` : null;
    const dni = dniDoDojrzenia(w.dojrzewa);
    const waga = w.waga !== null && w.waga < 1 ? ` · ×${String(w.waga).replace('.', ',')}` : '';
    return (
      <article className="wpis">
        <Aw name={w.lider.name} size={40} ring level={w.lider.level} src={src} />
        <div>
          <Glowa
            imie={w.lider.name}
            href={lh}
            level={w.lider.level}
            czas={czas}
            k="realizacja"
            meta={w.branza.name}
          />
          <div className="swiatlo">
            <div className="scena">
              <Aw name={w.firma} size={48} company industry={w.branza.name} />
              <div className="promien">
                {/* „Promień”: ocena Firmy → punkty Lidera, FAKTYCZNE po wagach (decyzja właściciela 25.11:
                    publiczne). Brak zdarzenia (cofnięte / jeszcze nienaliczone) → myślnik, nie wymysł. */}
                <b>
                  {w.pkt !== null ? `+${w.pkt}` : '—'}
                  <span> pkt</span>
                </b>
                <small>
                  ocena {w.ocena}/5
                  {w.pkt !== null && dni
                    ? ` · dojrzewa za ${dni} ${plural(dni, 'dzień', 'dni', 'dni')}`
                    : ''}
                  {waga}
                </small>
              </div>
              <Aw name={w.lider.name} size={48} ring level={w.lider.level} src={src} />
            </div>
            <div className="dol">
              <Okladka
                id={`ok-s-${idx}`}
                rodzaj={rodzajZBranzy(w.branza.slug)}
                seed={2}
                ikona={false}
                style={{ width: 44, height: 44, borderRadius: 10, flex: 'none' }}
              />
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="tyt">{w.tytul}</span>
                <br />
                <span className="pod">
                  {w.firma} ·{' '}
                  <span className="gwiazdy" aria-label={`${w.ocena} na 5`}>
                    {[...Array(w.ocena)].map((_, i) => (
                      <Ico key={i} n="star" />
                    ))}
                  </span>{' '}
                  {w.ocena}/5
                </span>
              </span>
            </div>
          </div>
          {lh ? (
            <Akcje href={lh} odp="Zobacz profil Lidera" tytul={`${w.lider.name} — ${w.tytul}`} />
          ) : null}
        </div>
      </article>
    );
  }
  const href = `/uslugi/${w.slug}`;
  const src = w.lider.avatarFileId ? `/api/v1/files/${w.lider.avatarFileId}/thumb` : null;
  return (
    <article className="wpis">
      <Aw name={w.lider.name} size={40} src={src} />
      <div>
        <Glowa
          imie={w.lider.name}
          href={null}
          level={w.lider.level}
          czas={czas}
          k="usluga"
          meta={w.branza}
        />
        <Link className="usl" href={href}>
          <Okladka id={`ok-u-${idx}`} rodzaj={rodzajZBranzy(w.branza)} seed={3} />
          <span className="opis">
            <span className="tyt">{w.tytul}</span>
            {w.ocena !== null && w.ocen > 0 ? (
              <span className="ocena">
                <Ico n="star" />
                {w.ocena.toFixed(1).replace('.', ',')}
                <span>
                  ({w.ocen} {plural(w.ocen, 'ocena', 'oceny', 'ocen')})
                </span>
              </span>
            ) : (
              <span className="ocena">
                <span>Bez ocen</span>
              </span>
            )}
            <span className="dno">
              <span className="cena">
                od <b>{w.cenaOd} zł</b>
              </span>
            </span>
          </span>
        </Link>
        <Nic t="Po ocenie 5/5 od klienta" od={`+${FIRST_POINT.reviewTopPoints} pkt dla Lidera`} />
        <Akcje href={href} odp="Otwórz usługę" tytul={w.tytul} />
      </div>
    </article>
  );
}
