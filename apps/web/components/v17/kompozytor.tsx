'use client';

// Kompozytor strumienia V17 (makieta braki.js, stany „dane” i „pisanie”). Publikuje ten sam wpis portalowy
// co stary Composer (POST /social/posts): treść, zdjęcia, cytat. Na telefonie pisanie to pełny ekran otwierany
// przyciskiem FAB (okno modalne). Zlecenie, pytanie i usługa mają własne formularze (linki); „Realizacja” nie jest
// do napisania samemu: powstaje z oceny Firmy (zasada: status się zapracowuje).
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { FormEvent } from 'react';

import { fileVariantUrl } from '@lot/contracts';

import type { QuotedPostView } from '@/components/quoted-post';
import { ApiRequestError, apiFetch } from '@/lib/api';
import { useDialog } from '@/lib/use-dialog';
import { useImageUpload } from '@/lib/use-image-upload';

import { Cytat } from './cytat';
import { Ico } from './ico';
import { Aw } from './znaki';

const MAX = 600;
const PLACEHOLDER = 'Napisz, co dziś zrobiliście, albo zapytaj o radę…';

const TELEFON = '(max-width: 720px)';
function useTelefon() {
  return useSyncExternalStore(
    (zmiana) => {
      const m = window.matchMedia(TELEFON);
      m.addEventListener('change', zmiana);
      return () => m.removeEventListener('change', zmiana);
    },
    () => window.matchMedia(TELEFON).matches,
    () => false,
  );
}

