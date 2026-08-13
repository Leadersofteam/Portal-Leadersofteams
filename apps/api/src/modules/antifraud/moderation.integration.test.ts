// Moderacja zgłoszeń end-to-end (S12) — PIERWSZE testy modułu antifraud.
//
// Do S12 moduł nie miał ani jednego testu, a `/panel/moderacja` pokazywał samą
// notatkę zgłaszającego. Ten plik pilnuje trzech rzeczy, których brak sprawiał,
// że moderacja istniała tylko na papierze:
//  1. sprawa niesie ZGŁOSZONĄ TREŚĆ (typ, id, fragment, autor),
//  2. „ukryj" naprawdę zdejmuje treść z obiegu, a nie tylko zamyka sprawę,
//  3. akcja punktowa na sprawie bez punktu jest ODRZUCANA, a nie po cichu
//     przepuszczana pod etykietą, która kłamie.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { loadConfig } from '../../shared/config';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
// Baza dev jest WSPÓŁDZIELONA między przebiegami i akumuluje resztki po
// przerwanych biegach. Wszystko w tym pliku jest zawężone do `run`, a afterAll
// sprząta — inaczej „pierwszy pasujący rekord" prędzej czy później trafi w cudzy.
const run = Date.now();

interface CaseView {
  id: string;
  source: string;
  subjectType: string | null;
  subjectId: string | null;
  note: string | null;
  pointEventId: string | null;
  subject: {
    exists: boolean;
    hidden: boolean;
    excerpt: string | null;
    authorDisplayName: string | null;
    canHide: boolean;
  } | null;
}

