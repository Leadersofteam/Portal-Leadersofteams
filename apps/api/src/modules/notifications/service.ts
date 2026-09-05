import type { Prisma } from '@prisma/client';

import type { PrismaClient } from '../../shared/db';
import type { MailService } from '../../shared/mail';
import type { IdentityService } from '../identity/index';

// Sygnał realtime (ADR-007 dec. 3): worker po zapisie powiadomienia budzi socket
// użytkownika przez Redis pub/sub. Best-effort — utrata sygnału nieszkodliwa,
// bo badge dociągany jest zawsze REST-em. W testach domyślny no-op.
export type NotificationSignal = (userId: string) => Promise<void> | void;

// Maile natychmiastowe (PL1). Do 04.09 Portal wysyłał WYŁĄCZNIE dzienny digest:
// Firma, która nie logowała się codziennie, nie wiedziała o ofercie do swojego
// zlecenia — pierwsza realna oferta Portalu wisiała bez odpowiedzi 3 dni.
// Mail idzie tylko przy zdarzeniach, które WYMAGAJĄ ruchu drugiej strony
// (oferta, wiadomość, oddana praca, przyjęcie, potwierdzenie). Komentarze,
// wzmianki, „doceniam" zostają w digeście — ADR-010: nie ciągniemy ludzi
// z powrotem, informujemy, gdy ktoś na nich czeka.
// Odbiorców filtruje identity (anonimizowani, wypisani) — ten sam przełącznik
// i ten sam token wypisu co digest: jedno „nie pisz do mnie" wyłącza wszystko.
export interface NotificationMailer {
  mail: MailService;
  getRecipients: (userIds: string[]) => Promise<Map<string, { email: string; token: string }>>;
  appBaseUrl: string;
}

export interface NotificationsServiceDeps {
  prisma: PrismaClient;
  identity: Pick<IdentityService, 'getCompanyMemberUserIds'>;
  signal?: NotificationSignal;
  mailer?: NotificationMailer;
}

interface NotificationEntry {
  userId: string;
  type: string;
  dedupeKey: string;
  payload: Prisma.InputJsonValue;
}

/** Treść maila natychmiastowego — bez ponaglania, z jednym linkiem (ADR-010). */
interface InstantMail {
  subject: string;
  /** Akapity treści; link i stopka z wypisem dokładane są tutaj. */
  lines: string[];
  /** Ścieżka względna w Portalu, do której prowadzi mail. */
  path: string;
}