export function Kompozytor({
  name,
  avatarSrc,
  cytat,
  powrot,
}: {
  name: string;
  avatarSrc: string | null;
  /** Wpis podawany dalej (`?cytuj=`), pobrany po stronie serwera — widać, CO się podaje. */
  cytat: QuotedPostView | null;
  /** Adres strumienia w bieżącym zakresie, bez filtra i cytatu — tam widać świeży wpis. */
  powrot: string;
}) {
  const router = useRouter();
  const telefon = useTelefon();
  const [open, setOpen] = useState(Boolean(cytat));
  const [body, setBody] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const upload = useImageUpload();
  const formRef = useRef<HTMLFormElement>(null);
  const poleRef = useRef<HTMLTextAreaElement>(null);

  const left = MAX - body.length;
  // Wpis może być pusty, jeśli niesie go zdjęcie albo cytat (jak w starym kompozytorze).
  const tresc = body.trim().length > 0 || upload.images.length > 0 || Boolean(cytat);
  const ok = tresc && left >= 0 && !pending && !upload.uploading;

  // „Podaj dalej” z wiersza strumienia zmienia tylko adres — kompozytor ma się sam otworzyć.
  useEffect(() => {
    if (!cytat?.id) return;
    setOpen(true);
    formRef.current?.scrollIntoView({ block: 'nearest' });
  }, [cytat?.id]);

  function zamknij() {
    setOpen(false);
    if (cytat) router.replace(powrot, { scroll: false });
  }
  // Kolejność ma znaczenie: okno zapamiętuje, co miało fokus, ZANIM przejmie go pole tekstowe.
  useDialog(formRef, open && telefon, zamknij);
  useEffect(() => {
    if (open) poleRef.current?.focus();
  }, [open]);

  function dodajZdjecie() {
    setOpen(true);
    upload.inputRef.current?.click();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ok) return;
    setPending(true);
    setErr(null);
    try {
      await apiFetch('/social/posts', {
        method: 'POST',
        body: JSON.stringify({
          body,
          ...(upload.images.length ? { imageFileIds: upload.images.map((i) => i.fileId) } : {}),
          ...(cytat ? { quotedPostId: cytat.id } : {}),
        }),
      });
      setBody('');
      upload.reset();
      setOpen(false);
      router.replace(powrot);
      router.refresh();
    } catch (x) {
      setErr(x instanceof ApiRequestError ? x.message : 'Nie udało się opublikować wpisu.');
    } finally {
      setPending(false);
    }
  }

  const opublikuj = (klasa: string) => (
    <button className={`vbtn glowny${klasa}`} type="submit" disabled={!ok}>
      {pending ? 'Publikowanie…' : 'Opublikuj'}
    </button>
  );
  const zdjecieEtykieta = upload.uploading
    ? 'Wgrywanie…'
    : upload.images.length
      ? `Zdjęcie · ${upload.images.length} z ${upload.max}`
      : 'Zdjęcie';
  const blad = err ?? upload.error;

  return (
    <>
      <form
        ref={formRef}
        className={`kompozytor${open ? ' pisze' : ''}`}
        onSubmit={onSubmit}
        {...(open && telefon
          ? { role: 'dialog', 'aria-modal': true, 'aria-label': 'Nowy wpis' }
          : {})}
        onKeyDown={(e) => {
          // Na komputerze Esc zwija tylko pusty kompozytor — nie gubimy napisanego tekstu.
          if (e.key === 'Escape' && !telefon && !body && !upload.images.length) zamknij();
        }}
      >
        <input
          ref={upload.inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="v17-zdjecia"
          onChange={upload.onPick}
          disabled={upload.full}
        />
        <Aw name={name} size={48} src={avatarSrc} />
        <div className="pole">
          {open ? (
            <>
              <div className="pisze-gora">
                <button type="button" className="ikonka" aria-label="Zamknij" onClick={zamknij}>
                  <Ico n="x" zwykla />
                </button>
                <b>Nowy wpis</b>
                {opublikuj('')}
              </div>
              <label className="sr" htmlFor="v17-wpis">
                Treść wpisu
              </label>
              <textarea
                id="v17-wpis"
                ref={poleRef}
                className="wpisz"
                data-fokus
                rows={3}
                maxLength={MAX}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={PLACEHOLDER}
              />
              {upload.images.length ? (
                <div className="miniatury">
                  {upload.images.map((img, i) => (
                    <span className="mini" key={img.fileId}>
                      <img src={fileVariantUrl(img.fileId, 'thumb')} alt={img.name} />
                      <button
                        type="button"
                        aria-label={`Usuń zdjęcie ${i + 1}`}
                        onClick={() => upload.remove(img.fileId)}
                      >
                        <Ico n="x" zwykla />
                      </button>
                    </span>
                  ))}
                  {upload.full ? null : (
                    <button
                      className="mini dodaj"
                      type="button"
                      aria-label="Dodaj zdjęcie"
                      disabled={upload.uploading}
                      onClick={dodajZdjecie}
                    >
                      <Ico n="plus" zwykla />
                    </button>
                  )}
                </div>
              ) : null}
              {cytat ? (
                <div className="bcyt-szkic">
                  <Cytat cytat={cytat} klikalny={false} />
                  <button
                    type="button"
                    className="ikonka"
                    aria-label="Usuń cytat"
                    onClick={() => router.replace(powrot, { scroll: false })}
                  >
                    <Ico n="x" zwykla />
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <button className="wpisz" type="button" onClick={() => setOpen(true)}>
              {PLACEHOLDER}
            </button>
          )}
          {blad ? (
            <p role="alert" className="blad">
              {blad}
            </p>
          ) : null}
          <div className="rodzaje">
            <button
              className="rodzaj"
              type="button"
              disabled={upload.full || upload.uploading}
              onClick={dodajZdjecie}
            >
              <Ico n="image" />
              {zdjecieEtykieta}
            </button>
            {open ? (
              <>
                <span className="licznik num">Zostało {left}</span>
                {opublikuj(' dol')}
              </>
            ) : (
              <>
                <Link className="rodzaj" href="/zlecenia/nowe">
                  <Ico n="clipboard-text" />
                  Zlecenie
                </Link>
                <Link className="rodzaj" href="/pytania">
                  <Ico n="chats-circle" />
                  Pytanie
                </Link>
                <Link
                  className="rodzaj"
                  href="/zlecenia"
                  title="Realizację zapisuje ocena Firmy po zleceniu"
                >
                  <Ico n="seal-check" />
                  Realizacja
                </Link>
                {opublikuj('')}
              </>
            )}
          </div>
          {open ? (
            <div className="inne">
              <span>Zamiast wpisu:</span>
              <Link className="rodzaj" href="/zlecenia/nowe">
                <Ico n="clipboard-text" />
                Zlecenie
              </Link>
              <Link className="rodzaj" href="/pytania">
                <Ico n="chats-circle" />
                Pytanie
              </Link>
              <Link className="rodzaj" href="/uslugi/nowa">
                <Ico n="storefront" />
                Usługa
              </Link>
            </div>
          ) : null}
        </div>
      </form>
      {/* FAB zostaje w drzewie także podczas pisania (zakrywa go okno): po Esc fokus ma dokąd wrócić. */}
      <button className="fab" type="button" aria-label="Napisz wpis" onClick={() => setOpen(true)}>
        <Ico n="plus" zwykla />
      </button>
    </>
  );
}
