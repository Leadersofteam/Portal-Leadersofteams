'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

interface PackageDraft {
  tier: 'BASIC' | 'STANDARD' | 'PREMIUM';
  name: string;
  priceDeclared: string;
  scope: string;
  deliveryDays: string;
}

const EMPTY_PACKAGE = (tier: PackageDraft['tier']): PackageDraft => ({
  tier,
  name: '',
  priceDeclared: '',
  scope: '',
  deliveryDays: '',
});

const TIER_LABELS: Record<string, string> = {
  BASIC: 'Podstawowy',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
};

async function uploadListingImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('kind', 'LISTING');
  form.append('file', file);
  const res = await apiFetch<{ file: { id: string } }>('/files', { method: 'POST', body: form });
  return res.file.id;
}

export function NewListingForm({ industries }: { industries: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [packages, setPackages] = useState<PackageDraft[]>([EMPTY_PACKAGE('BASIC')]);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  function setPackage(index: number, patch: Partial<PackageDraft>) {
    setPackages((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function addPackage() {
    const used = new Set(packages.map((p) => p.tier));
    const next = (['BASIC', 'STANDARD', 'PREMIUM'] as const).find((t) => !used.has(t));
    if (next) setPackages((prev) => [...prev, EMPTY_PACKAGE(next)]);
  }

  async function onImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files).slice(0, 6 - imageIds.length)) {
        const id = await uploadListingImage(file);
        setImageIds((prev) => [...prev, id]);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Nie udało się wgrać zdjęcia.');
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const tags = String(form.get('tags') ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length >= 2)
      .slice(0, 5);
    try {
      const created = await apiFetch<{ id: string; slug: string }>('/listings', {
        method: 'POST',
        body: JSON.stringify({
          industryId: form.get('industryId'),
          title: form.get('title'),
          description: form.get('description'),
          tags,
          packages: packages.map((p) => ({
            tier: p.tier,
            name: p.name,
            priceDeclared: Number(p.priceDeclared),
            scope: p.scope,
            deliveryDays: Number(p.deliveryDays),
          })),
          imageFileIds: imageIds,
        }),
      });
      await apiFetch(`/listings/${created.id}/publish`, { method: 'POST' });
      router.push(`/uslugi/${created.slug}`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ maxWidth: '46rem' }}>
      {error && <div className="error-box">{error}</div>}

      <div className="field">
        <label htmlFor="l-title">Tytuł usługi (min. 10 znaków)</label>
        <input
          id="l-title"
          name="title"
          required
          minLength={10}
          maxLength={120}
          placeholder="np. Zbuduję i wdrożę automatyzację lejka sprzedaży"
        />
      </div>
      <div className="field">
        <label htmlFor="l-industry">Branża</label>
        <select id="l-industry" name="industryId" required defaultValue="">
          <option value="" disabled>
            Wybierz branżę
          </option>
          {industries.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="l-desc">Opis (min. 50 znaków — co dokładnie dostarczysz?)</label>
        <textarea id="l-desc" name="description" required minLength={50} maxLength={10000} />
      </div>
      <div className="field">
        <label htmlFor="l-tags">Tagi (po przecinku, max 5)</label>
        <input id="l-tags" name="tags" placeholder="np. automatyzacja, CRM, sprzedaż" />
      </div>

      <h3 className="mt-3">Pakiety (1–3)</h3>
      {packages.map((pkg, index) => (
        <div key={pkg.tier} className="card mt-2">
          <strong>{TIER_LABELS[pkg.tier]}</strong>
          <div className="field mt-1">
            <label>Nazwa pakietu</label>
            <input
              required
              minLength={2}
              maxLength={80}
              value={pkg.name}
              onChange={(e) => setPackage(index, { name: e.target.value })}
              placeholder="np. Audyt / Wdrożenie / Wdrożenie + opieka"
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: 1, minWidth: '8rem' }}>
              <label>Cena (zł, deklaracja)</label>
              <input
                required
                type="number"
                min={1}
                max={1000000}
                value={pkg.priceDeclared}
                onChange={(e) => setPackage(index, { priceDeclared: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1, minWidth: '8rem' }}>
              <label>Termin (dni)</label>
              <input
                required
                type="number"
                min={1}
                max={365}
                value={pkg.deliveryDays}
                onChange={(e) => setPackage(index, { deliveryDays: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label>Zakres (min. 10 znaków)</label>
            <textarea
              required
              minLength={10}
              maxLength={2000}
              value={pkg.scope}
              onChange={(e) => setPackage(index, { scope: e.target.value })}
            />
          </div>
          {packages.length > 1 && (
            <button
              type="button"
              className="btn secondary"
              onClick={() => setPackages((prev) => prev.filter((_, i) => i !== index))}
            >
              Usuń pakiet
            </button>
          )}
        </div>
      ))}
      {packages.length < 3 && (
        <p className="mt-1">
          <button type="button" className="btn secondary" onClick={addPackage}>
            Dodaj pakiet
          </button>
        </p>
      )}

      <h3 className="mt-3">Zdjęcia (max 6)</h3>
      {imageIds.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {imageIds.map((id) => (
            <span key={id} style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={`/api/v1/files/${id}/thumb`}
                alt=""
                style={{ width: '5.5rem', height: '5.5rem', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
              />
              <button
                type="button"
                aria-label="Usuń zdjęcie"
                className="fav-star"
                style={{ position: 'absolute', top: '-0.4rem', right: '-0.4rem', color: 'var(--danger)' }}
                onClick={() => setImageIds((prev) => prev.filter((x) => x !== id))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {imageIds.length < 6 && (
        <div className="field">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={uploading}
            onChange={(e) => void onImages(e.target.files)}
          />
          {uploading && <p className="muted">Wgrywanie…</p>}
        </div>
      )}

      <button className="btn mt-2" type="submit" disabled={pending || uploading}>
        {pending ? 'Publikowanie…' : 'Opublikuj usługę'}
      </button>
    </form>
  );
}