// Payloady zdarzeń (kontrakt z modułami-emiterami). `orderTitle` jest
// opcjonalny: zdarzenia sprzed PL1 leżące jeszcze w kolejce go nie mają.
interface OfferSubmittedPayload {
  offerId: string;
  orderId: string;
  orderTitle?: string;
  leaderUserId: string;
  companyId: string;
}
interface OfferAcceptedPayload {
  offerId: string;
  orderId: string;
  orderTitle?: string;
  leaderUserId: string;
}
interface OfferMessagePayload {
  offerId: string;
  orderId: string;
  orderTitle?: string;
  authorUserId: string;
  authorIsLeader: boolean;
  leaderUserId: string;
  companyId: string;
}
interface OrderDeliveredPayload {
  orderId: string;
  orderTitle?: string;
  // Zdarzenia sprzed PL1 nie niosły companyId — wtedy nie ma kogo powiadomić.
  companyId?: string;
  leaderUserId: string;
}
interface OrderConfirmedPayload {
  orderId: string;
  orderTitle?: string;
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
interface InquiryCreatedPayload {
  inquiryId: string;
  listingId: string;
  listingTitle: string;
  leaderUserId: string;
  companyId: string;
}

interface InquiryMessagePayload {
  inquiryId: string;
  listingTitle: string;
  authorUserId: string;
  recipientUserId: string;
}

interface UserMentionedPayload {
  mentionedUserId: string;
  authorUserId: string;
  groupId?: string;
  postId?: string;
  threadId?: string;
  // Wzmianka we wpisie portalowym nie ma grupy — bez tego pola powiadomienie
  // nie miałoby dokąd prowadzić i lądowałoby na ogólnej liście.
  socialPostId?: string;
}

interface LevelAchievedPayload {
  achievementId: string;
  userId: string;
  level: number;
}
interface CommentAddedPayload {
  commentId: string;
  postId?: string;
  groupId?: string;
  socialPostId?: string;
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
interface MembershipRoleChangedPayload {
  groupId: string;
  userId: string;
  role: 'MEMBER' | 'MODERATOR';
  actorUserId: string;
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

export function createNotificationsService({
  prisma,
  identity,
  signal,
  mailer,
}: NotificationsServiceDeps) {
  // Idempotentna dostawa (at-least-once): unikat (userId, dedupeKey) + skipDuplicates.
  // Redelivery tego samego zdarzenia nie tworzy drugiego powiadomienia.
  async function deliver(entries: NotificationEntry[], instant?: InstantMail) {
    const unique = new Map<string, NotificationEntry>();
    for (const e of entries) unique.set(`${e.userId}|${e.dedupeKey}`, e);
    const list = [...unique.values()];
    if (list.length === 0) return 0;
    const result = await prisma.notification.createMany({ data: list, skipDuplicates: true });
    const recipients = [...new Set(list.map((e) => e.userId))];
    if (signal) {
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
    // Mail tylko dla ŚWIEŻYCH powiadomień: przy redelivery createMany pomija
    // duplikaty (count < list.length) — wtedy mail już poszedł i nie idzie drugi.
    // createMany nie mówi KTÓRE wiersze pominął, więc przy częściowym
    // pominięciu wolimy nie wysłać nic niż zdublować komuś skrzynkę.
    if (instant && mailer?.mail.enabled && result.count === list.length) {
      await sendInstant(recipients, instant);
    }
    return result.count;
  }

  async function sendInstant(userIds: string[], instant: InstantMail) {
    if (!mailer) return;
    const recipients = await mailer.getRecipients(userIds);
    for (const [, recipient] of recipients) {
      try {
        await mailer.mail.send({
          to: recipient.email,
          subject: `${instant.subject} — Leaders of Teams`,
          text: [
            ...instant.lines,
            '',
            `Zobacz: ${mailer.appBaseUrl}${instant.path}`,
            '',
            'Piszemy, bo ktoś czeka na Twój ruch. Nie chcesz takich maili? Wyłączysz je jednym kliknięciem:',
            `${mailer.appBaseUrl}/wypis-digest?token=${recipient.token}`,
          ].join('\n'),
        });
      } catch {
        // Mail jest DODATKIEM do powiadomienia in-app, nie jego warunkiem:
        // padnięty SMTP nie może wywrócić joba (retry zdublowałby powiadomienie
        // o kolejny sygnał realtime). Sam błąd loguje warstwa mail.
      }
    }
  }

  const quoted = (title?: string) => (title ? ` „${title}"` : '');

  return {
    // --- konsumenci zdarzeń (idempotentni) ----------------------------------
    async onOfferSubmitted(p: OfferSubmittedPayload) {
      const recipients = await identity.getCompanyMemberUserIds(p.companyId);
      return deliver(
        recipients.map((userId) => ({
          userId,
          type: 'offer_submitted',
          dedupeKey: `offer_submitted:${p.offerId}`,
          payload: { orderId: p.orderId, offerId: p.offerId, orderTitle: p.orderTitle },
        })),
        {
          subject: `Nowa oferta do zlecenia${quoted(p.orderTitle)}`,
          lines: [
            `Lider złożył ofertę do Twojego zlecenia${quoted(p.orderTitle)} w portalu Leaders of Teams.`,
            'Możesz ją przeczytać, dopytać oferenta w rozmowie przy ofercie albo ją wybrać.',
          ],
          path: `/oferty/${p.offerId}`,
        },
      );
    },

    // Wątek przy ofercie (PL1): adresat = druga strona. Autor-Lider → członkowie
    // Firmy; autor-Firma → Lider. Klucz dedupe z minutą jak przy zapytaniach.
    async onOfferMessage(p: OfferMessagePayload) {
      const recipients = p.authorIsLeader
        ? await identity.getCompanyMemberUserIds(p.companyId)
        : [p.leaderUserId];
      const minute = Math.floor(Date.now() / 60_000);
      return deliver(
        recipients
          .filter((userId) => userId !== p.authorUserId)
          .map((userId) => ({
            userId,
            type: 'offer_message',
            dedupeKey: `offer_message:${p.offerId}:${minute}`,
            payload: { orderId: p.orderId, offerId: p.offerId, orderTitle: p.orderTitle },
          })),
        {
          subject: `Nowa wiadomość w rozmowie o ofercie${quoted(p.orderTitle)}`,
          lines: [
            `Druga strona napisała w rozmowie o ofercie do zlecenia${quoted(p.orderTitle)}.`,
            'Odpowiedz w Portalu — rozmowa jest zakotwiczona przy ofercie.',
          ],
          path: `/oferty/${p.offerId}`,
        },
      );
    },

    async onOrderDelivered(p: OrderDeliveredPayload) {
      if (!p.companyId) return 0;
      const recipients = await identity.getCompanyMemberUserIds(p.companyId);
      return deliver(
        recipients.map((userId) => ({
          userId,
          type: 'order_delivered',
          dedupeKey: `order_delivered:${p.orderId}`,
          payload: { orderId: p.orderId, orderTitle: p.orderTitle },
        })),
        {
          subject: `Lider oddał pracę${quoted(p.orderTitle)}`,
          lines: [
            `Lider oznaczył zlecenie${quoted(p.orderTitle)} jako wykonane.`,
            'Sprawdź efekt i potwierdź wykonanie w Portalu — po potwierdzeniu obie strony mogą się ocenić.',
          ],
          path: `/zlecenia/${p.orderId}`,
        },
      );
    },

    async onUserMentioned(p: UserMentionedPayload) {
      return deliver([
        {
          userId: p.mentionedUserId,
          type: 'user_mentioned',
          dedupeKey: `user_mentioned:${p.postId ?? p.threadId ?? p.socialPostId ?? 'x'}:${p.authorUserId}`,
          payload: {
            groupId: p.groupId,
            postId: p.postId,
            threadId: p.threadId,
            socialPostId: p.socialPostId,
          },
        },
      ]);
    },

    // Ktoś podał dalej Twój wpis z własnym komentarzem. Powiadomienie prowadzi
    // do NOWEGO wpisu (tego z cytatem), nie do oryginału — inaczej autor nie
    // zobaczyłby tego, co ktoś o nim napisał.
    async onPostQuoted(p: {
      postId: string;
      quotedPostId: string;
      quotedAuthorUserId: string;
      actorUserId: string;
    }) {
      return deliver([
        {
          userId: p.quotedAuthorUserId,
          type: 'post_quoted',
          dedupeKey: `post_quoted:${p.postId}`,
          payload: { socialPostId: p.postId, quotedPostId: p.quotedPostId },
        },
      ]);
    },

    async onInquiryCreated(p: InquiryCreatedPayload) {
      return deliver(
        [
          {
            userId: p.leaderUserId,
            type: 'inquiry_created',
            dedupeKey: `inquiry_created:${p.inquiryId}`,
            payload: { inquiryId: p.inquiryId, listingTitle: p.listingTitle },
          },
        ],
        {
          subject: `Nowe zapytanie o usługę${quoted(p.listingTitle)}`,
          lines: [
            `Firma pyta o Twoją usługę${quoted(p.listingTitle)} w portalu Leaders of Teams.`,
            'Odpowiedz w wątku zapytania — stamtąd rozmowa może zamienić się w zlecenie.',
          ],
          path: `/zapytania/${p.inquiryId}`,
        },
      );
    },

    async onInquiryMessage(p: InquiryMessagePayload) {
      return deliver(
        [
          {
            userId: p.recipientUserId,
            type: 'inquiry_message',
            // Dedupe per wiadomość byłby lepszy, ale payload nie niesie id —
            // klucz z timestampem minutowym ogranicza spam sygnałów.
            dedupeKey: `inquiry_message:${p.inquiryId}:${Math.floor(Date.now() / 60_000)}`,
            payload: { inquiryId: p.inquiryId, listingTitle: p.listingTitle },
          },
        ],
        {
          subject: `Nowa wiadomość w zapytaniu o usługę${quoted(p.listingTitle)}`,
          lines: [`Druga strona napisała w zapytaniu o usługę${quoted(p.listingTitle)}.`],
          path: `/zapytania/${p.inquiryId}`,
        },
      );
    },

    async onOfferAccepted(p: OfferAcceptedPayload) {
      return deliver(
        [
          {
            userId: p.leaderUserId,
            type: 'offer_accepted',
            dedupeKey: `offer_accepted:${p.offerId}`,
            payload: { orderId: p.orderId, offerId: p.offerId, orderTitle: p.orderTitle },
          },
        ],
        {
          subject: `Twoja oferta została przyjęta${quoted(p.orderTitle)}`,
          lines: [
            `Firma wybrała Twoją ofertę do zlecenia${quoted(p.orderTitle)}.`,
            'Następny ruch jest Twój: rozpocznij pracę w Portalu, a po jej oddaniu Firma potwierdzi wykonanie.',
          ],
          path: `/zlecenia/${p.orderId}`,
        },
      );
    },

    async onOrderConfirmed(p: OrderConfirmedPayload) {
      if (!p.leaderUserId) return 0;
      return deliver(
        [
          {
            userId: p.leaderUserId,
            type: 'order_confirmed',
            dedupeKey: `order_confirmed:${p.orderId}`,
            payload: { orderId: p.orderId, orderTitle: p.orderTitle },
          },
        ],
        {
          subject: `Zlecenie potwierdzone${quoted(p.orderTitle)}`,
          lines: [
            `Firma potwierdziła wykonanie zlecenia${quoted(p.orderTitle)}.`,
            'Możecie się teraz ocenić. Ocena Firmy to jedyna droga do punktów w Drabince — jawna i od drugiego człowieka.',
          ],
          path: `/zlecenia/${p.orderId}`,
        },
      );
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
          payload: { postId: p.postId, groupId: p.groupId, socialPostId: p.socialPostId },
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

    /**
     * Awans na moderatora grupy (S17). Bez tego powiadomienia człowiek dostaje
     * uprawnienia i nie ma jak się o tym dowiedzieć — rola bez wiedzy o roli
     * jest martwa. O degradacji NIE powiadamiamy: to komunikat, który upokarza,
     * a moderator, który ją nadał, powinien powiedzieć o niej sam.
     * ANTY-MLM: rola w grupie to obowiązek, nie status — ZERO punktów.
     */
    async onMembershipRoleChanged(p: MembershipRoleChangedPayload) {
      if (p.role !== 'MODERATOR') return 0;
      return deliver([
        {
          userId: p.userId,
          type: 'group_moderator_granted',
          dedupeKey: `group_moderator:${p.groupId}:${p.userId}`,
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
    // wolumen w zasięgu zwykłej skrzynki pocztowej. No-op gdy wysyłka wyłączona.
    // Odbiorców (z tokenem wypisu) dostarcza identity — tam siedzi filtr kont
    // zanonimizowanych i wypisanych. Mail MUSI zawierać link wypisu działający
    // bez logowania: do 19.08 nie było ŻADNEJ drogi wyłączenia tych maili.
    async sendDailyDigests(
      mail: MailService,
      getRecipients: (userIds: string[]) => Promise<Map<string, { email: string; token: string }>>,
      appBaseUrl: string,
    ): Promise<number> {
      if (!mail.enabled) return 0;
      const groups = await prisma.notification.groupBy({
        by: ['userId'],
        where: { readAt: null },
        _count: { _all: true },
      });
      if (groups.length === 0) return 0;
      const recipients = await getRecipients(groups.map((g) => g.userId));
      let sent = 0;
      for (const g of groups) {
        const recipient = recipients.get(g.userId);
        if (!recipient) continue;
        await mail.send({
          to: recipient.email,
          subject: 'Twoje powiadomienia — Leaders of Teams',
          text: [
            `Masz ${g._count._all} nieprzeczytanych powiadomień w portalu Leaders of Teams.`,
            '',
            `Zobacz: ${appBaseUrl}/powiadomienia`,
            '',
            'Nie chcesz tych maili? Wypiszesz się jednym kliknięciem:',
            `${appBaseUrl}/wypis-digest?token=${recipient.token}`,
          ].join('\n'),
        });
        sent += 1;
      }
      return sent;
    },
  };
}

export type NotificationsService = ReturnType<typeof createNotificationsService>;
