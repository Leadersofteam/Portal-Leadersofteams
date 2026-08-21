import type { ReviewInput } from '@lot/contracts';
import type { Prisma, Review } from '@prisma/client';

import type { PrismaClient } from '../../shared/db';
import {
  ConflictError,
  ForbiddenError,
  InvalidTransitionError,
  NotFoundError,
} from '../../shared/errors';
import { emitEvent } from '../../shared/outbox';
import type { IdentityService } from '../identity/index';
import { REVIEW_PUBLICATION_WINDOW_DAYS } from '../ladder/index';

export interface ReviewsServiceDeps {
  prisma: PrismaClient;
  identity: Pick<
    IdentityService,
    'isCompanyMember' | 'getCompanyMeta' | 'getPublicUsers' | 'getPublicCompanies'
  >;
}

export function createReviewsService({ prisma, identity }: ReviewsServiceDeps) {
  async function getAwardedLeaderUserId(orderId: string): Promise<string | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { awardedOffer: { select: { leaderProfile: { select: { userId: true } } } } },
    });
    return order?.awardedOffer?.leaderProfile.userId ?? null;
  }

  // Publikacja oceny = moment, w którym staje się widoczna i (dla oceny
  // Firma→Lider) generuje zdarzenie punktowe. Payload zawiera wszystko,
  // czego potrzebuje ladder — moduł ladder zależy WYŁĄCZNIE od zdarzeń.
  async function publishReviews(
    tx: Prisma.TransactionClient,
    reviews: Review[],
    leaderUserId: string | null,
    now: Date,
  ) {
    const companyMetaCache = new Map<string, { createdAt: Date }>();
    for (const review of reviews) {
      await tx.review.update({ where: { id: review.id }, data: { publishedAt: now } });
      const companyId = review.subjectCompanyId ?? '';
      const order = await tx.order.findUnique({
        where: { id: review.orderId },
        select: { companyId: true },
      });
      const orderCompanyId = order?.companyId ?? companyId;
      let companyMeta = companyMetaCache.get(orderCompanyId);
      if (!companyMeta) {
        const meta = await identity.getCompanyMeta(orderCompanyId);
        companyMeta = { createdAt: meta?.createdAt ?? now };
        companyMetaCache.set(orderCompanyId, companyMeta);
      }
      await emitEvent(tx, 'marketplace.review_published', {
        reviewId: review.id,
        orderId: review.orderId,
        direction: review.direction,
        rating: review.rating,
        authorUserId: review.authorUserId,
        leaderUserId,
        companyId: orderCompanyId,
        companyCreatedAt: companyMeta.createdAt.toISOString(),
        publishedAt: now.toISOString(),
      });
    }
  }

  return {
    // Rola wynika ze zlecenia: członek firmy ocenia Lidera, wybrany Lider
    // ocenia Firmę. Publikacja symultaniczna (anty-odwet): żadna strona nie
    // widzi oceny drugiej przed wystawieniem własnej.
    async submitReview(userId: string, orderId: string, input: ReviewInput, now = new Date()) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundError('Zlecenie nie istnieje');
      if (order.status !== 'CONFIRMED') {
        throw new InvalidTransitionError('Ocenić można tylko potwierdzone zlecenie');
      }
      const leaderUserId = await getAwardedLeaderUserId(orderId);
      const isCompanyMember = await identity.isCompanyMember(userId, order.companyId);
      const isAwardedLeader = userId === leaderUserId;
      if (!isCompanyMember && !isAwardedLeader) {
        throw new ForbiddenError('NOT_PARTICIPANT', 'Nie jesteś stroną tego zlecenia');
      }

      const direction = isCompanyMember ? 'COMPANY_TO_LEADER' : 'LEADER_TO_COMPANY';

      try {
        return await prisma.$transaction(async (tx) => {
          const review = await tx.review.create({
            data: {
              orderId,
              direction,
              authorUserId: userId,
              rating: input.rating,
              comment: input.comment ?? null,
              subjectLeaderUserId: direction === 'COMPANY_TO_LEADER' ? leaderUserId : null,
              subjectCompanyId: direction === 'LEADER_TO_COMPANY' ? order.companyId : null,
              createdAt: now,
            },
          });
          const counterpart = await tx.review.findUnique({
            where: {
              orderId_direction: {
                orderId,
                direction:
                  direction === 'COMPANY_TO_LEADER' ? 'LEADER_TO_COMPANY' : 'COMPANY_TO_LEADER',
              },
            },
          });
          if (counterpart && !counterpart.publishedAt) {
            await publishReviews(tx, [review, counterpart], leaderUserId, now);
            return { id: review.id, published: true };
          }
          return { id: review.id, published: false };
        });
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
          throw new ConflictError('REVIEW_EXISTS', 'Oceniłeś już to zlecenie');
        }
        throw err;
      }
    },

    async listReviews(orderId: string, viewerId: string | null) {
      const reviews = await prisma.review.findMany({
        where: { orderId },
        orderBy: { createdAt: 'asc' },
      });
      const published = reviews.filter((r) => r.publishedAt);
      const authors = await identity.getPublicUsers(published.map((r) => r.authorUserId));
      const myReview = viewerId ? (reviews.find((r) => r.authorUserId === viewerId) ?? null) : null;
      return {
        reviews: published.map((r) => ({
          id: r.id,
          direction: r.direction,
          rating: r.rating,
          comment: r.comment,
          publishedAt: r.publishedAt,
          authorName: authors.get(r.authorUserId)?.displayName ?? 'Użytkownik',
        })),
        myReview: myReview ? { id: myReview.id, published: Boolean(myReview.publishedAt) } : null,
      };
    },

    // Job okresowy (worker): jednostronne oceny publikują się po oknie —
    // brak reakcji drugiej strony nie blokuje ani oceny, ani punktów.
    async publishDueReviews(now = new Date()): Promise<number> {
      const dueBefore = new Date(now.getTime() - REVIEW_PUBLICATION_WINDOW_DAYS * 86_400_000);
      const due = await prisma.review.findMany({
        where: { publishedAt: null, createdAt: { lte: dueBefore } },
        take: 200,
      });
      for (const review of due) {
        const leaderUserId = await getAwardedLeaderUserId(review.orderId);
        await prisma.$transaction(async (tx) => {
          await publishReviews(tx, [review], leaderUserId, now);
        });
      }
      return due.length;
    },

    // Publiczna lista opinii o Liderze (dług D8): tylko opublikowane oceny
    // od Firm, z nazwą firmy i tytułem zlecenia — dowód, nie deklaracja.
    async listLeaderReviews(leaderUserId: string, limit = 20) {
      const rows = await prisma.review.findMany({
        where: {
          subjectLeaderUserId: leaderUserId,
          direction: 'COMPANY_TO_LEADER',
          publishedAt: { not: null },
        },
        include: { order: { select: { title: true, companyId: true } } },
        orderBy: { publishedAt: 'desc' },
        take: limit,
      });
      const companies = await identity.getPublicCompanies([
        ...new Set(rows.map((r) => r.order.companyId)),
      ]);
      const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const all = await prisma.review.groupBy({
        by: ['rating'],
        where: {
          subjectLeaderUserId: leaderUserId,
          direction: 'COMPANY_TO_LEADER',
          publishedAt: { not: null },
        },
        _count: { _all: true },
      });
      for (const r of all) breakdown[r.rating] = r._count._all;
      return {
        reviews: rows.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          publishedAt: r.publishedAt,
          orderTitle: r.order.title,
          companyName: companies.get(r.order.companyId)?.name ?? 'Firma',
        })),
        breakdown,
      };
    },

    async getLeaderReviewStats(leaderUserId: string) {
      const [agg, completedOrders] = await Promise.all([
        prisma.review.aggregate({
          where: {
            subjectLeaderUserId: leaderUserId,
            direction: 'COMPANY_TO_LEADER',
            publishedAt: { not: null },
          },
          _avg: { rating: true },
          _count: { _all: true },
        }),
        // Odbicie logiki policzonej dla Firmy (getCompanyPublicStats):
        // zrealizowane = CONFIRMED, a Lidera wskazuje wygrana oferta.
        // Zaplanowane jako S21 pkt 1, wchodzi w PD3 — „zrealizowane zlecenia"
        // to trzon śladu zaufania na karcie usługi i profilu Lidera.
        prisma.order.count({
          where: { status: 'CONFIRMED', awardedOffer: { leaderProfile: { userId: leaderUserId } } },
        }),
      ]);
      return {
        averageRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
        reviewCount: agg._count._all,
        completedOrders,
      };
    },

    // Wsadowa wersja statystyk ocen — do listingów (katalog Liderów), dwa
    // zapytania niezależnie od liczby Liderów (bez N+1).
    async getLeaderReviewStatsMany(
      leaderUserIds: string[],
    ): Promise<
      Map<string, { averageRating: number | null; reviewCount: number; completedOrders: number }>
    > {
      if (leaderUserIds.length === 0) return new Map();
      const [rows, confirmed] = await Promise.all([
        prisma.review.groupBy({
          by: ['subjectLeaderUserId'],
          where: {
            subjectLeaderUserId: { in: leaderUserIds },
            direction: 'COMPANY_TO_LEADER',
            publishedAt: { not: null },
          },
          _avg: { rating: true },
          _count: { _all: true },
        }),
        // groupBy nie przechodzi przez relacje — liczymy w JS po zwężonym
        // findMany (tylko CONFIRMED wskazanych Liderów, sam userId).
        prisma.order.findMany({
          where: {
            status: 'CONFIRMED',
            awardedOffer: { leaderProfile: { userId: { in: leaderUserIds } } },
          },
          select: { awardedOffer: { select: { leaderProfile: { select: { userId: true } } } } },
        }),
      ]);
      const completed = new Map<string, number>();
      for (const o of confirmed) {
        const uid = o.awardedOffer?.leaderProfile.userId;
        if (uid) completed.set(uid, (completed.get(uid) ?? 0) + 1);
      }
      const map = new Map<
        string,
        { averageRating: number | null; reviewCount: number; completedOrders: number }
      >();
      for (const id of leaderUserIds) {
        const r = rows.find((row) => row.subjectLeaderUserId === id);
        map.set(id, {
          averageRating: r?._avg.rating ? Math.round(r._avg.rating * 10) / 10 : null,
          reviewCount: r?._count._all ?? 0,
          completedOrders: completed.get(id) ?? 0,
        });
      }
      return map;
    },

    /**
     * Publiczny obraz Firmy: co zrobiła na rynku i jak jest oceniana.
     *
     * Pokazujemy OBIE strony — oceny otrzymane od Liderów i wystawione Liderom.
     * Dwustronność jest tu celowa i wynika z briefu: Lider decydujący, czy złożyć
     * ofertę, powinien widzieć nie tylko „ile gwiazdek ma Firma", ale też jak sama
     * ocenia współpracowników. Jednostronna karta zachęcałaby do wybielania.
     */
    async getCompanyPublicStats(companyId: string) {
      const [received, given, ordersTotal, ordersCompleted] = await Promise.all([
        prisma.review.aggregate({
          where: {
            subjectCompanyId: companyId,
            direction: 'LEADER_TO_COMPANY',
            publishedAt: { not: null },
          },
          _avg: { rating: true },
          _count: { _all: true },
        }),
        prisma.review.aggregate({
          where: {
            order: { companyId },
            direction: 'COMPANY_TO_LEADER',
            publishedAt: { not: null },
          },
          _avg: { rating: true },
          _count: { _all: true },
        }),
        prisma.order.count({ where: { companyId, publishedAt: { not: null } } }),
        // CONFIRMED, nie „COMPLETED" — w tym cyklu życia to Firma potwierdza
        // odbiór i dopiero wtedy zlecenie jest zrealizowane (patrz OrderStatus).
        prisma.order.count({ where: { companyId, status: 'CONFIRMED' } }),
      ]);
      return {
        received: {
          averageRating: received._avg.rating ? Math.round(received._avg.rating * 10) / 10 : null,
          reviewCount: received._count._all,
        },
        given: {
          averageRating: given._avg.rating ? Math.round(given._avg.rating * 10) / 10 : null,
          reviewCount: given._count._all,
        },
        ordersPublished: ordersTotal,
        ordersCompleted,
      };
    },

    /** Ostatnie OPUBLIKOWANE oceny Firmy — treść, nie tylko liczba gwiazdek. */
    async getCompanyReviews(companyId: string, limit = 10) {
      const rows = await prisma.review.findMany({
        where: {
          subjectCompanyId: companyId,
          direction: 'LEADER_TO_COMPANY',
          publishedAt: { not: null },
        },
        orderBy: [{ publishedAt: 'desc' }],
        take: limit,
        select: {
          id: true,
          rating: true,
          comment: true,
          publishedAt: true,
          authorUserId: true,
          order: { select: { id: true, title: true } },
        },
      });
      return rows;
    },
  };
}

export type ReviewsService = ReturnType<typeof createReviewsService>;
