import type { Prisma } from '@prisma/client';

import type { PrismaClient } from '../../shared/db';
import type { MailService } from '../../shared/mail';
import type { IdentityService } from '../identity/index';

// Sygnał realtime (ADR-007 dec. 3): worker po zapisie powiadomienia budzi socket
// użytkownika przez Redis pub/sub. Best-effort — utrata sygnału nieszkodliwa,
// bo badge dociągany jest zawsze REST-em. W testach domyślny no-op.
export type NotificationSignal = (userId: string) => Promise<void> | void;

export interface NotificationsServiceDeps {
  prisma: PrismaClient;
  identity: Pick<IdentityService, 'getCompanyMemberUserIds'>;
  signal?: NotificationSignal;
}

interface NotificationEntry {
  userId: string;
  type: string;
  dedupeKey: string;
  payload: Prisma.InputJsonValue;
}

// Payloady zdarzeń (kontrakt z modułami-emiterami).
interface OfferSubmittedPayload {
  offerId: string;
  orderId: string;
  leaderUserId: string;
  companyId: string;
}
interface OfferAcceptedPayload {
  offerId: string;
  orderId: string;
  leaderUserId: string;
}
interface OrderConfirmedPayload {
  orderId: string;
  companyId: string;
  leaderUserId: string | null;
}
interface ReviewPublishedPayload {
  reviewId: string;
  orderId: string;
  direction: 'COMPANY_TO_LEADER' | 'LEADER_TO_COMPANY';
  leaderUserId: string | null;
  companyId: string;
}
interface LevelAchievedPayload {
  achievementId: string;
  userId: string;
  level: number;
}
interface CommentAddedPayload {
  commentId: string;
  postId: string;
  groupId: string;
  postAuthorUserId: string;
  actorUserId: string;
}
interface MembershipRequestedPayload {
  groupId: string;
  requesterUserId: string;
  moderatorUserIds: string[];
}
interface MembershipAcceptedPayload {
  groupId: string;
  requesterUserId: string;
}
interface AnswerCreatedPayload {
  answerId: string;
  threadId: string;
  threadAuthorUserId: string;
  answerAuthorUserId: string;
  groupId: string;
}
interface AnswerAcceptedPayload {
  answerId: string;
  threadId: string;
  answerAuthorUserId: string;
  questionAuthorUserId: string;
  groupId: string;
}

