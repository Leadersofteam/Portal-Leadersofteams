'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import { SOCIAL_POST_MAX_IMAGES } from '@lot/contracts';

import { ApiRequestError, apiFetch } from './api';

export interface UploadedDraft {
  fileId: string;
  name: string;
}

/**
 * Wgrywanie obrazów do treści — wspólne dla kompozytora wpisu portalowego
 * i formularza posta w grupie.
 *
 * Wydzielone przy S17, gdy ta sama logika była potrzebna w drugim miejscu.
 * Kopiowanie jej rozjechałoby się przy pierwszej zmianie (np. limitu), a jest
 * tu kilka rzeczy, o które łatwo się potknąć — patrz komentarze niżej.
 */
export function useImageUpload(max = SOCIAL_POST_MAX_IMAGES) {
  const [images, setImages] = useState<UploadedDraft[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      // Liczymy miejsce PRZED pętlą, ale `images` w domknięciu jest z chwili
      // renderu — dlatego dokładamy przez funkcję aktualizującą, a nie przez
      // podmianę całej tablicy.
      const room = max - images.length;
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
      // zdarzenia change i wyglądałoby na zawieszenie aplikacji.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return {
    images,
    uploading,
    error,
    inputRef,
    onPick,
    remove: (fileId: string) => setImages((c) => c.filter((i) => i.fileId !== fileId)),
    reset: () => setImages([]),
    full: images.length >= max,
    max,
  };
}
