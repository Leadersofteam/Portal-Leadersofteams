'use client';

import { useState } from 'react';

import type { AdminUserListItem } from '@lot/contracts';

import { ApiRequestError, apiFetch } from '@/lib/api';

const ROLE_LABEL: Record<AdminUserListItem['role'], string> = {
  USER: 'Użytkownik',
  MODERATOR: 'Moderator',
  ADMIN: 'Admin',
};

// Lista z API jest ucięta do 50 — obcięcie nie może być ciche (lekcja z App),
// więc przy pełnej pięćdziesiątce pokazujemy zachętę do zawężenia frazą.
const LIST_LIMIT = 50;

export function UsersManager({
  initialUsers,
  myId,
}: {
  initialUsers: AdminUserListItem[];
  myId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(query: string) {
    setError(null);
    try {
      const data = await apiFetch<{ users: AdminUserListItem[] }>(
        `/admin/users?search=${encodeURIComponent(query)}`,
      );
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Nie udało się pobrać listy.');
    }
  }

  async function setRole(user: AdminUserListItem, role: 'USER' | 'MODERATOR') {
    setError(null);
    setBusyId(user.id);
    try {
      await apiFetch(`/admin/users/${user.id}/role`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Nie udało się zmienić roli.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <form
        className="actions-row mt-3"
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch(search);
        }}
      >
        <input
          type="search"
          name="search"
          placeholder="E-mail, nazwa albo @uchwyt"
          aria-label="Szukaj użytkownika"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button className="btn secondary" type="submit">
          Szukaj
        </button>
      </form>

      {error && <div className="error-box">{error}</div>}

      {users.length === 0 ? (
        <p className="muted mt-3">Nikogo nie znaleziono. Zmień frazę i spróbuj ponownie.</p>
      ) : (
        <>
          {users.length >= LIST_LIMIT && (
            <p className="muted mt-3">
              Pokazuję pierwszych {LIST_LIMIT} kont — zawęź wyszukiwanie, żeby zobaczyć pozostałe.
            </p>
          )}
          {users.map((user) => {
            const isSelf = user.id === myId;
            const isAdmin = user.role === 'ADMIN';
            return (
              <div key={user.id} className="card mt-3">
                <h3>
                  {user.displayName}{' '}
                  <span className={user.role === 'MODERATOR' ? 'badge accent' : 'badge'}>
                    {ROLE_LABEL[user.role]}
                  </span>{' '}
                  {!user.emailVerifiedAt && (
                    <span className="badge warning">e-mail niepotwierdzony</span>
                  )}
                </h3>
                <p className="muted">
                  {user.email}
                  {user.handle ? <> · @{user.handle}</> : null} · konto od{' '}
                  {new Date(user.createdAt).toLocaleDateString('pl-PL')}
                </p>
                <div className="actions-row">
                  {isAdmin ? (
                    <span className="muted">Rolą ADMIN zarządza się poza aplikacją.</span>
                  ) : isSelf ? (
                    <span className="muted">To Twoje konto — własnej roli nie zmienisz.</span>
                  ) : user.role === 'MODERATOR' ? (
                    <button
                      className="btn secondary"
                      disabled={busyId === user.id}
                      onClick={() => void setRole(user, 'USER')}
                    >
                      {busyId === user.id ? 'Zapisuję…' : 'Odbierz moderatora'}
                    </button>
                  ) : (
                    <button
                      className="btn"
                      disabled={busyId === user.id}
                      onClick={() => void setRole(user, 'MODERATOR')}
                    >
                      {busyId === user.id ? 'Zapisuję…' : 'Mianuj moderatorem'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
