'use client';

// /uslugi/nowa i /uslugi/[slug]/edytuj (makieta p1b: formUslugi). Payload i wywołania API — te same,
// co w app/uslugi/listing-form.tsx, razem z ponowieniem publikacji zapisanego szkicu.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

import type { ListingInitial } from '@/app/uslugi/listing-form';
import { ApiRequestError, apiFetch } from '@/lib/api';

import { Info, Pole } from './formy';
import { Ico } from './ico';
import { calkowita, kontrolka, skupBlad, skupPasek } from './reszta-formularze';
import { Ocena, Wstecz, zl } from './rynek';
import { Aw, Odznaka, Okladka, rodzajRynek } from './znaki';

type Tier = ListingInitial['packages'][number]['tier'];
interface Pakiet {
  tier: Tier;
  name: string;
  priceDeclared: string;
  scope: string;
  deliveryDays: string;
}
export type StatusUslugi = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';
export interface Autor {
  name: string;
  level: number;
  avatarFileId: string | null;
  srednia: number | null;
  liczbaOcen: number;
}

const TIERY: Tier[] = ['BASIC', 'STANDARD', 'PREMIUM'];
const NAZWY: Record<Tier, string> = {
  BASIC: 'Podstawowy',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
};
const STATUSY: Record<StatusUslugi, [string, string]> = {
  DRAFT: ['Szkic', 'Szkic widzisz tylko Ty. Opublikujesz go w „Moich usługach”.'],
  PUBLISHED: ['Opublikowana', 'Zmiany widać publicznie od razu po zapisaniu.'],
  PAUSED: ['Wstrzymana', 'Usługa jest wstrzymana. Wznowisz ją w „Moich usługach”.'],
  ARCHIVED: ['Zarchiwizowana', ''],
};
const pustyPakiet = (tier: Tier): Pakiet => ({
  tier,
  name: '',
  priceDeclared: '',
  scope: '',
  deliveryDays: '',
});

const tagiZ = (s: string) =>
  s
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 5);

async function wgraj(file: File): Promise<string> {
  const form = new FormData();
  form.append('kind', 'LISTING');
  form.append('file', file);
  const res = await apiFetch<{ file: { id: string } }>('/files', { method: 'POST', body: form });
  return res.file.id;
}

