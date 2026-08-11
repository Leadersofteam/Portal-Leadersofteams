'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

interface Industry {
  id: string;
  name: string;
}

interface ProfileData {
  id: string;
  industryId: string;
  headline: string;
  bio: string | null;
  isVisible: boolean;
  portfolioItems: Array<{ id: string; title: string; url: string | null }>;
}

export function ProfileForm({
  industries,
  profile,
}: {
  industries: Industry[];
  profile: ProfileData | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      industryId: form.get('industryId'),
      headline: form.get('headline'),
      bio: form.get('bio') || undefined,
      isVisible: form.get('isVisible') === 'on',
    };
    try {
      await apiFetch('/me/leader-profile', {
        method: profile ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  async function addPortfolio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setError(null);
    try {
      await apiFetch('/me/leader-profile/portfolio', {
        method: 'POST',
        body: JSON.stringify({
          title: form.get('title'),
          ...(form.get('url') ? { url: form.get('url') } : {}),
          ...(form.get('description') ? { description: form.get('description') } : {}),
        }),
      });
      formEl.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
    }
  }

  async function removePortfolio(itemId: string) {
    await apiFetch(`/me/leader-profile/portfolio/${itemId}`, { method: 'DELETE' }).catch(() => {});
    router.refresh();
  }

  return (
    <div>
      {error && <div className="error-box">{error}</div>}
      <div className="card" style={{ maxWidth: '42rem' }}>
        <h2>{profile ? 'Twój profil Lidera' : 'Utwórz profil Lidera'}</h2>
        <p className="muted">
          Profil pozwala składać oferty na zlecenia. Tytuł „Lider" i poziomy zdobywa się pracą — w
          Drabince Lidera.
        </p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="industryId">Branża / kompetencja</label>
            <select
              id="industryId"
              name="industryId"
              required
              defaultValue={profile?.industryId ?? ''}
            >
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
            <label htmlFor="headline">Nagłówek (kim jesteś, min. 5 znaków)</label>
            <input
              id="headline"
              name="headline"
              required
              minLength={5}
              maxLength={120}
              defaultValue={profile?.headline ?? ''}
            />
          </div>
          <div className="field">
            <label htmlFor="bio">O Tobie (opcjonalnie)</label>
            <textarea id="bio" name="bio" maxLength={5000} defaultValue={profile?.bio ?? ''} />
          </div>
          <div className="field">
            <label>
              <input type="checkbox" name="isVisible" defaultChecked={profile?.isVisible ?? true} />{' '}
              Profil widoczny publicznie
            </label>
          </div>
          <button className="btn" type="submit" disabled={pending}>
            {pending ? 'Zapisywanie…' : profile ? 'Zapisz zmiany' : 'Utwórz profil'}
          </button>
        </form>
      </div>

      {profile && (
        <div className="card" style={{ maxWidth: '42rem', marginTop: '1.5rem' }}>
          <h2>Portfolio</h2>
          {profile.portfolioItems.length === 0 && (
            <p className="muted">Dodaj zrealizowane projekty — firmy widzą je na Twoim profilu.</p>
          )}
          {profile.portfolioItems.map((item) => (
            <div key={item.id} className="list-row">
              <div>
                <strong>{item.title}</strong>
                {item.url && (
                  <span className="meta">
                    {' '}
                    · <a href={item.url}>{item.url}</a>
                  </span>
                )}
              </div>
              <button className="btn secondary" onClick={() => void removePortfolio(item.id)}>
                Usuń
              </button>
            </div>
          ))}
          <form onSubmit={addPortfolio} style={{ marginTop: '1rem' }}>
            <div className="field">
              <label htmlFor="pf-title">Tytuł projektu</label>
              <input id="pf-title" name="title" required minLength={2} maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor="pf-url">Link (opcjonalnie)</label>
              <input id="pf-url" name="url" type="url" maxLength={500} />
            </div>
            <div className="field">
              <label htmlFor="pf-desc">Opis (opcjonalnie)</label>
              <textarea id="pf-desc" name="description" maxLength={1000} />
            </div>
            <button className="btn secondary" type="submit">
              Dodaj pozycję
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
