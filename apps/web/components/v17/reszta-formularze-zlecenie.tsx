'use client';

// /zlecenia/nowe (makieta p1b: zlecenieNowe). Wywołania API i szkic gościa — te same, co w
// app/zlecenia/nowe/new-order-form.tsx; zmienia się tylko układ (kroki, podgląd, błędy przy polach).
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';

import { DRAFT_KEY, type ForLeader } from '@/app/zlecenia/nowe/new-order-form';
import { ApiRequestError, apiFetch } from '@/lib/api';
import { LEVEL_NAMES } from '@/lib/levels';
import { nf4 } from '@/lib/v17';

import { Info, Pole } from './formy';
import { Ico } from './ico';
import { SzkieletFormularza, calkowita, kontrolka, skupBlad, skupPasek } from './reszta-formularze';
import { Wstecz, zl } from './rynek';
import { Aw, Szczebelki } from './znaki';

interface Firma {
  id: string;
  name: string;
  nipVerifiedAt: string | null;
}

// Nazwy pól = klucze szkicu w sessionStorage: stary i nowy ekran muszą czytać swoje szkice nawzajem.
interface Pola {
  title: string;
  industryId: string;
  description: string;
  budgetMin: string;
  budgetMax: string;
  minLevel: string;
}
type Bledy = Partial<Record<keyof Pola, string>>;

const PUSTE: Pola = {
  title: '',
  industryId: '',
  description: '',
  budgetMin: '',
  budgetMax: '',
  minLevel: '0',
};
const ID: Record<keyof Pola, string> = {
  title: 'tyt',
  industryId: 'br',
  description: 'opis',
  budgetMin: 'b1',
  budgetMax: 'b2',
  minLevel: 'lv',
};
const KROK_1: Array<keyof Pola> = ['title', 'industryId', 'description'];
const BUDZET: Array<keyof Pola> = ['budgetMin', 'budgetMax'];

const KROKI_GOSCIA = [
  ['Potrzeba', 'Tytuł, branża, opis, budżet'],
  ['Konto i firma', 'Jeden formularz'],
  ['Publikacja', 'Po potwierdzeniu e-maila'],
];
const KROKI = [
  ['Potrzeba', 'Tytuł, branża, opis'],
  ['Budżet i poziom', 'Widełki i kto może złożyć ofertę'],
  ['Szkic i publikacja', 'Sprawdzasz i publikujesz'],
];

function sprawdz(p: Pola, ktore: Array<keyof Pola>): Bledy {
  const b: Bledy = {};
  const od = calkowita(p.budgetMin);
  const dokad = calkowita(p.budgetMax);
  if (p.title.trim().length < 5) b.title = 'Tytuł: min. 5 znaków';
  if (!p.industryId) b.industryId = 'Wybierz branżę';
  if (p.description.trim().length < 20) b.description = 'Opis: min. 20 znaków';
  if (od === null) b.budgetMin = 'Podaj kwotę w pełnych złotych';
  if (dokad === null) b.budgetMax = 'Podaj kwotę w pełnych złotych';
  else if (od !== null && dokad < od) b.budgetMax = 'Kwota „do” jest niższa niż „od”';
  return Object.fromEntries(Object.entries(b).filter(([k]) => ktore.includes(k as keyof Pola)));
}

function czytajSzkic(): Pola | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? { ...PUSTE, ...(JSON.parse(raw) as Partial<Pola>) } : null;
  } catch {
    return null;
  }
}

function zapiszSzkic(p: Pola) {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(p));
  } catch {
    /* prywatny tryb bez storage — formularz i tak przejdzie po zalogowaniu */
  }
}

