'use client';

import { fileVariantUrl } from '@lot/contracts';

import type { useImageUpload } from '@/lib/use-image-upload';

/**
 * Wybór i podgląd obrazów w formularzu — część wizualna `useImageUpload`.
 * Wspólna dla kompozytora wpisu i formularza posta w grupie, żeby oba miejsca
 * zachowywały się identycznie (limit, usuwanie, stan „wgrywanie…").
 */
export function ImagePicker({
  id,
  upload,
}: {
  /** Unikalne id — na jednej stronie mogą stać dwa formularze naraz. */
  id: string;
  upload: ReturnType<typeof useImageUpload>;
}) {
  return (
    <>
      {upload.images.length > 0 && (
        <ul className="composer-images">
          {upload.images.map((img) => (
            <li key={img.fileId}>
              <img src={fileVariantUrl(img.fileId, 'thumb')} alt={img.name} />
              <button
                type="button"
                className="composer-image-remove"
                aria-label={`Usuń obraz ${img.name}`}
                onClick={() => upload.remove(img.fileId)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={upload.inputRef}
        id={id}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={upload.onPick}
        disabled={upload.full || upload.uploading}
      />
      <label
        htmlFor={id}
        className={upload.full || upload.uploading ? 'btn secondary disabled' : 'btn secondary'}
      >
        {upload.uploading
          ? 'Wgrywanie…'
          : upload.images.length > 0
            ? `Obrazy (${upload.images.length}/${upload.max})`
            : 'Dodaj obraz'}
      </label>
    </>
  );
}
