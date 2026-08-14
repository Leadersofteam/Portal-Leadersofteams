'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { ImagePicker } from '@/components/image-picker';
import { ApiRequestError, apiFetch } from '@/lib/api';
import { useImageUpload } from '@/lib/use-image-upload';

function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setPending(true);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  return { run, error, pending };
}

export function JoinLeaveButton({
  groupId,
  membershipStatus,
}: {
  groupId: string;
  membershipStatus: 'ACTIVE' | 'PENDING' | 'BANNED' | null;
}) {
  const { run, error, pending } = useAction();

  if (membershipStatus === 'ACTIVE') {
    return (
      <span>
        <button
          className="btn secondary"
          disabled={pending}
          onClick={() => void run(() => apiFetch(`/groups/${groupId}/leave`, { method: 'POST' }))}
        >
          {pending ? '…' : 'Opuść grupę'}
        </button>
        {error && <span className="error-box">{error}</span>}
      </span>
    );
  }
  if (membershipStatus === 'PENDING') {
    return <span className="badge">Prośba oczekuje na akceptację</span>;
  }
  return (
    <span>
      <button
        className="btn"
        disabled={pending}
        onClick={() => void run(() => apiFetch(`/groups/${groupId}/join`, { method: 'POST' }))}
      >
        {pending ? '…' : 'Dołącz do grupy'}
      </button>
      {error && <span className="error-box">{error}</span>}
    </span>
  );
}

export function PostForm({ groupId }: { groupId: string }) {
  const { run, error, pending } = useAction();
  const upload = useImageUpload();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const el = event.currentTarget;
    void run(async () => {
      await apiFetch(`/groups/${groupId}/posts`, {
        method: 'POST',
        body: JSON.stringify({
          type: form.get('type'),
          title: form.get('title'),
          body: form.get('body'),
          ...(upload.images.length > 0 ? { imageFileIds: upload.images.map((i) => i.fileId) } : {}),
        }),
      });
      el.reset();
      upload.reset();
    });
  }

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <h3>Opublikuj w grupie</h3>
      {error && <div className="error-box">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="type">Typ</label>
          <select id="type" name="type" defaultValue="DISCUSSION">
            <option value="DISCUSSION">Dyskusja</option>
            <option value="CASE_STUDY">Case study</option>
            <option value="IDEA">Pomysł</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="title">Tytuł</label>
          <input id="title" name="title" required minLength={5} maxLength={140} />
        </div>
        <div className="field">
          <label htmlFor="body">Treść</label>
          <textarea id="body" name="body" required minLength={10} maxLength={20000} />
          <p className="muted field-hint">
            Użyj <code>#tematu</code>, żeby dyskusja trafiła na stronę tematu, i{' '}
            <code>@uchwytu</code>, żeby kogoś powiadomić.
          </p>
        </div>
        {upload.error && <div className="error-box">{upload.error}</div>}
        <div className="actions-row">
          <ImagePicker id="group-post-images" upload={upload} />
          <button className="btn" type="submit" disabled={pending || upload.uploading}>
            {pending ? 'Publikowanie…' : 'Opublikuj'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ReactButton({
  postId,
  reacted,
  count,
}: {
  postId: string;
  reacted: boolean;
  count: number;
}) {
  const { run, pending } = useAction();
  return (
    <button
      className={reacted ? 'btn' : 'btn secondary'}
      disabled={pending}
      onClick={() =>
        void run(() => apiFetch(`/posts/${postId}/react`, { method: reacted ? 'DELETE' : 'POST' }))
      }
    >
      👏 Doceniam ({count})
    </button>
  );
}

// --- pierwsza linia moderacji: akcje moderatora GRUPY (S17) ------------------
// Rola w grupie to co innego niż rola platformowa — te przyciski widzi
// moderator grupy, a nie moderator Portalu.

export function PinButton({ postId, pinned }: { postId: string; pinned: boolean }) {
  const { run, error, pending } = useAction();
  return (
    <span>
      <button
        className="btn secondary"
        disabled={pending}
        onClick={() =>
          void run(() => apiFetch(`/posts/${postId}/pin`, { method: pinned ? 'DELETE' : 'POST' }))
        }
      >
        {pending ? '…' : pinned ? 'Odepnij' : 'Przypnij w grupie'}
      </button>
      {error && <span className="error-box">{error}</span>}
    </span>
  );
}

export function HidePostButton({ postId }: { postId: string }) {
  const { run, error, pending } = useAction();
  return (
    <span>
      <button
        className="btn secondary"
        disabled={pending}
        onClick={() => {
          // Ukrycie cudzej treści jest odwracalne tylko przez bazę, więc pytamy
          // wprost. Świadomie natywny confirm: to akcja rzadka i moderatorska,
          // własny modal byłby kosztem bez zysku.
          if (!confirm('Ukryć ten post w grupie? Zniknie z listy i z osi aktywności.')) return;
          void run(() => apiFetch(`/posts/${postId}/hide`, { method: 'POST' }));
        }}
      >
        {pending ? '…' : 'Ukryj post'}
      </button>
      {error && <span className="error-box">{error}</span>}
    </span>
  );
}

export function MemberRoleActions({
  membershipId,
  role,
  status,
  isSelf,
}: {
  membershipId: string;
  role: 'MEMBER' | 'MODERATOR';
  status: 'ACTIVE' | 'PENDING' | 'BANNED';
  isSelf: boolean;
}) {
  const { run, error, pending } = useAction();

  if (status === 'BANNED') return <span className="badge">Wyproszony(a)</span>;

  return (
    <span className="actions-row">
      <button
        className="btn secondary"
        disabled={pending}
        onClick={() =>
          void run(() =>
            apiFetch(`/memberships/${membershipId}/role`, {
              method: 'POST',
              body: JSON.stringify({ role: role === 'MODERATOR' ? 'MEMBER' : 'MODERATOR' }),
            }),
          )
        }
      >
        {pending ? '…' : role === 'MODERATOR' ? 'Odbierz moderację' : 'Zrób moderatorem'}
      </button>
      {!isSelf && role === 'MEMBER' && (
        <button
          className="btn secondary"
          disabled={pending}
          onClick={() => {
            if (!confirm('Wyprosić tę osobę z grupy? Nie będzie mogła dołączyć ponownie.')) return;
            void run(() => apiFetch(`/memberships/${membershipId}/ban`, { method: 'POST' }));
          }}
        >
          Wyproś
        </button>
      )}
      {error && <span className="error-box">{error}</span>}
    </span>
  );
}

export function ApproveButton({ membershipId }: { membershipId: string }) {
  const { run, error, pending } = useAction();
  return (
    <span>
      <button
        className="btn secondary"
        disabled={pending}
        onClick={() =>
          void run(() => apiFetch(`/memberships/${membershipId}/approve`, { method: 'POST' }))
        }
      >
        {pending ? '…' : 'Akceptuj'}
      </button>
      {error && <span className="error-box">{error}</span>}
    </span>
  );
}