export function ZlecenieFormularz({
  gosc,
  firmy,
  branze,
  dlaLidera,
}: {
  gosc: boolean;
  firmy: Firma[];
  branze: Array<{ id: string; name: string }>;
  dlaLidera: ForLeader | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pola, setPola] = useState<Pola>({ ...PUSTE, industryId: dlaLidera?.industryId ?? '' });
  const [firmaId, setFirmaId] = useState(firmy[0]?.id ?? '');
  const [krok, setKrok] = useState(0);
  const [bledy, setBledy] = useState<Bledy>({});
  const [blad, setBlad] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [wszystkiePoziomy, setWszystkiePoziomy] = useState(false);
  const [zeSzkicu, setZeSzkicu] = useState(false);
  const [gotowe, setGotowe] = useState(gosc);

  useEffect(() => {
    if (gosc) {
      // Gość dostaje formularz z serwera i może pisać przed hydracją — przejmujemy to, co już jest w polach.
      const form = formRef.current;
      if (!form) return;
      const wpisane = [...new FormData(form).entries()].filter(([k, v]) => k in PUSTE && v);
      if (wpisane.length) setPola((p) => ({ ...p, ...Object.fromEntries(wpisane) }));
      return;
    }
    const szkic = czytajSzkic();
    if (szkic) {
      setPola(szkic);
      setZeSzkicu(true);
    }
    setGotowe(true);
  }, [gosc]);

  if (!gotowe) return <SzkieletFormularza />;

  const krok2 = !gosc && krok === 1;
  const ustaw = (k: keyof Pola, v: string) => {
    setPola((p) => ({ ...p, [k]: v }));
    setBledy((b) => ({ ...b, [k]: undefined }));
  };
  const pole = (k: keyof Pola) => ({
    ...kontrolka(ID[k], bledy[k]),
    name: k,
    value: pola[k],
    onChange: (e: { target: { value: string } }) => ustaw(k, e.target.value),
  });
  const idzDo = (k: number) => {
    setKrok(k);
    setBlad(null);
    window.scrollTo({ top: 0 });
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBlad(null);
    const ktore = gosc ? [...KROK_1, ...BUDZET] : krok2 ? [...KROK_1, ...BUDZET] : KROK_1;
    const b = sprawdz(pola, ktore);
    setBledy(b);
    if (Object.keys(b).length) {
      if (krok2 && KROK_1.some((k) => b[k])) setKrok(0);
      skupBlad(formRef.current);
      return;
    }
    if (gosc) {
      // Szkic do przeglądarki, konto w następnym kroku: `cel=firma` zakłada konto i firmę naraz,
      // a `dalej=zlecenie` wraca tu.
      zapiszSzkic(pola);
      router.push('/rejestracja?cel=firma&dalej=zlecenie');
      return;
    }
    if (!krok2) return idzDo(1);

    setPending(true);
    try {
      const { id } = await apiFetch<{ id: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          companyId: firmaId,
          title: pola.title,
          description: pola.description,
          industryId: pola.industryId,
          budgetMin: calkowita(pola.budgetMin),
          budgetMax: calkowita(pola.budgetMax),
          minLevel: Number(pola.minLevel),
        }),
      });
      try {
        window.sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* nic */
      }
      router.push(`/zlecenia/${id}`);
      router.refresh();
    } catch (err) {
      setBlad(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
      skupPasek(formRef.current);
      setPending(false);
    }
  }

  const ileBledow = Object.values(bledy).filter(Boolean).length;
  const firma = firmy.find((f) => f.id === firmaId);
  const branza = branze.find((i) => i.id === pola.industryId)?.name;
  const od = calkowita(pola.budgetMin);
  const dokad = calkowita(pola.budgetMax);
  const prog = Number(pola.minLevel);
  const przycisk = pending
    ? 'Zapisywanie…'
    : gosc
      ? 'Dalej: konto i firma'
      : krok2
        ? 'Zapisz szkic zlecenia'
        : 'Dalej: budżet i poziom';

  const budzet = (
    <div className="pf2 ciasno">
      {(
        [
          ['budgetMin', 'Budżet od', 'np. 2000'],
          ['budgetMax', 'Budżet do', 'np. 5000'],
        ] as const
      ).map(([k, etykieta, wzor]) => (
        <Pole key={k} id={ID[k]} etykieta={etykieta} blad={bledy[k]}>
          <span className="jedn">
            <input {...pole(k)} type="text" inputMode="numeric" placeholder={wzor} required />
            <span>zł</span>
          </span>
        </Pole>
      ))}
    </div>
  );

  return (
    <div className="fm">
      <div className="fm-gl">
        <Wstecz href="/zlecenia">Zlecenia</Wstecz>
        <h1>{gosc ? 'Opisz, co ma powstać' : 'Nowe zlecenie'}</h1>
        <p>
          {gosc
            ? 'Bez konta na start. Opiszesz potrzebę, a konto i firmę założysz w następnym kroku — jednym formularzem. Zlecenie opublikujesz po potwierdzeniu adresu e-mail.'
            : 'Zlecenie powstaje jako szkic — opublikujesz je po sprawdzeniu treści.'}
        </p>
      </div>
      <div className="fm-t">
        <ol className="kroki" aria-label="Kroki">
          {(gosc ? KROKI_GOSCIA : KROKI).map(([t, o], i) => (
            <li
              key={t}
              aria-current={i === krok ? 'step' : undefined}
              className={i < krok ? 'ok' : undefined}
            >
              <b>
                {i < krok ? (
                  <>
                    <Ico n="check" />{' '}
                  </>
                ) : null}
                {i + 1}. {t}
              </b>
              <span>{o}</span>
            </li>
          ))}
        </ol>
        {dlaLidera && !zeSzkicu && (
          <div data-testid="for-leader">
            <Info ikona="user-focus">
              <b>Zlecenie z myślą o: {dlaLidera.name}.</b> Po publikacji trafi do zleceń z branży „
              {dlaLidera.industryName}” —{' '}
              <Link href={`/liderzy/${dlaLidera.id}`}>{dlaLidera.name}</Link> i inni Liderzy z tej
              branży złożą ofertę, a Ty wybierzesz.
            </Info>
          </div>
        )}
        {zeSzkicu && (
          <div data-testid="draft-restored">
            <Info ikona="info">
              Wypełniliśmy formularz Twoim opisem sprzed rejestracji. Sprawdź i zapisz.
            </Info>
          </div>
        )}
        {ileBledow > 0 || blad ? (
          <Info ikona="warning-circle" rodzaj="zle">
            <b>Nie zapisaliśmy zlecenia.</b>{' '}
            {blad ?? (ileBledow > 1 ? 'Popraw zaznaczone pola.' : 'Popraw zaznaczone pole.')}
          </Info>
        ) : null}
        <form ref={formRef} onSubmit={onSubmit} noValidate>
          {krok2 ? (
            <fieldset className="fs" key="budzet">
              <legend className="sr">Budżet i poziom</legend>
              {budzet}
              <div className="pf">
                <span className="et" id="lv-et">
                  Minimalny poziom Lidera
                </span>
                <div className="wyb-l" role="radiogroup" aria-labelledby="lv-et">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <label key={n} data-cel-ok hidden={n > 3 && !wszystkiePoziomy && prog <= 3}>
                      <input
                        type="radio"
                        name="minLevel"
                        value={n}
                        checked={prog === n}
                        onChange={() => ustaw('minLevel', String(n))}
                      />
                      {n ? (
                        <span
                          className="odz"
                          style={{ '--lv': `var(--level-${n})` } as CSSProperties}
                          title={`Szczebel ${n} z 7`}
                        >
                          <Szczebelki level={n} />
                          Od poziomu {n}
                        </span>
                      ) : (
                        'Bez wymagań'
                      )}
                      <small>{n ? LEVEL_NAMES[n - 1] : 'otwarte dla wszystkich'}</small>
                    </label>
                  ))}
                </div>
                {!wszystkiePoziomy && prog <= 3 && (
                  <button
                    className="vbtn tekst"
                    type="button"
                    style={{ justifySelf: 'start' }}
                    onClick={() => setWszystkiePoziomy(true)}
                  >
                    Pokaż poziomy 4–7
                  </button>
                )}
                <span className="pom">Im wyższy próg, tym mniej Liderów może złożyć ofertę.</span>
              </div>
            </fieldset>
          ) : (
            <fieldset className="fs" key="potrzeba">
              <legend className="sr">Potrzeba</legend>
              {!gosc && (
                <Pole id="firma" etykieta="Firma zlecająca">
                  <select id="firma" value={firmaId} onChange={(e) => setFirmaId(e.target.value)}>
                    {firmy.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </Pole>
              )}
              <Pole id="tyt" etykieta="Tytuł" licznik="od 5 do 140 znaków" blad={bledy.title}>
                <input
                  {...pole('title')}
                  type="text"
                  required
                  maxLength={140}
                  placeholder="np. Uporządkowanie procesu ofertowania w zespole sprzedaży"
                />
              </Pole>
              <Pole id="br" etykieta="Branża" blad={bledy.industryId}>
                <select {...pole('industryId')} required>
                  <option value="" disabled>
                    Wybierz branżę
                  </option>
                  {branze.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </Pole>
              <Pole
                id="opis"
                etykieta="Opis potrzeby"
                licznik="min. 20 znaków"
                blad={bledy.description}
                pomoc="Napisz, co jest dziś, co ma być i po czym poznasz, że się udało."
              >
                <textarea
                  {...pole('description')}
                  rows={6}
                  required
                  maxLength={10000}
                  placeholder="np. Mamy 12 handlowców, oferta powstaje tydzień i każdy robi ją inaczej. Chcemy jednego procesu i tygodniowego rytmu — efekt w 2 miesiące."
                />
              </Pole>
              {gosc && (
                <>
                  {budzet}
                  <Pole id="lv" etykieta="Minimalny poziom Lidera">
                    <select {...pole('minLevel')}>
                      <option value="0">Bez wymagań (otwarte dla wszystkich)</option>
                      {LEVEL_NAMES.map((nazwa, i) => (
                        <option key={nazwa} value={i + 1}>
                          Poziom {i + 1}+ · {nazwa}
                        </option>
                      ))}
                    </select>
                  </Pole>
                </>
              )}
            </fieldset>
          )}
          <div className="fm-pasek">
            {krok2 && (
              <button className="vbtn obrys" type="button" onClick={() => idzDo(0)}>
                <Ico n="arrow-left" />
                Wstecz
              </button>
            )}
            <span className="sp" />
            <button className="vbtn glowny" type="submit" disabled={pending}>
              {przycisk}
            </button>
            {gosc && (
              <p className="pom">
                Masz już konto?{' '}
                {/* Obietnica „szkic zostanie” musi być prawdziwa także bez kliknięcia „Dalej”. */}
                <Link className="tl" href="/logowanie" onClick={() => zapiszSzkic(pola)}>
                  Zaloguj się
                </Link>{' '}
                — szkic zostanie w tej karcie.
              </p>
            )}
          </div>
        </form>
      </div>
      <aside className="fm-bok">
        <section className="fm-karta podglad" aria-label="Podgląd na liście zleceń">
          <h2>Tak zobaczą to Liderzy</h2>
          <div className="zl-w">
            {firma ? (
              <Aw name={firma.name} size={40} company industry={branza ?? firma.name} />
            ) : (
              <span className="aw-pusty" aria-hidden="true">
                <Ico n="buildings" />
              </span>
            )}
            <div style={{ minWidth: 0 }}>
              <div className="zl-kto">
                <b>{firma?.name ?? 'Twoja firma'}</b>
                {firma && (
                  <span className={`zw${firma.nipVerifiedAt ? '' : ' brak'}`}>
                    <Ico n={firma.nipVerifiedAt ? 'seal-check' : 'question'} />
                    {firma.nipVerifiedAt ? 'NIP — suma kontrolna OK' : 'Bez NIP'}
                  </span>
                )}
              </div>
              <div className="zl-tyt">{pola.title.trim() || 'Tytuł Twojego zlecenia'}</div>
              <div className="zl-fakty">
                <b>{od !== null && dokad !== null ? `${nf4(od)}–${zl(dokad)}` : '— zł'}</b>
                <span>{branza ?? 'Branża'}</span>
              </div>
              {prog > 0 && (
                <div className="zl-wym">
                  <Ico n="lock-simple" />
                  <span>
                    Oferty od{' '}
                    <b>
                      L{prog} · {LEVEL_NAMES[prog - 1]}
                    </b>
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
        <section className="fm-karta">
          <h2>Co dalej</h2>
          <p>
            <b>Oferty przyjdą z kwotą i terminem.</b> Przy każdej zobaczysz poziom Lidera i oceny po
            zleceniach. Rejestracja, publikacja i oferty są bezpłatne.
          </p>
          <p>
            Oferta ani wybór wykonawcy punktów nie dają — punkty daje dopiero Twoja ocena po
            realizacji.
          </p>
        </section>
      </aside>
    </div>
  );
}