describe.skipIf(!hasInfra)('moderacja — zgłoszenie treści widoczne i wykonalne', () => {
  let ctx: AppContext;
  const emails = [
    `mod-autor-${run}@test.local`,
    `mod-zglaszajacy-${run}@test.local`,
    `mod-moderator-${run}@test.local`,
  ];
  let authorCookie = '';
  let reporterCookie = '';
  let moderatorCookie = '';
  const userIds: string[] = [];
  let postId = '';
  let caseId = '';

  async function register(email: string, displayName: string) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName },
    });
    expect(res.statusCode).toBe(201);
    const userId = (res.json() as { user: { id: string } }).user.id;
    userIds.push(userId);
    return { cookie: res.headers['set-cookie'] as string, userId };
  }

  async function openCases(): Promise<CaseView[]> {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/moderation/cases?status=OPEN',
      headers: { cookie: moderatorCookie },
    });
    expect(res.statusCode).toBe(200);
    return (res.json() as { cases: CaseView[] }).cases;
  }

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    const author = await register(emails[0]!, 'Autor Zgłoszonego');
    const reporter = await register(emails[1]!, 'Zgłaszający');
    const moderator = await register(emails[2]!, 'Moderator Testowy');
    authorCookie = author.cookie;
    reporterCookie = reporter.cookie;
    // Rola MODERATOR nadawana wprost w bazie — nie ma (i nie powinno być)
    // endpointu do samodzielnego awansu na moderatora.
    await ctx.prisma.user.update({
      where: { id: moderator.userId },
      data: { role: 'MODERATOR' },
    });
    // PUŁAPKA (potwierdzona przez ten test): rola jest ZAMROŻONA w migawce sesji
    // w Redisie, a nie czytana z bazy przy każdym żądaniu. Ciasteczko sprzed
    // nadania roli dalej niesie „USER" i dostaje 403. W praktyce znaczy to, że
    // osoba awansowana na moderatora MUSI się wylogować i zalogować ponownie —
    // inaczej zobaczy panel, którego „nie ma uprawnień" otworzyć.
    const login = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: emails[2]!, password: 'super-tajne-haslo-1' },
    });
    expect(login.statusCode).toBe(200);
    moderatorCookie = login.headers['set-cookie'] as string;
  }, 120_000);

  afterAll(async () => {
    if (!ctx) return;
    await ctx.prisma.moderationCase.deleteMany({
      where: { OR: [{ reportedByUserId: { in: userIds } }, { subjectUserId: { in: userIds } }] },
    });
    await ctx.prisma.activityItem.deleteMany({ where: { actorId: { in: userIds } } });
    await ctx.prisma.socialPost.deleteMany({ where: { authorUserId: { in: userIds } } });
    await ctx.prisma.user.deleteMany({ where: { email: { in: emails } } });
    await ctx.close();
  });

  it('zgłoszenie wpisu tworzy sprawę Z PODGLĄDEM treści, a nie samą notatką', async () => {
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/social/posts',
      headers: { cookie: authorCookie },
      payload: { body: `Treść warta zgłoszenia, przebieg ${run}.` },
    });
    expect(created.statusCode).toBe(201);
    postId = (created.json() as { id: string }).id;

    const reported = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { cookie: reporterCookie },
      payload: {
        subjectType: 'SOCIAL_POST',
        subjectId: postId,
        reason: `Zgłoszenie testowe ${run}`,
      },
    });
    expect(reported.statusCode).toBe(201);
    caseId = (reported.json() as { id: string }).id;

    const mine = (await openCases()).find((c) => c.id === caseId);
    expect(mine).toBeDefined();
    // Sedno S12: moderator dostaje typ, id ORAZ treść — wcześniej miał notatkę
    // i musiał zgadywać, czego zgłoszenie dotyczy.
    expect(mine!.subjectType).toBe('SOCIAL_POST');
    expect(mine!.subjectId).toBe(postId);
    expect(mine!.subject?.exists).toBe(true);
    expect(mine!.subject?.excerpt).toContain(String(run));
    expect(mine!.subject?.authorDisplayName).toBe('Autor Zgłoszonego');
    expect(mine!.subject?.canHide).toBe(true);
  });

  it('odmawia akcji punktowej na sprawie bez punktu (zamiast po cichu ją zamknąć)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/moderation/cases/${caseId}/resolve`,
      headers: { cookie: moderatorCookie },
      payload: { action: 'RELEASE', note: 'Próba zwolnienia nieistniejących punktów' },
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: { code: string } }).error.code).toBe('NO_POINT_EVENT');

    // Sprawa MUSI zostać otwarta — odrzucenie akcji nie może jej „przy okazji" zamknąć.
    expect((await openCases()).some((c) => c.id === caseId)).toBe(true);
  });

  it('„ukryj treść" zdejmuje wpis z permalinka i z feedu oraz zamyka sprawę', async () => {
    const before = await ctx.app.inject({ method: 'GET', url: `/api/v1/social/posts/${postId}` });
    expect(before.statusCode).toBe(200);

    const hidden = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/moderation/cases/${caseId}/resolve`,
      headers: { cookie: moderatorCookie },
      payload: { action: 'HIDE', note: `Ukryte w teście ${run}` },
    });
    expect(hidden.statusCode).toBe(200);

    // Treść realnie znika — sprawdzamy SKUTEK, nie tylko status sprawy.
    const after = await ctx.app.inject({ method: 'GET', url: `/api/v1/social/posts/${postId}` });
    expect(after.statusCode).toBe(404);

    // Feed jest projekcją: kafelek musi zniknąć razem z treścią, inaczej zostaje
    // link prowadzący w 404 (dokładnie ten błąd naprawialiśmy w S8 dla grup).
    const activity = await ctx.prisma.activityItem.count({
      where: { type: 'SOCIAL_POST_PUBLISHED', subjectId: postId },
    });
    expect(activity).toBe(0);

    expect((await openCases()).some((c) => c.id === caseId)).toBe(false);
  });

  it('nie pozwala ukryć zlecenia — to umowa dwóch stron, nie publiczna treść', async () => {
    const orderCase = await ctx.prisma.moderationCase.create({
      data: {
        source: 'REPORT',
        reportedByUserId: userIds[1]!,
        subjectType: 'ORDER',
        subjectId: `nieistniejace-zlecenie-${run}`,
        note: `Zgłoszenie zlecenia ${run}`,
      },
    });

    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/moderation/cases/${orderCase.id}/resolve`,
      headers: { cookie: moderatorCookie },
      payload: { action: 'HIDE', note: 'Próba ukrycia zlecenia' },
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: { code: string } }).error.code).toBe('CANNOT_HIDE');

    // Zamknięcie bez działania jest dla takiej sprawy właściwą drogą.
    const dismissed = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/moderation/cases/${orderCase.id}/resolve`,
      headers: { cookie: moderatorCookie },
      payload: { action: 'DISMISS', note: 'Kontakt ze stronami poza systemem' },
    });
    expect(dismissed.statusCode).toBe(200);
  });

  it('sprawa o treść, której już nie ma, nie wywraca panelu', async () => {
    const ghost = await ctx.prisma.moderationCase.create({
      data: {
        source: 'REPORT',
        reportedByUserId: userIds[1]!,
        subjectType: 'SOCIAL_POST',
        subjectId: `usuniety-wpis-${run}`,
        note: `Zgłoszenie duszka ${run}`,
      },
    });

    const mine = (await openCases()).find((c) => c.id === ghost.id);
    expect(mine).toBeDefined();
    // Wprost „nie istnieje", a nie null czy pusty obiekt: moderator patrzący na
    // pustą kartę nie wie, czy treść zniknęła, czy panel jest zepsuty.
    expect(mine!.subject?.exists).toBe(false);
    expect(mine!.subject?.canHide).toBe(false);

    await ctx.prisma.moderationCase.delete({ where: { id: ghost.id } });
  });

  it('zwykły użytkownik nie widzi spraw moderacyjnych', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/moderation/cases?status=OPEN',
      headers: { cookie: reporterCookie },
    });
    expect(res.statusCode).toBe(403);
  });
});
