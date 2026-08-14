'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ImagePicker } from '@/components/image-picker';
import { ApiRequestError, apiFetch } from '@/lib/api';
import { useImageUpload } from '@/lib/use-image-upload';

const MAX = 600;

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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Wspólny hook z formularzem posta w grupie — jedna implementacja limitu,
  // resetu pola i komunikatów, żeby oba miejsca zachowywały się identycznie.
  const upload = useImageUpload();

  const left = MAX - body.length;
  // Wpis może być pusty, JEŚLI niesie go obraz albo cytat — udostępnienie
  // czyjegoś wpisu bez komentarza to normalny gest, nie błąd.
  const hasContent = body.trim().length > 0 || upload.images.length > 0 || Boolean(quotedPostId);
  const canSubmit = hasContent && left >= 0 && !pending && !upload.uploading;

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
          ...(upload.images.length > 0 ? { imageFileIds: upload.images.map((i) => i.fileId) } : {}),
          ...(quotedPostId ? { quotedPostId } : {}),
        }),
      });
      setBody('');
      upload.reset();
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
      {(error || upload.error) && <div className="error-box">{error ?? upload.error}</div>}

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

      <div className="composer-foot">
        <ImagePicker id="composer-images" upload={upload} />
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
