// STRAŻNIK ANTY-MLM warstwy społecznościowej (ADR-004, brief §6).
//
// Test jest strukturalny, nie kosmetyczny: przechodzi PEŁNĄ ścieżkę społeczną
// (wpis → komentarz → docenienie → wzmianka → obserwowanie), zbiera WSZYSTKIE
// zdarzenia, jakie ta ścieżka wypuściła do outboxa, i sprawdza, że żadne z nich
// nie jest kluczem w subskrypcjach ladder. Dzięki temu złamanie granicy przez
// dodanie nowego zdarzenia w przyszłości wywali się TUTAJ, a nie w produkcji.
//
// Kluczowe zabezpieczenie: asercja `types.length > 0`. Bez niej test przechodziłby
// także wtedy, gdyby ścieżka nie wygenerowała żadnego zdarzenia — czyli zieleniłby
// się z niewłaściwego powodu.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { loadConfig } from '../../shared/config';
import { ladderSubscriptions } from '../ladder/events';
import type { LadderService } from '../ladder/index';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

describe.skipIf(!hasInfra)('anty-MLM: aktywność społeczna nie daje ani jednego punktu', () => {
  let ctx: AppContext;
  const emails = [`antimlm-a-${run}@test.local`, `antimlm-b-${run}@test.local`];
  let aCookie = '';
  let bCookie = '';
  let aId = '';
  let bId = '';
  let bHandle = '';
  let startedAt: Date;

  async function register(email: string, displayName: string) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName },
    });
    expect(res.statusCode).toBe(201);
    return {
      cookie: res.headers['set-cookie'] as string,
      userId: (res.json() as { user: { id: string } }).user.id,
    };
  }

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    const a = await register(emails[0]!, 'Antymlm Aleksandra');
    const b = await register(emails[1]!, 'Antymlm Bartosz');
    aCookie = a.cookie;
    bCookie = b.cookie;
    aId = a.userId;
    bId = b.userId;
    startedAt = new Date();
  }, 120_000);

  afterAll(async () => {
    if (!ctx) return;
    await ctx.prisma.socialReaction.deleteMany({ where: { userId: { in: [aId, bId] } } });
    await ctx.prisma.socialComment.deleteMany({ where: { authorUserId: { in: [aId, bId] } } });
    await ctx.prisma.socialPost.deleteMany({ where: { authorUserId: { in: [aId, bId] } } });
    await ctx.prisma.topic.deleteMany({ where: { slug: { startsWith: 'antymlm' } } });
    await ctx.prisma.activityItem.deleteMany({ where: { actorId: { in: [aId, bId] } } });
    await ctx.prisma.user.deleteMany({ where: { email: { in: emails } } });
    await ctx.close();
  });

  it('pełna ścieżka społeczna nie tworzy PointEvent ani stanu Drabinki', async () => {
    // A obserwuje B (to nadaje B handle — potrzebny do wzmianki).
    const follow = await ctx.app.inject({
      method: 'PUT',
      url: `/api/v1/users/${bId}/follow`,
      headers: { cookie: aCookie },
    });
    expect(follow.statusCode).toBe(200);
    bHandle = (await ctx.prisma.user.findUnique({ where: { id: bId } }))?.handle ?? '';
    expect(bHandle).toBeTruthy();

    // B publikuje wpis.
    const post = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/social/posts',
      headers: { cookie: bCookie },
      payload: { body: 'Domykam właśnie wdrożenie panelu — wnioski w komentarzu.' },
    });
    expect(post.statusCode).toBe(201);
    const postId = (post.json() as { id: string }).id;

    // A komentuje ze wzmianką, docenia i dopisuje odpowiedź w wątku.
    const comment = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/social/posts/${postId}/comments`,
      headers: { cookie: aCookie },
      payload: { body: `Świetna robota @${bHandle} — jak rozwiązałeś kwestię migracji?` },
    });
    expect(comment.statusCode).toBe(201);

    const appreciate = await ctx.app.inject({
      method: 'PUT',
      url: `/api/v1/social/posts/${postId}/appreciate`,
      headers: { cookie: aCookie },
    });
    expect(appreciate.statusCode).toBe(200);

    // A PODAJE DALEJ wpis B z własnym komentarzem. Ten krok MUSI tu być: bez
    // niego zdarzenie `social.post_quoted` nigdy nie trafiłoby do zebranej listy
    // i test strzegłby ścieżki sprzed dodania cytowania, zieleniąc się przez
    // pominięcie nowej funkcji zamiast przez jej sprawdzenie.
    const quote = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/social/posts',
      headers: { cookie: aCookie },
      payload: {
        body: 'Warto przeczytać — dokładnie ten problem mieliśmy u siebie.',
        quotedPostId: postId,
      },
    });
    expect(quote.statusCode).toBe(201);

    // Wpis z #TEMATEM. Ten krok dołożony w S17 z tego samego powodu co krok
    // z cytowaniem: tematy to nowa powierzchnia społeczna, a test strzeże
    // WYŁĄCZNIE tego, przez co realnie przeszedł. Bez tego kroku zieleniłby się
    // przez pominięcie nowej funkcji.
    const tagged = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/social/posts',
      headers: { cookie: bCookie },
      payload: { body: `Podsumowanie tygodnia #antymlm${run} — wnioski w komentarzu.` },
    });
    expect(tagged.statusCode).toBe(201);

    // Zbierz WSZYSTKIE zdarzenia wypuszczone przez tę ścieżkę.
    const events = await ctx.prisma.outboxEvent.findMany({
      where: { createdAt: { gte: startedAt } },
      select: { type: true },
    });
    const types = [...new Set(events.map((e) => e.type))];
    expect(
      types.length,
      'ścieżka społeczna nie wypuściła ŻADNEGO zdarzenia — test zieleniłby się z niewłaściwego powodu',
    ).toBeGreaterThan(0);

    // Kontrola pokrycia: skoro ścieżka zawiera cytowanie, jego zdarzenie MUSI
    // być na liście. Gdyby kiedyś zniknęło, chcemy czerwonego testu tutaj,
    // a nie cichego zawężenia tego, czego pilnujemy.
    expect(types).toContain('social.post_quoted');

    // Żadne z nich nie może być konsumowane przez ladder.
    const ladderTypes = Object.keys(ladderSubscriptions({} as LadderService));
    for (const type of types) {
      expect(ladderTypes, `ladder subskrybuje "${type}" — to złamanie ADR-004`).not.toContain(type);
    }

    // I twardy dowód po stronie danych: zero punktów, zero stanu Drabinki.
    expect(await ctx.prisma.pointEvent.count({ where: { userId: { in: [aId, bId] } } })).toBe(0);
    const states = await ctx.prisma.ladderState.findMany({ where: { userId: { in: [aId, bId] } } });
    for (const state of states) {
      expect(state.totalPoints).toBe(0);
    }
  });
});