export function createNotificationsService({ prisma, identity, signal }: NotificationsServiceDeps) {
  // Idempotentna dostawa (at-least-once): unikat (userId, dedupeKey) + skipDuplicates.
  // Redelivery tego samego zdarzenia nie tworzy drugiego powiadomienia.
  async function deliver(entries: NotificationEntry[]) {
    const unique = new Map<string, NotificationEntry>();
    for (const e of entries) unique.set(`${e.userId}|${e.dedupeKey}`, e);
    const list = [...unique.values()];
    if (list.length === 0) return 0;
    const result = await prisma.notification.createMany({ data: list, skipDuplicates: true });
    if (signal) {
      const recipients = [...new Set(list.map((e) => e.userId))];
      await Promise.all(
        recipients.map(async (u) => {
          try {
            await signal(u);
          } catch {
            /* best-effort — badge i tak dociągany REST-em */
          }
        }),
      );
    }
    return result.count;
  }

  return {
    // --- konsumenci zdarzeń (idempotentni) ----------------------------------
    async onOfferSubmitted(p: OfferSubmittedPayload) {
      const recipients = await identity.getCompanyMemberUserIds(p.companyId);
      return deliver(
        recipients.map((userId) => ({
          userId,
          type: 'offer_submitted',
          dedupeKey: `offer_submitted:${p.offerId}`,
          payload: { orderId: p.orderId, offerId: p.offerId },
        })),
      );
    },

    async onOfferAccepted(p: OfferAcceptedPayload) {
      return deliver([
        {
          userId: p.leaderUserId,
          type: 'offer_accepted',
          dedupeKey: `offer_accepted:${p.offerId}`,
          payload: { orderId: p.orderId, offerId: p.offerId },
        },
      ]);
    },

    async onOrderConfirmed(p: OrderConfirmedPayload) {
      if (!p.leaderUserId) return 0;
      return deliver([
        {
          userId: p.leaderUserId,
          type: 'order_confirmed',
          dedupeKey: `order_confirmed:${p.orderId}`,
          payload: { orderId: p.orderId },
        },
      ]);
    },

    async onReviewPublished(p: ReviewPublishedPayload) {
      const entries: NotificationEntry[] = [];
      if (p.direction === 'COMPANY_TO_LEADER' && p.leaderUserId) {
        entries.push({
          userId: p.leaderUserId,
          type: 'review_received',
          dedupeKey: `review_published:${p.reviewId}`,
          payload: { orderId: p.orderId },
        });
      } else if (p.direction === 'LEADER_TO_COMPANY') {
        const recipients = await identity.getCompanyMemberUserIds(p.companyId);
        for (const userId of recipients) {
          entries.push({
            userId,
            type: 'review_received',
            dedupeKey: `review_published:${p.reviewId}`,
            payload: { orderId: p.orderId },
          });
        }
      }
      return deliver(entries);
    },

    async onLevelAchieved(p: LevelAchievedPayload) {
      return deliver([
        {
          userId: p.userId,
          type: 'level_achieved',
          dedupeKey: `level_achieved:${p.achievementId}`,
          payload: { level: p.level },
        },
      ]);
    },

    async onCommentAdded(p: CommentAddedPayload) {
      // Nie powiadamiaj o komentarzu do własnego posta.
      if (p.postAuthorUserId === p.actorUserId) return 0;
      return deliver([
        {
          userId: p.postAuthorUserId,
          type: 'post_commented',
          dedupeKey: `comment_added:${p.commentId}`,
          payload: { postId: p.postId, groupId: p.groupId },
        },
      ]);
    },

    async onMembershipRequested(p: MembershipRequestedPayload) {
      return deliver(
        p.moderatorUserIds.map((userId) => ({
          userId,
          type: 'membership_requested',
          dedupeKey: `membership_requested:${p.groupId}:${p.requesterUserId}`,
          payload: { groupId: p.groupId, requesterUserId: p.requesterUserId },
        })),
      );
    },

    async onMembershipAccepted(p: MembershipAcceptedPayload) {
      return deliver([
        {
          userId: p.requesterUserId,
          type: 'membership_accepted',
          dedupeKey: `membership_accepted:${p.groupId}:${p.requesterUserId}`,
          payload: { groupId: p.groupId },
        },
      ]);
    },

    // Community (Q&A): powiadom autora pytania o nowej odpowiedzi. To fan-out
    // powiadomień — ZERO logiki punktowej (punkty żyją tylko w ladder).
    async onAnswerCreated(p: AnswerCreatedPayload) {
      if (p.threadAuthorUserId === p.answerAuthorUserId) return 0;
      return deliver([
        {
          userId: p.threadAuthorUserId,
          type: 'answer_received',
          dedupeKey: `answer_created:${p.answerId}`,
          payload: { threadId: p.threadId, groupId: p.groupId },
        },
      ]);
    },

    // Community (Q&A): powiadom autora odpowiedzi o jej zaakceptowaniu.
    async onAnswerAccepted(p: AnswerAcceptedPayload) {
      if (p.answerAuthorUserId === p.questionAuthorUserId) return 0;
      return deliver([
        {
          userId: p.answerAuthorUserId,
          type: 'answer_accepted',
          dedupeKey: `answer_accepted:${p.answerId}`,
          payload: { threadId: p.threadId, groupId: p.groupId },
        },
      ]);
    },

    // --- odczyty / mutacje użytkownika --------------------------------------
    async list(userId: string, filters: { cursor?: string; limit?: number }) {
      const limit = filters.limit ?? 20;
      const rows = await prisma.notification.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      return {
        notifications: page.map((n) => ({
          id: n.id,
          type: n.type,
          payload: n.payload,
          readAt: n.readAt,
          createdAt: n.createdAt,
        })),
        nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      };
    },

    async unreadCount(userId: string) {
      const count = await prisma.notification.count({ where: { userId, readAt: null } });
      return { count };
    },

    async markRead(userId: string, input: { ids?: string[]; all?: boolean }) {
      const where: Prisma.NotificationWhereInput = {
        userId,
        readAt: null,
        ...(input.all ? {} : { id: { in: input.ids ?? [] } }),
      };
      const result = await prisma.notification.updateMany({ where, data: { readAt: new Date() } });
      return { updated: result.count };
    },

    // Dzienny digest (D4, ADR-009): jeden zbiorczy e-mail zamiast wielu — trzyma
    // wolumen poniżej darmowego limitu Brevo. No-op gdy wysyłka wyłączona.
    async sendDailyDigests(
      mail: MailService,
      getEmails: (userIds: string[]) => Promise<Map<string, string>>,
    ): Promise<number> {
      if (!mail.enabled) return 0;
      const groups = await prisma.notification.groupBy({
        by: ['userId'],
        where: { readAt: null },
        _count: { _all: true },
      });
      if (groups.length === 0) return 0;
      const emails = await getEmails(groups.map((g) => g.userId));
      let sent = 0;
      for (const g of groups) {
        const email = emails.get(g.userId);
        if (!email) continue;
        await mail.send({
          to: email,
          subject: 'Twoje powiadomienia — Leaders of Teams',
          text: `Masz ${g._count._all} nieprzeczytanych powiadomień w portalu leadersofteams.pl.`,
        });
        sent += 1;
      }
      return sent;
    },
  };
}

export type NotificationsService = ReturnType<typeof createNotificationsService>;
