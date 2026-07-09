// Testy integracyjne modułu community (Q&A/mentoring) na realnym MySQL/Redis:
// pełny przepływ pytanie→odpowiedź→akceptacja/upvote po HTTP, naliczanie DRUGIEJ
// ścieżki punktowej w ladder (community.* → ladder), kwalifikacja głosu, limit
// tygodniowy, malejące zwroty, awans OBIEMA ścieżkami (gate ≥20% od L4) oraz
// antyfraud community (wzajemna adoracja + limit dobowy).
import type { LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAntifraudService } from '../antifraud/index';
import type { AntifraudService } from '../antifraud/index';
import {
  createLadderService,
  ladderSubscriptions,
  LADDER_ALLOWED_EVENT_PREFIXES,
} from '../ladder/index';
import type { AnswerAcceptedPayload, AnswerUpvotedPayload, LadderService } from '../ladder/index';
import { loadConfig } from '../../shared/config';
import { buildServer } from '../../server';
import type { AppContext } from '../../server';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();
const DAY = 86_400_000;

describe.skipIf(!hasInfra)('Community — Q&A/mentoring jako druga ścieżka punktowa', () => {
  let ctx: AppContext;
  let ladder: LadderService;
  let antifraud: AntifraudService;
  let groupId = '';

  // synthetyczni „zarabiający" dla testów izolowanych (ledger nie ma FK do users)
  const synth = {
    capEarner: `synth-cap-${run}`,
    dimEarner: `synth-dim-${run}`,
    rateEarner: `synth-rate-${run}`,
    bothPaths: `synth-both-${run}`,
  };

  const emails = {
    asker: `qa-asker-${run}@example.com`,
    answerer: `qa-answerer-${run}@example.com`,
    freshVoter: `qa-fresh-${run}@example.com`,
    qualVoter: `qa-qual-${run}@example.com`,
    userA: `qa-a-${run}@example.com`,
    userB: `qa-b-${run}@example.com`,
  };
  const ids: Record<string, string> = {};
  const cookies: Record<string, string> = {};

  async function register(key: keyof typeof emails, displayName: string) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: emails[key], password: 'super-tajne-haslo-1', displayName },
    });
    const raw = res.headers['set-cookie'];
    cookies[key] = String(Array.isArray(raw) ? raw[0] : raw).split(';')[0] ?? '';
    ids[key] = res.json().user.id as string;
  }

  function post(
    cookie: string,
    url: string,
    payload?: Record<string, unknown>,
  ): Promise<LightMyRequestResponse> {
    return ctx.app.inject({ method: 'POST', url, headers: { cookie }, payload });
  }

  async function acceptedPayloadFor(answerId: string): Promise<AnswerAcceptedPayload> {
    const event = await ctx.prisma.outboxEvent.findFirst({
      where: {
        type: 'community.answer_accepted',
        payload: { path: '$.answerId', equals: answerId },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(event).not.toBeNull();
    return event!.payload as unknown as AnswerAcceptedPayload;
  }

  async function upvotedPayloadFor(
    answerId: string,
    voterUserId: string,
  ): Promise<AnswerUpvotedPayload> {
    const event = await ctx.prisma.outboxEvent.findFirst({
      where: {
        type: 'community.answer_upvoted',
        payload: { path: '$.answerId', equals: answerId },
        AND: { payload: { path: '$.voterUserId', equals: voterUserId } },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(event).not.toBeNull();
    return event!.payload as unknown as AnswerUpvotedPayload;
  }

  // Zakłada pytanie i odpowiedź, zwraca { threadId, answerId } (przez HTTP).
  async function askAndAnswer(askerKey: string, answererKey: string) {
    const thread = await post(cookies[askerKey]!, `/api/v1/groups/${groupId}/threads`, {
      title: `Pytanie ${askerKey}->${answererKey} ${run}-${Math.random().toString(36).slice(2, 7)}`,
      body: 'Jak rozwiązać ten problem zespołowy? Proszę o wskazówki od bardziej doświadczonych.',
    });
    expect(thread.statusCode).toBe(201);
    const threadId = thread.json().id as string;
    const answer = await post(cookies[answererKey]!, `/api/v1/threads/${threadId}/answers`, {
      body: 'Proponuję podejść do tego tak: krok po kroku, z jasnym podziałem odpowiedzialności.',
    });
    expect(answer.statusCode).toBe(201);
    return { threadId, answerId: answer.json().id as string };
  }

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    ladder = createLadderService(ctx.prisma);
    antifraud = createAntifraudService({
      prisma: ctx.prisma,
      ladder,
      // Detektory community nie dotykają marketplace — stub wystarcza.
      marketplace: { hasReciprocalRelationship: async () => false },
    });

    for (const [key, name] of [
      ['asker', 'Autor Pytania'],
      ['answerer', 'Mentor Odpowiadający'],
      ['freshVoter', 'Świeży Wyborca'],
      ['qualVoter', 'Kwalifikowany Wyborca'],
      ['userA', 'Użytkownik A'],
      ['userB', 'Użytkownik B'],
    ] as const) {
      await register(key, name);
    }

    // Grupa zakładana bezpośrednio (bramka poziomu grup nie jest przedmiotem
    // tego testu) + aktywne członkostwo wszystkich uczestników.
    const group = await ctx.prisma.group.create({
      data: {
        name: `Grupa Q&A ${run}`,
        type: 'OPEN',
        memberships: {
          create: (['asker', 'answerer', 'freshVoter', 'qualVoter', 'userA', 'userB'] as const).map(
            (k) => ({ userId: ids[k]!, role: 'MEMBER' as const, status: 'ACTIVE' as const }),
          ),
        },
      },
    });
    groupId = group.id;
  }, 120_000);

  afterAll(async () => {
    if (!ctx) return;
    const userIds = [...Object.values(ids), ...Object.values(synth)];
    // Kolejność FK-bezpieczna: głosy → odpowiedzi → wątki → grupa; potem ledger.
    await ctx.prisma.answerVote.deleteMany({ where: { answer: { thread: { groupId } } } });
    await ctx.prisma.answer.deleteMany({ where: { thread: { groupId } } });
    await ctx.prisma.thread.deleteMany({ where: { groupId } });
    await ctx.prisma.groupMembership.deleteMany({ where: { groupId } });
    await ctx.prisma.group.deleteMany({ where: { id: groupId } });
    await ctx.prisma.moderationCase.deleteMany({ where: { subjectUserId: { in: userIds } } });
    await ctx.prisma.fraudSignal.deleteMany({ where: { userId: { in: userIds } } });
    await ctx.prisma.pointEvent.deleteMany({ where: { userId: { in: userIds } } });
    await ctx.prisma.ladderState.deleteMany({ where: { userId: { in: userIds } } });
    await ctx.prisma.levelAchievement.deleteMany({ where: { userId: { in: userIds } } });
    await ctx.prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
    await ctx.close();
  });

  it('granica anty-MLM: ladder subskrybuje community.* (i tylko dozwolone prefiksy)', () => {
    const types = Object.keys(ladderSubscriptions({} as LadderService));
    expect(types).toContain('community.answer_accepted');
    expect(types).toContain('community.answer_upvoted');
    for (const type of types) {
      expect(LADDER_ALLOWED_EVENT_PREFIXES.some((p) => type.startsWith(p))).toBe(true);
    }
  });

  it('akceptacja odpowiedzi → ANSWER_ACCEPTED 50 pkt PENDING; idempotentnie', async () => {
    const { answerId } = await askAndAnswer('asker', 'answerer');
    const accept = await post(cookies.asker!, `/api/v1/answers/${answerId}/accept`);
    expect(accept.statusCode).toBe(200);
    expect(accept.json().alreadyAccepted).toBe(false);

    const payload = await acceptedPayloadFor(answerId);
    const event = await ladder.handleAnswerAccepted(payload);
    expect(event?.type).toBe('ANSWER_ACCEPTED');
    expect(event?.points).toBe(50);
    expect(event?.status).toBe('PENDING');

    // Redelivery zdarzenia = no-op (unikat type+sourceId+userId w ledgerze).
    expect(await ladder.handleAnswerAccepted(payload)).toBeNull();
    const count = await ctx.prisma.pointEvent.count({
      where: { userId: ids.answerer, type: 'ANSWER_ACCEPTED' },
    });
    expect(count).toBe(1);
    // PENDING nie liczy się do poziomu (okno karencji).
    expect(await ladder.getLevel(ids.answerer!)).toBe(0);
  });

  it('nie można zaakceptować/zagłosować własnej odpowiedzi', async () => {
    const { threadId } = await askAndAnswer('asker', 'answerer');
    // odpowiedź autora pytania na własne pytanie
    const ownAnswer = await post(cookies.asker!, `/api/v1/threads/${threadId}/answers`, {
      body: 'Sam sobie odpowiadam — tego nie wolno punktować ani akceptować jako swojej.',
    });
    const ownAnswerId = ownAnswer.json().id as string;
    expect((await post(cookies.asker!, `/api/v1/answers/${ownAnswerId}/accept`)).statusCode).toBe(
      400,
    );
    expect((await post(cookies.answerer!, `/api/v1/answers/${ownAnswerId}/vote`)).statusCode).toBe(
      200,
    ); // answerer może głosować na cudzą (asker) odpowiedź
    // autor odpowiedzi nie może głosować na SWOJĄ
    const { answerId } = await askAndAnswer('asker', 'answerer');
    expect((await post(cookies.answerer!, `/api/v1/answers/${answerId}/vote`)).statusCode).toBe(
      400,
    );
  });

  it('upvote niekwalifikowany (świeże konto, 0 aktywności) → brak punktów', async () => {
    const { answerId } = await askAndAnswer('asker', 'answerer');
    const vote = await post(cookies.freshVoter!, `/api/v1/answers/${answerId}/vote`);
    expect(vote.statusCode).toBe(200);
    const payload = await upvotedPayloadFor(answerId, ids.freshVoter!);
    expect(payload.voterActivityCount).toBe(0);
    // Niekwalifikowany → ŻADNEGO wpisu w ledgerze.
    expect(await ladder.handleAnswerUpvoted(payload)).toBeNull();
    const count = await ctx.prisma.pointEvent.count({
      where: { userId: ids.answerer, type: 'ANSWER_UPVOTED_QUALIFIED' },
    });
    expect(count).toBe(0);
  });

  it('upvote kwalifikowany (konto ≥14 dni + własna aktywność) → 10 pkt', async () => {
    // Wyborca dojrzewa (30 dni) i ma własną aktywność (odpowiedź w wątku).
    await ctx.prisma.user.update({
      where: { id: ids.qualVoter! },
      data: { createdAt: new Date(Date.now() - 30 * DAY) },
    });
    const { threadId, answerId } = await askAndAnswer('asker', 'answerer');
    expect(
      (
        await post(cookies.qualVoter!, `/api/v1/threads/${threadId}/answers`, {
          body: 'Dorzucam własną perspektywę do tego wątku — to moja aktywność w Q&A.',
        })
      ).statusCode,
    ).toBe(201);

    const vote = await post(cookies.qualVoter!, `/api/v1/answers/${answerId}/vote`);
    expect(vote.statusCode).toBe(200);
    const payload = await upvotedPayloadFor(answerId, ids.qualVoter!);
    expect(payload.voterActivityCount).toBeGreaterThanOrEqual(1);

    const event = await ladder.handleAnswerUpvoted(payload);
    expect(event?.type).toBe('ANSWER_UPVOTED_QUALIFIED');
    expect(event?.points).toBe(10);
    expect(event?.status).toBe('PENDING');
  });

  it('malejące zwroty: drugie uznanie od tej samej osoby → waga 0.5 (25 pkt)', async () => {
    const recognizer = `synth-rec-${run}`;
    const base = (answerId: string): AnswerAcceptedPayload => ({
      answerId,
      answerAuthorUserId: synth.dimEarner,
      questionAuthorUserId: recognizer,
      groupId,
    });
    const first = await ladder.handleAnswerAccepted(base(`ans-dim-1-${run}`));
    expect(first?.points).toBe(50);
    expect(first?.weightApplied).toBe(1);
    const second = await ladder.handleAnswerAccepted(base(`ans-dim-2-${run}`));
    expect(second?.points).toBe(25);
    expect(second?.weightApplied).toBe(0.5);
    expect((second?.meta as { repeatCount: number }).repeatCount).toBe(1);
  });

  it('limit tygodniowy community: po osiągnięciu 300 pkt nadmiar = wpis 0 pkt (capApplied)', async () => {
    // 6 uznań od RÓŻNYCH osób (brak malejących zwrotów) → 6×50 = 300.
    for (let i = 0; i < 6; i++) {
      const ev = await ladder.handleAnswerAccepted({
        answerId: `ans-cap-${i}-${run}`,
        answerAuthorUserId: synth.capEarner,
        questionAuthorUserId: `synth-cap-rec-${i}-${run}`,
        groupId,
      });
      expect(ev?.points).toBe(50);
    }
    // 7. uznanie: limit wyczerpany → 0 pkt, wpis istnieje z wyjaśnieniem.
    const overflow = await ladder.handleAnswerAccepted({
      answerId: `ans-cap-6-${run}`,
      answerAuthorUserId: synth.capEarner,
      questionAuthorUserId: `synth-cap-rec-6-${run}`,
      groupId,
    });
    expect(overflow?.points).toBe(0);
    expect((overflow?.meta as { capApplied: boolean }).capApplied).toBe(true);
  });

  it('awans OBIEMA ścieżkami: gate ≥20% od L4 — community jest wymagane', async () => {
    // Czysta funkcja: 1400 marketplace + 100 community (total 1500) NIE daje L4,
    // bo ścieżka community < 20% progu (300). Dołożenie community odblokowuje L4.
    const { computeLevel } = await import('../ladder/rules');
    expect(computeLevel(1400, 100)).toBe(3);
    expect(computeLevel(1100, 400)).toBe(4);

    // Na realnych danych: zasiane punkty obu ścieżek dojrzewają → getLevel = 4.
    const seed = (
      type: 'ORDER_COMPLETED_RATED' | 'ANSWER_ACCEPTED',
      sourceId: string,
      points: number,
    ) =>
      ctx.prisma.pointEvent.create({
        data: {
          userId: synth.bothPaths,
          type,
          points,
          weightApplied: 1,
          meta: { seed: true },
          sourceType: 'Seed',
          sourceId,
          status: 'PENDING',
          rulesetVersion: 'v1',
          createdAt: new Date(Date.now() - 8 * DAY),
        },
      });
    await seed('ORDER_COMPLETED_RATED', `seed-mp-${run}`, 1100);
    await seed('ANSWER_ACCEPTED', `seed-cm-${run}`, 400);
    await ladder.maturePendingPoints(new Date());
    expect(await ladder.getLevel(synth.bothPaths)).toBe(4);
    const state = await ctx.prisma.ladderState.findUnique({ where: { userId: synth.bothPaths } });
    expect(state?.marketplacePoints).toBe(1100);
    expect(state?.communityPoints).toBe(400);
  });

  it('antyfraud: wzajemna adoracja A↔B → RECIPROCITY_QA + HOLD', async () => {
    // A uznaje B, potem B uznaje A — druga strona pętli wpada w HOLD.
    const first = await ladder.handleAnswerAccepted({
      answerId: `ans-recip-ab-${run}`,
      answerAuthorUserId: ids.userB!,
      questionAuthorUserId: ids.userA!,
      groupId,
    });
    expect(first).not.toBeNull();
    const second = await ladder.handleAnswerAccepted({
      answerId: `ans-recip-ba-${run}`,
      answerAuthorUserId: ids.userA!,
      questionAuthorUserId: ids.userB!,
      groupId,
    });
    expect(second).not.toBeNull();

    const moderationCase = await antifraud.evaluatePendingPoint({
      pointEventId: second!.id,
      userId: ids.userA!,
      counterpartyId: ids.userB!,
      kind: 'community',
    });
    expect(moderationCase).not.toBeNull();
    const held = await ctx.prisma.pointEvent.findUnique({ where: { id: second!.id } });
    expect(held?.status).toBe('HOLD');
    const signal = await ctx.prisma.fraudSignal.findFirst({
      where: { userId: ids.userA!, type: 'RECIPROCITY_QA' },
    });
    expect(signal).not.toBeNull();
  });

  it('antyfraud: przekroczenie dobowego limitu Q&A → RATE_LIMIT_QA + HOLD', async () => {
    // 6 punktowanych zdarzeń w 24h dla jednego zarabiającego (różni uznający).
    let lastId = '';
    let lastRecognizer = '';
    for (let i = 0; i < 6; i++) {
      lastRecognizer = `synth-rate-rec-${i}-${run}`;
      const ev = await ladder.handleAnswerAccepted({
        answerId: `ans-rate-${i}-${run}`,
        answerAuthorUserId: synth.rateEarner,
        questionAuthorUserId: lastRecognizer,
        groupId,
      });
      lastId = ev!.id;
    }
    const moderationCase = await antifraud.evaluatePendingPoint({
      pointEventId: lastId,
      userId: synth.rateEarner,
      counterpartyId: lastRecognizer,
      kind: 'community',
    });
    expect(moderationCase).not.toBeNull();
    const held = await ctx.prisma.pointEvent.findUnique({ where: { id: lastId } });
    expect(held?.status).toBe('HOLD');
  });

  it('getThread po HTTP pokazuje zaakceptowaną odpowiedź i liczbę głosów', async () => {
    const { threadId, answerId } = await askAndAnswer('asker', 'answerer');
    await post(cookies.asker!, `/api/v1/answers/${answerId}/accept`);
    await post(cookies.qualVoter!, `/api/v1/answers/${answerId}/vote`);

    const res = await ctx.app.inject({ method: 'GET', url: `/api/v1/threads/${threadId}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().thread.status).toBe('ANSWERED');
    const accepted = res.json().answers.find((a: { id: string }) => a.id === answerId);
    expect(accepted.isAccepted).toBe(true);
    expect(accepted.votesCount).toBe(1);

    // Zdarzenie answer_created trafia też do notifications (fan-out powiadomień).
    const created = await ctx.prisma.outboxEvent.findFirst({
      where: {
        type: 'community.answer_created',
        payload: { path: '$.answerId', equals: answerId },
      },
    });
    expect(created).not.toBeNull();
  });
});