export function UslugaFormularz({
  branze,
  autor,
  initial,
}: {
  branze: Array<{ id: string; name: string }>;
  autor: Autor;
  initial?: ListingInitial & { status: StatusUslugi };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const plikRef = useRef<HTMLInputElement>(null);
  const [tytul, setTytul] = useState(initial?.title ?? '');
  const [branzaId, setBranzaId] = useState(initial?.industryId ?? '');
  const [opis, setOpis] = useState(initial?.description ?? '');
  const [tagi, setTagi] = useState(initial?.tags.join(', ') ?? '');
  const [pakiety, setPakiety] = useState<Pakiet[]>(
    initial && initial.packages.length > 0
      ? initial.packages.map((p) => ({
          tier: p.tier,
          name: p.name,
          priceDeclared: String(p.priceDeclared),
          scope: p.scope,
          deliveryDays: String(p.deliveryDays),
        }))
      : [pustyPakiet('BASIC')],
  );
  const [zdjecia, setZdjecia] = useState<string[]>(initial?.imageFileIds ?? []);
  const [wgrywanie, setWgrywanie] = useState(false);
  const [bladZdjec, setBladZdjec] = useState<string | null>(null);
  const [bledy, setBledy] = useState<Record<string, string | undefined>>({});
  const [blad, setBlad] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Szkic zapisany w tej karcie, którego publikacja się nie udała — kolejne kliknięcie
  // poprawia go i publikuje, zamiast tworzyć drugi.
  const [szkic, setSzkic] = useState<{ id: string; slug: string } | null>(null);

  const zablokowana = initial?.status === 'ARCHIVED';
  const czysc = (k: string) => setBledy((b) => ({ ...b, [k]: undefined }));
  const pole = (id: string, value: string, set: (v: string) => void) => ({
    ...kontrolka(id, bledy[id]),
    value,
    onChange: (e: { target: { value: string } }) => {
      set(e.target.value);
      czysc(id);
    },
  });
  const ustawPakiet = (i: number, zmiana: Partial<Pakiet>) =>
    setPakiety((prev) => prev.map((p, j) => (j === i ? { ...p, ...zmiana } : p)));

  function dodajPakiet() {
    const uzyte = new Set(pakiety.map((p) => p.tier));
    const nastepny = TIERY.find((t) => !uzyte.has(t));
    if (nastepny) setPakiety((prev) => [...prev, pustyPakiet(nastepny)]);
  }

  function usunPakiet(i: number) {
    setPakiety((prev) => prev.filter((_, j) => j !== i));
    // Błędy pakietów są przypięte do pozycji — po usunięciu wskazywałyby cudze pola.
    setBledy((b) => Object.fromEntries(Object.entries(b).filter(([k]) => !/^p[ncds]\d$/.test(k))));
  }

  async function dodajZdjecia(files: FileList | null) {
    if (!files || files.length === 0) return;
    setWgrywanie(true);
    setBladZdjec(null);
    try {
      for (const file of Array.from(files).slice(0, 6 - zdjecia.length)) {
        const id = await wgraj(file);
        setZdjecia((prev) => [...prev, id]);
      }
    } catch (err) {
      setBladZdjec(err instanceof ApiRequestError ? err.message : 'Nie udało się wgrać zdjęcia.');
    } finally {
      setWgrywanie(false);
      if (plikRef.current) plikRef.current.value = '';
    }
  }

  // Granice = schemat z @lot/contracts; API odpowiada tylko „Nieprawidłowe dane”, więc pole wskazujemy tutaj.
  function sprawdz() {
    const b: Record<string, string> = {};
    const dl = (s: string, od: number, dokad: number) =>
      s.trim().length >= od && s.trim().length <= dokad;
    const liczba = (s: string, max: number) => {
      const n = calkowita(s);
      return n !== null && n >= 1 && n <= max;
    };
    if (!dl(tytul, 10, 120)) b.tyt = 'Tytuł: od 10 do 120 znaków';
    if (!branzaId) b.br = 'Wybierz branżę';
    if (!dl(opis, 50, 10_000)) b.opis = 'Opis: min. 50 znaków';
    if (tagiZ(tagi).some((t) => t.length > 30)) b.tagi = 'Tag może mieć najwyżej 30 znaków';
    pakiety.forEach((p, i) => {
      if (!dl(p.name, 2, 80)) b[`pn${i}`] = 'Nazwa: od 2 do 80 znaków';
      if (!liczba(p.priceDeclared, 1_000_000))
        b[`pc${i}`] = 'Cena w pełnych złotych, od 1 do 1 000 000';
      if (!liczba(p.deliveryDays, 365)) b[`pd${i}`] = 'Termin od 1 do 365 dni';
      if (!dl(p.scope, 10, 2000)) b[`ps${i}`] = 'Zakres: min. 10 znaków';
    });
    return b;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBlad(null);
    const b = sprawdz();
    setBledy(b);
    if (Object.keys(b).length) {
      skupBlad(formRef.current);
      return;
    }
    setPending(true);
    const payload = {
      industryId: branzaId,
      title: tytul,
      description: opis,
      tags: tagiZ(tagi),
      packages: pakiety.map((p) => ({
        tier: p.tier,
        name: p.name,
        priceDeclared: calkowita(p.priceDeclared),
        scope: p.scope,
        deliveryDays: calkowita(p.deliveryDays),
      })),
      imageFileIds: zdjecia,
    };
    try {
      if (initial) {
        await apiFetch(`/listings/${initial.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        // Slug jest stabilny. Szkic nie ma publicznej strony (404), więc po jego zapisie wracamy do panelu.
        router.push(initial.status === 'DRAFT' ? '/panel/uslugi' : `/uslugi/${initial.slug}`);
        router.refresh();
      } else {
        let created = szkic;
        if (created) {
          await apiFetch(`/listings/${created.id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
        } else {
          created = await apiFetch<{ id: string; slug: string }>('/listings', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          setSzkic(created);
        }
        await apiFetch(`/listings/${created.id}/publish`, { method: 'POST' });
        router.push(`/uslugi/${created.slug}`);
      }
    } catch (err) {
      setBlad(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
      skupPasek(formRef.current);
      setPending(false);
    }
  }

  const mojeUslugi = (
    <Link className="vbtn obrys maly" href="/panel/uslugi">
      Moje usługi
    </Link>
  );
  const ileBledow = Object.values(bledy).filter(Boolean).length;
  const branza = branze.find((i) => i.id === branzaId)?.name;
  const ceny = pakiety
    .map((p) => calkowita(p.priceDeclared))
    .filter((n): n is number => n !== null && n > 0);
  const przycisk = initial
    ? pending
      ? 'Zapisywanie…'
      : 'Zapisz zmiany'
    : pending
      ? 'Publikowanie…'
      : szkic
        ? 'Opublikuj ponownie'
        : 'Opublikuj usługę';
  const wstep = initial
    ? STATUSY[initial.status][1]
    : 'Opisz konkretny rezultat, podziel ofertę na pakiety i zadeklaruj ceny. Usługa trafi do katalogu po publikacji.';

  return (
    <div className="fm">
      <div className="fm-gl">
        <Wstecz href="/panel/uslugi">Moje usługi</Wstecz>
        <h1>{initial ? 'Edytuj usługę' : 'Nowa usługa'}</h1>
        <p>{wstep}</p>
      </div>
      <div className="fm-t">
        {zablokowana && (
          <Info ikona="archive" rodzaj="zle" akcje={mojeUslugi}>
            <b>Zarchiwizowanej usługi nie można edytować.</b> Historia i adres usługi zostają.
          </Info>
        )}
        {blad ? (
          szkic ? (
            <Info ikona="warning-circle" rodzaj="zle" akcje={mojeUslugi}>
              <b>Szkic zapisany, ale nie opublikowany.</b> {blad}
            </Info>
          ) : (
            <Info ikona="warning-circle" rodzaj="zle">
              <b>{initial ? 'Nie zapisaliśmy zmian.' : 'Nie zapisaliśmy usługi.'}</b> {blad}
            </Info>
          )
        ) : ileBledow > 0 ? (
          <Info ikona="warning-circle" rodzaj="zle">
            <b>{initial ? 'Nie zapisaliśmy zmian.' : 'Nie zapisaliśmy usługi.'}</b>{' '}
            {ileBledow > 1 ? 'Popraw zaznaczone pola.' : 'Popraw zaznaczone pole.'}
          </Info>
        ) : null}
        <form ref={formRef} onSubmit={onSubmit} noValidate>
          <fieldset
            disabled={zablokowana}
            style={{
              border: 0,
              margin: 0,
              padding: 0,
              minWidth: 0,
              opacity: zablokowana ? 0.55 : undefined,
            }}
          >
            <div className="fs">
              <h2>Usługa</h2>
              <Pole
                id="tyt"
                etykieta="Tytuł usługi"
                licznik="od 10 do 120 znaków"
                blad={bledy.tyt}
                pomoc={
                  initial
                    ? 'Adres usługi (link) pozostaje bez zmian — także po zmianie tytułu.'
                    : undefined
                }
              >
                <input
                  {...pole('tyt', tytul, setTytul)}
                  type="text"
                  required
                  maxLength={120}
                  placeholder="np. Zbuduję i wdrożę automatyzację lejka sprzedaży"
                />
              </Pole>
              <Pole id="br" etykieta="Branża" blad={bledy.br}>
                <select {...pole('br', branzaId, setBranzaId)} required>
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
                etykieta="Opis — co dokładnie dostarczysz?"
                licznik="min. 50 znaków"
                blad={bledy.opis}
              >
                <textarea {...pole('opis', opis, setOpis)} rows={6} required maxLength={10000} />
              </Pole>
              <Pole
                id="tagi"
                etykieta="Tagi"
                licznik="opcjonalnie, do 5"
                blad={bledy.tagi}
                pomoc="Po przecinku, każdy od 2 do 30 znaków."
              >
                <input
                  {...pole('tagi', tagi, setTagi)}
                  type="text"
                  placeholder="np. automatyzacja, CRM, sprzedaż"
                />
              </Pole>
            </div>
            <div className="fs">
              <h2>Pakiety</h2>
              <span className="pf">
                <span className="pom">
                  Od jednego do trzech. Cena to Twoja deklaracja — Portal nie pośredniczy w
                  płatnościach.
                </span>
              </span>
              {pakiety.map((p, i) => (
                <div className="pkt-ed" key={p.tier} role="group" aria-label={NAZWY[p.tier]}>
                  <header>
                    <h3>{NAZWY[p.tier]}</h3>
                    {pakiety.length > 1 && (
                      <button className="vbtn tekst" type="button" onClick={() => usunPakiet(i)}>
                        <Ico n="trash" />
                        Usuń pakiet
                      </button>
                    )}
                  </header>
                  <Pole id={`pn${i}`} etykieta="Nazwa pakietu" blad={bledy[`pn${i}`]}>
                    <input
                      {...pole(`pn${i}`, p.name, (name) => ustawPakiet(i, { name }))}
                      type="text"
                      required
                      maxLength={80}
                      placeholder="np. Audyt / Wdrożenie / Wdrożenie + opieka"
                    />
                  </Pole>
                  <div className="pf2 ciasno">
                    <Pole id={`pc${i}`} etykieta="Cena" blad={bledy[`pc${i}`]}>
                      <span className="jedn">
                        <input
                          {...pole(`pc${i}`, p.priceDeclared, (priceDeclared) =>
                            ustawPakiet(i, { priceDeclared }),
                          )}
                          type="text"
                          inputMode="numeric"
                          required
                        />
                        <span>zł</span>
                      </span>
                    </Pole>
                    <Pole id={`pd${i}`} etykieta="Termin" blad={bledy[`pd${i}`]}>
                      <span className="jedn">
                        <input
                          {...pole(`pd${i}`, p.deliveryDays, (deliveryDays) =>
                            ustawPakiet(i, { deliveryDays }),
                          )}
                          type="text"
                          inputMode="numeric"
                          required
                        />
                        <span>dni</span>
                      </span>
                    </Pole>
                  </div>
                  <Pole
                    id={`ps${i}`}
                    etykieta="Zakres"
                    licznik="min. 10 znaków"
                    blad={bledy[`ps${i}`]}
                  >
                    <textarea
                      {...pole(`ps${i}`, p.scope, (scope) => ustawPakiet(i, { scope }))}
                      rows={3}
                      required
                      maxLength={2000}
                    />
                  </Pole>
                </div>
              ))}
              {pakiety.length < 3 && (
                <button className="dod" type="button" onClick={dodajPakiet}>
                  <Ico n="plus" />
                  Dodaj pakiet
                </button>
              )}
            </div>
            <div className="fs">
              <h2>Zdjęcia</h2>
              <input
                ref={plikRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                aria-label="Zdjęcia usługi"
                onChange={(e) => void dodajZdjecia(e.target.files)}
              />
              {zdjecia.length === 0 ? (
                <button
                  className="dod"
                  type="button"
                  disabled={wgrywanie}
                  onClick={() => plikRef.current?.click()}
                >
                  <Ico n="image-square" />
                  {wgrywanie ? 'Wgrywanie…' : 'Dodaj zdjęcia'}
                </button>
              ) : (
                <div className="zdj">
                  {zdjecia.map((id, i) => (
                    <figure key={id}>
                      <div className="okl">
                        <img
                          src={`/api/v1/files/${id}/thumb`}
                          alt={`Zdjęcie ${i + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      {i === 0 && <figcaption>Okładka</figcaption>}
                      <button
                        type="button"
                        aria-label="Usuń zdjęcie"
                        onClick={() => setZdjecia((prev) => prev.filter((x) => x !== id))}
                      >
                        <Ico n="x" />
                      </button>
                    </figure>
                  ))}
                  {zdjecia.length < 6 && (
                    <button
                      className="dod"
                      type="button"
                      disabled={wgrywanie}
                      onClick={() => plikRef.current?.click()}
                    >
                      <Ico n="plus" />
                      <span>{wgrywanie ? 'Wgrywanie…' : 'Dodaj zdjęcie'}</span>
                    </button>
                  )}
                </div>
              )}
              <span className={bladZdjec ? 'pf zle' : 'pf'}>
                {bladZdjec && (
                  <span className="err" role="alert">
                    <Ico n="warning-circle" />
                    {bladZdjec}
                  </span>
                )}
                <span className="pom">
                  Do 6 zdjęć: JPEG, PNG lub WebP, każde do 5 MB. Pierwsze jest okładką.
                </span>
              </span>
            </div>
            <div className="fm-pasek">
              {initial && (
                <Link className="vbtn obrys" href="/panel/uslugi">
                  Anuluj
                </Link>
              )}
              <span className="sp" />
              <button
                className="vbtn glowny"
                type="submit"
                disabled={zablokowana || pending || wgrywanie}
              >
                {przycisk}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
      <aside className="fm-bok">
        <section className="fm-karta podglad" aria-label="Podgląd w katalogu">
          <h2>Podgląd w katalogu</h2>
          <div className="uk" style={{ marginTop: 6 }}>
            {zdjecia[0] ? (
              <div className="okl">
                <img
                  src={`/api/v1/files/${zdjecia[0]}/full`}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ) : (
              <Okladka rodzaj={rodzajRynek(branza)} seed={1} ikona={false} id="ok-podglad" />
            )}
            <div className="ul">
              <Aw
                name={autor.name}
                size={28}
                src={autor.avatarFileId ? `/api/v1/files/${autor.avatarFileId}/thumb` : null}
              />
              <b>{autor.name}</b>
              <Odznaka level={autor.level} />
            </div>
            <div className="utyt">{tytul.trim() || 'Tytuł Twojej usługi'}</div>
            <div className="ud">
              <Ocena srednia={autor.srednia} liczba={autor.liczbaOcen} />
              <span className="cena">
                od <b>{ceny.length ? zl(Math.min(...ceny)) : '— zł'}</b>
              </span>
            </div>
          </div>
        </section>
        {initial && (
          <section className="fm-karta">
            <h2>Status</h2>
            <dl className="rn-dl">
              <div>
                <dt>Teraz</dt>
                <dd>{STATUSY[initial.status][0]}</dd>
              </div>
            </dl>
            <p style={{ marginTop: 10 }}>
              Publikacja, wstrzymanie i archiwizacja są w „Moich usługach”.
            </p>
            <Link className="vbtn obrys" href="/panel/uslugi">
              Moje usługi
            </Link>
          </section>
        )}
        <section className="fm-karta">
          <h2>Skąd punkty</h2>
          <p>
            <b>Sama usługa punktów nie daje.</b> Punkty dostajesz od firmy, która oceni Cię po
            zrealizowanym zleceniu — do 100.
          </p>
        </section>
      </aside>
    </div>
  );
}
