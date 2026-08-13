'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import { SOCIAL_POST_MAX_IMAGES, fileVariantUrl } from '@lot/contracts';

import { ApiRequestError, apiFetch } from '@/lib/api';

const MAX = 600;

interface Draft {
  fileId: string;
  name: string;
}

/**
 * Kompozytor wpisu portalowego.
 *
 * Świadomie bez optimistic UI: feed jest chronologiczny i ma być prawdziwy —
 * wpis pojawia się dopiero, gdy naprawdę istnieje. Licznik znaków ostrzega
 * dopiero na ostatniej setce, żeby nie popędzać piszącego od pierwszej litery.
 *
 * Obrazy wgrywamy OD RAZU po wybraniu, a nie przy publikacji: dzięki temu
 * czekanie na upload dzieje się w tle, gdy człowiek jeszcze pisze, a błąd
 * (za duży plik, zły format) pokazuje się przy wyborze, a nie po napisaniu
 * całego wpisu — utrata tekstu na ostatnim kroku to najgorszy możliwy moment.
 */
export function Composer({
  quotedPostId,
  quotedLabel,
}: {
  quotedPostId?: string;
  quotedLabel?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [images, setImages] = useState<Draft[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const left = MAX - body.length;
  // Wpis może być pusty, JEŚLI niesie go obraz albo cytat — udostępnienie
  // czyjegoś wpisu bez komentarza to normalny gest, nie błąd.
  const hasContent = body.trim().length > 0 || images.length > 0 || Boolean(quotedPostId);
  const canSubmit = hasContent && left >= 0 && !pending && !uploading;

  async function onPickFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const room = SOCIAL_POST_MAX_IMAGES - images.length;
      for (const file of picked.slice(0, room)) {
        const form = new FormData();
        form.append('kind', 'SOCIAL');
        form.append('file', file);
        // Bez ręcznego content-type: przeglądarka MUSI sama ustawić granicę
        // multipart, inaczej upload po cichu się psuje (sprawdzona pułapka).
        const res = await apiFetch<{ file: { id: string } }>('/files', {
          method: 'POST',
          body: form,
        });
        setImages((current) => [...current, { fileId: res.file.id, name: file.name }]);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Nie udało się wgrać obrazu.');
    } finally {
      setUploading(false);
      // Reset pola: bez tego wybranie TEGO SAMEGO pliku drugi raz nie wywoła
      // zdarzenia change i wyglądałoby na zawieszenie.
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setPending(true);
    try {
      await apiFetch('/social/posts', {
        method: 'POST',
        body: JSON.stringify({
          body,
          ...(images.length > 0 ? { imageFileIds: images.map((i) => i.fileId) } : {}),
          ...(quotedPostId ? { quotedPostId } : {}),
        }),
      });
      setBody('');
      setImages([]);
      // Zdejmujemy ?cytuj= z adresu, żeby odświeżenie strony nie wskrzesiło
      // cytatu, który właśnie został opublikowany.
      if (quotedPostId) router.replace('/feed');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Nie udało się opublikować wpisu.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="composer" onSubmit={onSubmit} id="composer">
      {error && <div className="error-box">{error}</div>}

      {quotedPostId && (
        <div className="composer-quote">
          <span>Podajesz dalej{quotedLabel ? `: „${quotedLabel}”` : ' wybrany wpis'}</span>
          <button type="button" className="btn secondary" onClick={() => router.replace('/feed')}>
            Anuluj cytat
          </button>
        </div>
      )}

      <label className="sr-only" htmlFor="composer-body">
        Treść wpisu
      </label>
      <textarea
        id="composer-body"
        name="body"
        rows={3}
        maxLength={MAX}
        placeholder={
          quotedPostId
            ? 'Dodaj własny komentarz (możesz zostawić puste)'
            : 'Co dziś zbudowałeś, czego się nauczyłeś, w czym możesz pomóc?'
        }
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      {images.length > 0 && (
        <ul className="composer-images">
          {images.map((img) => (
            <li key={img.fileId}>
              <img src={fileVariantUrl(img.fileId, 'thumb')} alt={img.name} />
              <button
                type="button"
                className="composer-image-remove"
                aria-label={`Usuń obraz ${img.name}`}
                onClick={() => setImages((c) => c.filter((i) => i.fileId !== img.fileId))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="composer-foot">
        <input
          ref={fileInput}
          id="composer-images"
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={onPickFiles}
          disabled={images.length >= SOCIAL_POST_MAX_IMAGES || uploading}
        />
        <label
          htmlFor="composer-images"
          className={
            images.length >= SOCIAL_POST_MAX_IMAGES || uploading
              ? 'btn secondary disabled'
              : 'btn secondary'
          }
        >
          {uploading
            ? 'Wgrywanie…'
            : images.length > 0
              ? `Obrazy (${images.length}/${SOCIAL_POST_MAX_IMAGES})`
              : 'Dodaj obraz'}
        </label>
        <span className={left <= 100 ? 'composer-count low' : 'composer-count'}>
          {left <= 100 ? `${left} znaków` : 'do 600 znaków'}
        </span>
        <button className="btn" type="submit" disabled={!canSubmit}>
          {pending ? 'Publikowanie…' : 'Opublikuj'}
        </button>
      </div>
    </form>
  );
}
