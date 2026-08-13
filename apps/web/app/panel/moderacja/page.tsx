import Link from 'next/link';
import { redirect } from 'next/navigation';

import { moderationSubjectHref, subjectLabel, type ModerationCase } from '@/lib/moderation';
import { serverApi } from '@/lib/server-api';

import { ResolveButtons } from './resolve-buttons';

export const metadata = { title: 'Moderacja — Leaders of Teams' };

export default async function ModerationPage() {
  const me = await serverApi<{ user: { role: string } | null }>('/auth/me');
  if (!me?.user) redirect('/logowanie');
  if (!['MODERATOR', 'ADMIN'].includes(me.user.role)) redirect('/panel');

  const data = await serverApi<{ cases: ModerationCase[] }>('/moderation/cases?status=OPEN');
  const cases = data?.cases ?? [];

  return (
    <main>
      <div className="breadcrumbs">
        <Link href="/panel">← Panel</Link>
      </div>
      <h1>Moderacja — otwarte sprawy</h1>
      <p className="muted">
        Dwa rodzaje spraw. <strong>Zgłoszenia</strong> od użytkowników dotyczą treści — możesz ją
        otworzyć i ukryć. <strong>Sygnały antyfraudowe</strong> wstrzymują punkty w karencji do
        decyzji człowieka (ADR-004) — „Zwolnij" przywraca je do karencji, „Odrzuć" cofa trwale.
      </p>

      {cases.length === 0 ? (
        <p className="muted">Brak otwartych spraw. 🎉</p>
      ) : (
        cases.map((moderationCase) => {
          const subject = moderationCase.subject;
          const href = moderationSubjectHref(
            moderationCase.subjectType,
            moderationCase.subjectId,
            subject?.context,
          );
          const isReport = moderationCase.source === 'REPORT';

          return (
            <div key={moderationCase.id} className="card" style={{ marginBottom: '1rem' }}>
              <h3>
                <span className="badge accent">{isReport ? 'Zgłoszenie' : 'Sygnał'}</span>{' '}
                <span className="badge">{subjectLabel(moderationCase.subjectType)}</span>{' '}
                {new Date(moderationCase.createdAt).toLocaleString('pl-PL')}
              </h3>

              {isReport && (
                <p>
                  <strong>Powód zgłoszenia:</strong> {moderationCase.note || '—'}
                </p>
              )}

              {/* Zgłoszona treść — to jest cały sens tego widoku. Do S12 stała
                  tu sama notatka i moderator nie miał jak dotrzeć do treści. */}
              {subject && (
                <div className="card" style={{ marginTop: '0.75rem' }}>
                  {!subject.exists ? (
                    <p className="muted">
                      Zgłoszonej treści już nie ma — została usunięta przez autora albo w ramach
                      usunięcia konta. Sprawę można zamknąć bez działania.
                    </p>
                  ) : (
                    <>
                      {subject.title && <h4 style={{ margin: '0 0 0.4rem' }}>{subject.title}</h4>}
                      {subject.excerpt && <p className="pre-wrap">{subject.excerpt}</p>}
                      <p className="muted">
                        Autor: {subject.authorDisplayName ?? subject.authorUserId ?? '—'}
                        {subject.hidden && ' · treść jest już ukryta'}
                      </p>
                      {href && (
                        <p>
                          <Link className="btn secondary" href={href} target="_blank">
                            Otwórz zgłoszoną treść ↗
                          </Link>
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {!isReport && (
                <p className="muted">
                  {moderationCase.note} · Użytkownik: {moderationCase.subjectUserId ?? '—'} · Wpis
                  punktowy: {moderationCase.pointEventId ?? '—'}
                </p>
              )}

              <ResolveButtons
                caseId={moderationCase.id}
                // Zestaw akcji zależy od tego, czym sprawa JEST. Pokazywanie
                // „Zwolnij punkty" przy zgłoszeniu treści (tak było do S12)
                // podpowiadało akcję, która nie robiła z treścią nic.
                hasPointEvent={Boolean(moderationCase.pointEventId)}
                canHide={Boolean(subject?.canHide)}
              />
            </div>
          );
        })
      )}
    </main>
  );
}
