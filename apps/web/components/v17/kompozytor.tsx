'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

import { Ico } from './ico';
import { Aw } from './znaki';

const MAX = 600;

// Kompozytor strumienia V17. Publikuje ten sam wpis portalowy co stary Composer (POST /social/posts),
// więc ścieżka użytkownika działa naprawdę. Zlecenie i pytanie mają własne formularze (linki);
// „Realizacja” nie jest do napisania samemu: powstaje z oceny Firmy (zasada: status się zapracowuje).
export function Kompozytor({ name, avatarSrc }: { name: string; avatarSrc: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const ok = body.trim().length > 0 && body.length <= MAX && !pending;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ok) return;
    setPending(true);
    setErr(null);
    try {
      await apiFetch('/social/posts', { method: 'POST', body: JSON.stringify({ body }) });
      setBody('');
      setOpen(false);
      router.refresh();
    } catch (x) {
      setErr(x instanceof ApiRequestError ? x.message : 'Nie udało się opublikować wpisu.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="kompozytor" onSubmit={onSubmit}>
      <Aw name={name} size={48} src={avatarSrc} />
      <div className="pole">
        {open ? (
          <>
            <label className="sr" htmlFor="v17-wpis">
              Treść wpisu
            </label>
            <textarea
              id="v17-wpis"
              className="wpisz"
              rows={3}
              maxLength={MAX}
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Opisz, czego potrzebujesz, albo zapytaj o radę…"
              style={{ resize: 'vertical', background: 'transparent', border: 0, outline: 0 }}
            />
          </>
        ) : (
          <button className="wpisz" type="button" onClick={() => setOpen(true)}>
            Opisz, czego potrzebujesz, albo zapytaj o radę…
          </button>
        )}
        {err ? (
          <p role="alert" style={{ margin: '8px 0 0', color: 'var(--danger)' }}>
            {err}
          </p>
        ) : null}
        <div className="rodzaje">
          <Link
            className="rodzaj"
            style={{ '--c': 'var(--t-zlecenie)' } as React.CSSProperties}
            href="/zlecenia/nowe"
          >
            <Ico n="clipboard-text" />
            Zlecenie
          </Link>
          <Link
            className="rodzaj"
            style={{ '--c': 'var(--t-pytanie)' } as React.CSSProperties}
            href="/pytania"
          >
            <Ico n="chats-circle" />
            Pytanie
          </Link>
          <Link
            className="rodzaj"
            style={{ '--c': 'var(--t-realizacja)' } as React.CSSProperties}
            href="/zlecenia"
            title="Realizację zapisuje ocena Firmy po zleceniu"
          >
            <Ico n="seal-check" />
            Realizacja
          </Link>
          <button className="vbtn glowny maly" type="submit" disabled={!ok}>
            {pending ? 'Publikowanie…' : 'Opublikuj'}
          </button>
        </div>
      </div>
    </form>
  );
}
