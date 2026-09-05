import type {
  CreateOfferInput,
  OfferMessageInput,
  CreateOrderInput,
  OrderFilters,
  UpdateOrderInput,
} from '@lot/contracts';
import type { OrderStatus, Prisma } from '@prisma/client';

import type { Cache } from '../../shared/cache';
import type { PrismaClient } from '../../shared/db';
import { toBooleanQuery } from '../../shared/fulltext';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  InvalidTransitionError,
  NotFoundError,
} from '../../shared/errors';
import { emitEvent } from '../../shared/outbox';
import { enforceFreshAccountQuota, FRESH_ACCOUNT_LIMITS } from '../../shared/quota';
import type { Redis } from '../../shared/redis';
import type { IdentityService } from '../identity/index';
import type { LadderService } from '../ladder/index';

// Cache publicznego listingu zleceń (D3) — TTL krótki, inwalidacja synchroniczna
// (bump wersji namespace) przy każdej zmianie widoczności zlecenia.
const ORDERS_CACHE_NS = 'orders';
const ORDERS_CACHE_TTL = 60;

export interface OrdersServiceDeps {
  prisma: PrismaClient;
  identity: Pick<
    IdentityService,
    | 'isCompanyMember'
    | 'getPublicCompanies'
    | 'getPublicUsers'
    | 'getUserCreatedAt'
    | 'getVerificationStatus'
  >;
  ladder: LadderService;
  cache?: Cache;
  redis?: Redis;
  // PL2 (D2): zlecenie gościa publikuje się dopiero po potwierdzeniu adresu.
  // Flaga zależy od środowiska: bez SMTP (dev/test) nie ma jak potwierdzić
  // adresu, więc bramka jest wyłączona — inaczej Portal bez poczty byłby
  // Portalem bez zleceń. Na produkcji (SMTP włączone) bramka działa dla
  // wszystkich publikacji: to też bariera anty-spam (R-03).
  publishRequiresVerifiedEmail?: boolean;
}

// Wątek przy ofercie żyje, dopóki obie strony mają o czym rozmawiać: oferta
// złożona albo przyjęta, zlecenie nieanulowane. Po wycofaniu/odrzuceniu oferty
// wątek zostaje do odczytu — nie kasujemy cudzych słów.
function offerThreadOpen(offerStatus: string, orderStatus: OrderStatus): boolean {
  return (offerStatus === 'SUBMITTED' || offerStatus === 'ACCEPTED') && orderStatus !== 'CANCELLED';
}

export function createOrdersService({
  prisma,
  identity,
  ladder,
  cache,
  redis,
  publishRequiresVerifiedEmail = false,
}: OrdersServiceDeps) {
  async function requireOrder(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Zlecenie nie istnieje');
    return order;
  }

  async function requireCompanyMember(userId: string, companyId: string) {
    if (!(await identity.isCompanyMember(userId, companyId))) {
      throw new ForbiddenError('NOT_COMPANY_MEMBER', 'Nie należysz do tej firmy');
    }
  }

  async function requireIndustry(industryId: string) {
    const industry = await prisma.industry.findUnique({ where: { id: industryId } });
    if (!industry) throw new DomainError('UNKNOWN_INDUSTRY', 'Nieznana branża', 400);
  }

  // Przejście statusu z blokadą optymistyczną: update trafia tylko wtedy,
  // gdy zlecenie wciąż jest w oczekiwanym stanie (żadnych wyścigów).
  async function transition(
    tx: Prisma.TransactionClient,
    orderId: string,
    from: OrderStatus[],
    data: Prisma.OrderUpdateManyMutationInput,
  ) {
    const result = await tx.order.updateMany({
      where: { id: orderId, status: { in: from } },
      data,
    });
    if (result.count === 0) throw new InvalidTransitionError();
  }

  async function getAwardedLeaderUserId(orderId: string): Promise<string | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { awardedOffer: { select: { leaderProfile: { select: { userId: true } } } } },
    });
    return order?.awardedOffer?.leaderProfile.userId ?? null;
  }

  // Właściwy odczyt listingu (owinięty cache-aside w listPublished).
  async function loadPublished(filters: OrderFilters) {
    // FULLTEXT w trybie boolowskim (prefiksy: „rekrut" znajduje „rekrutację").
    // Wyrażenie idzie jako PARAMETR — nigdy przez sklejanie stringów.
    // Gdy fraza jest zbyt krótka na indeks (innodb_ft_min_token_size = 3),
    // toBooleanQuery zwraca null i schodzimy na LIKE, zamiast pokazywać pustkę.
    let fulltextIds: string[] | null = null;
    let likeQ: string | null = null;
    if (filters.q) {
      const expr = toBooleanQuery(filters.q);
      if (expr) {
        const rows = await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM orders
            WHERE MATCH(title, description) AGAINST(${expr} IN BOOLEAN MODE)
              AND status = 'PUBLISHED'
            LIMIT 200`;
        fulltextIds = rows.map((r) => r.id);
        if (fulltextIds.length === 0) return { orders: [], nextCursor: null };
      } else {
        likeQ = filters.q;
      }
    }

    const where: Prisma.OrderWhereInput = {
      status: 'PUBLISHED',
      ...(fulltextIds ? { id: { in: fulltextIds } } : {}),
      ...(likeQ ? { title: { contains: likeQ } } : {}),
      ...(filters.industryId ? { industryId: filters.industryId } : {}),
      ...(filters.maxMinLevel !== undefined ? { minLevel: { lte: filters.maxMinLevel } } : {}),
      ...(filters.budgetMin !== undefined ? { budgetMax: { gte: filters.budgetMin } } : {}),
      ...(filters.budgetMax !== undefined ? { budgetMin: { lte: filters.budgetMax } } : {}),
    };

    const rows = await prisma.order.findMany({
      where,
      include: { industry: true },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: filters.limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > filters.limit;
    const page = hasMore ? rows.slice(0, filters.limit) : rows;
    const companies = await identity.getPublicCompanies(page.map((o) => o.companyId));
    return {
      orders: page.map((o) => ({
        id: o.id,
        title: o.title,
        industry: o.industry,
        budgetMin: o.budgetMin,
        budgetMax: o.budgetMax,
        minLevel: o.minLevel,
        publishedAt: o.publishedAt,
        companyName: companies.get(o.companyId)?.name ?? 'Firma',
      })),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  return {
    async createDraft(userId: string, input: CreateOrderInput) {
      await requireCompanyMember(userId, input.companyId);
      await requireIndustry(input.industryId);
      const order = await prisma.order.create({
        data: {
          companyId: input.companyId,
          createdById: userId,
          industryId: input.industryId,
          title: input.title,
          description: input.description,
          budgetMin: input.budgetMin,
          budgetMax: input.budgetMax,
          minLevel: input.minLevel,
        },
      });
      return { id: order.id, status: order.status };
    },

    async updateDraft(userId: string, orderId: string, input: UpdateOrderInput) {
      const order = await requireOrder(orderId);
      await requireCompanyMember(userId, order.companyId);
      if (order.status !== 'DRAFT') {
        throw new InvalidTransitionError('Edytować można tylko szkic zlecenia');
      }
      if (input.industryId) await requireIndustry(input.industryId);
      await prisma.order.update({ where: { id: orderId }, data: input });
      return { id: orderId };
    },

    async publish(userId: string, orderId: string) {
      const order = await requireOrder(orderId);
      await requireCompanyMember(userId, order.companyId);
      if (publishRequiresVerifiedEmail) {
        const verification = await identity.getVerificationStatus(userId);
        if (!verification?.verified) {
          throw new ForbiddenError(
            'EMAIL_NOT_VERIFIED',
            'Potwierdź adres e-mail, żeby opublikować zlecenie — link wysłaliśmy przy rejestracji, nowy znajdziesz w panelu.',
          );
        }
      }
      // Limit publikacji dla świeżych kont (D7) — bariera anty-spam.
      await enforceFreshAccountQuota(
        redis,
        identity.getUserCreatedAt,
        userId,
        FRESH_ACCOUNT_LIMITS.order_publish,
      );
      await prisma.$transaction(async (tx) => {
        await transition(tx, orderId, ['DRAFT'], {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        });
        await emitEvent(tx, 'marketplace.order_published', {
          orderId,
          companyId: order.companyId,
          minLevel: order.minLevel,
        });
      });
      await cache?.bump(ORDERS_CACHE_NS); // listing zleceń nieaktualny
      return { id: orderId, status: 'PUBLISHED' as const };
    },

    async cancel(userId: string, orderId: string) {
      const order = await requireOrder(orderId);
      await requireCompanyMember(userId, order.companyId);
      await prisma.$transaction(async (tx) => {
        // Anulować można do momentu rozpoczęcia pracy.
        await transition(tx, orderId, ['DRAFT', 'PUBLISHED', 'AWARDED'], {
          status: 'CANCELLED',
        });
        await emitEvent(tx, 'marketplace.order_cancelled', { orderId });
      });
      await cache?.bump(ORDERS_CACHE_NS);
      return { id: orderId, status: 'CANCELLED' as const };
    },

    // Listing publiczny. Decyzja projektowa: wszystkie opublikowane zlecenia
    // są WIDOCZNE (SEO + transparentność), ale ofertowanie wymaga poziomu
    // >= minLevel (bramka w submitOffer) — brief 3.2.
    async listPublished(filters: OrderFilters) {
      // Cache-aside (D3): widok w pełni publiczny, klucz = filtry. NIGDY dla
      // danych punktowych. Brak cache (część testów) → odczyt bezpośredni.
      if (!cache) return loadPublished(filters);
      return cache.getOrSet(ORDERS_CACHE_NS, filters, ORDERS_CACHE_TTL, () =>
        loadPublished(filters),
      );
    },

    async getOrder(orderId: string, viewerId: string | null) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { industry: true },
      });
      if (!order) throw new NotFoundError('Zlecenie nie istnieje');

      const isCompanyMember = viewerId
        ? await identity.isCompanyMember(viewerId, order.companyId)
        : false;
      const awardedLeaderUserId = await getAwardedLeaderUserId(orderId);
      const isAwardedLeader = viewerId !== null && viewerId === awardedLeaderUserId;

      // Szkice widzi tylko firma; reszta cyklu życia jest publiczna.
      if (order.status === 'DRAFT' && !isCompanyMember) {
        throw new NotFoundError('Zlecenie nie istnieje');
      }

      const companies = await identity.getPublicCompanies([order.companyId]);
      const myOffer =
        viewerId && !isCompanyMember
          ? await prisma.offer.findFirst({
              where: { orderId, leaderProfile: { userId: viewerId } },
              select: { id: true, status: true, message: true, proposedBudget: true },
            })
          : null;

      return {
        order: {
          id: order.id,
          title: order.title,
          description: order.description,
          industry: order.industry,
          budgetMin: order.budgetMin,
          budgetMax: order.budgetMax,
          minLevel: order.minLevel,
          status: order.status,
          publishedAt: order.publishedAt,
          companyId: order.companyId,
          companyName: companies.get(order.companyId)?.name ?? 'Firma',
        },
        viewer: { isCompanyMember, isAwardedLeader, myOffer },
      };
    },

    async submitOffer(userId: string, orderId: string, input: CreateOfferInput) {
      const profile = await prisma.leaderProfile.findUnique({ where: { userId } });
      if (!profile) {
        throw new DomainError(
          'PROFILE_REQUIRED',
          'Aby złożyć ofertę, najpierw utwórz profil Lidera',
          400,
        );
      }
      const order = await requireOrder(orderId);
      if (order.status !== 'PUBLISHED') {
        throw new InvalidTransitionError('Oferty można składać tylko do opublikowanych zleceń');
      }
      // Konflikt interesów: członek firmy nie ofertuje własnego zlecenia
      // (guardrail antyfraudowy — ADR-004: powiązania osoba↔firma).
      if (await identity.isCompanyMember(userId, order.companyId)) {
        throw new ForbiddenError('OWN_COMPANY', 'Nie możesz ofertować zlecenia własnej firmy');
      }
      // Bramka zaufania stopniowanego (brief 3.2): poziom z Drabinki.
      const level = await ladder.getLevel(userId);
      if (level < order.minLevel) {
        throw new ForbiddenError(
          'LEVEL_TOO_LOW',
          `To zlecenie wymaga poziomu ${order.minLevel} w Drabince Lidera (Twój poziom: ${level})`,
        );
      }
      try {
        return await prisma.$transaction(async (tx) => {
          const offer = await tx.offer.create({
            data: {
              orderId,
              leaderProfileId: profile.id,
              message: input.message,
              proposedBudget: input.proposedBudget ?? null,
              proposedDays: input.proposedDays ?? null,
            },
          });
          await emitEvent(tx, 'marketplace.offer_submitted', {
            offerId: offer.id,
            orderId,
            orderTitle: order.title,
            leaderUserId: userId,
            companyId: order.companyId,
          });
          return { id: offer.id };
        });
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
          throw new ConflictError('OFFER_EXISTS', 'Złożyłeś już ofertę do tego zlecenia');
        }
        throw err;
      }
    },

    async withdrawOffer(userId: string, offerId: string) {
      const result = await prisma.offer.updateMany({
        where: { id: offerId, status: 'SUBMITTED', leaderProfile: { userId } },
        data: { status: 'WITHDRAWN' },
      });
      if (result.count === 0) {
        throw new InvalidTransitionError('Nie można wycofać tej oferty');
      }
    },

    async listOffersForOrder(userId: string, orderId: string) {
      const order = await requireOrder(orderId);
      await requireCompanyMember(userId, order.companyId);
      const offers = await prisma.offer.findMany({
        where: { orderId, status: { in: ['SUBMITTED', 'ACCEPTED'] } },
        include: {
          leaderProfile: { include: { industry: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      const users = await identity.getPublicUsers(offers.map((o) => o.leaderProfile.userId));
      return offers.map((o) => ({
        id: o.id,
        message: o.message,
        proposedBudget: o.proposedBudget,
        proposedDays: o.proposedDays,
        status: o.status,
        createdAt: o.createdAt,
        messagesCount: o._count.messages,
        leader: {
          profileId: o.leaderProfile.id,
          displayName: users.get(o.leaderProfile.userId)?.displayName ?? 'Lider',
          headline: o.leaderProfile.headline,
          industry: o.leaderProfile.industry.name,
        },
      }));
    },

    async acceptOffer(userId: string, offerId: string) {
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        include: { order: true, leaderProfile: { select: { userId: true } } },
      });
      if (!offer) throw new NotFoundError('Oferta nie istnieje');
      await requireCompanyMember(userId, offer.order.companyId);
      if (offer.status !== 'SUBMITTED') {
        throw new InvalidTransitionError('Ta oferta nie jest już aktywna');
      }
      await prisma.$transaction(async (tx) => {
        await transition(tx, offer.orderId, ['PUBLISHED'], { status: 'AWARDED' });
        // updateMany nie przyjmuje pól relacyjnych — connect po udanym przejściu.
        await tx.order.update({
          where: { id: offer.orderId },
          data: { awardedOffer: { connect: { id: offerId } } },
        });
        await tx.offer.update({ where: { id: offerId }, data: { status: 'ACCEPTED' } });
        await tx.offer.updateMany({
          where: { orderId: offer.orderId, status: 'SUBMITTED' },
          data: { status: 'REJECTED' },
        });
        await emitEvent(tx, 'marketplace.offer_accepted', {
          offerId,
          orderId: offer.orderId,
          orderTitle: offer.order.title,
          leaderUserId: offer.leaderProfile.userId,
        });
      });
      await cache?.bump(ORDERS_CACHE_NS); // zlecenie opuszcza listing PUBLISHED
      return { orderId: offer.orderId };
    },

    async start(userId: string, orderId: string) {
      const awardedLeader = await getAwardedLeaderUserId(orderId);
      if (awardedLeader !== userId) {
        throw new ForbiddenError('NOT_AWARDED_LEADER', 'Tylko wybrany Lider może rozpocząć pracę');
      }
      await prisma.$transaction(async (tx) => {
        await transition(tx, orderId, ['AWARDED'], { status: 'IN_PROGRESS' });
        await emitEvent(tx, 'marketplace.order_started', { orderId, leaderUserId: userId });
      });
    },

    async deliver(userId: string, orderId: string) {
      const awardedLeader = await getAwardedLeaderUserId(orderId);
      if (awardedLeader !== userId) {
        throw new ForbiddenError('NOT_AWARDED_LEADER', 'Tylko wybrany Lider może oddać pracę');
      }
      const order = await requireOrder(orderId);
      await prisma.$transaction(async (tx) => {
        await transition(tx, orderId, ['IN_PROGRESS'], { status: 'DELIVERED' });
        // companyId + tytuł w payloadzie: do 04.09 oddanie pracy NIE
        // powiadamiało Firmy (jedyny krok cyklu bez adresata), a to Firma ma
        // teraz zrobić kolejny ruch — potwierdzić wykonanie.
        await emitEvent(tx, 'marketplace.order_delivered', {
          orderId,
          orderTitle: order.title,
          companyId: order.companyId,
          leaderUserId: userId,
        });
      });
    },

    // Obustronne domknięcie (ADR-006): potwierdzenie firmy kończy zlecenie.
    // Zdarzenie order_confirmed otworzy w sprincie 2–3 okno ocen (Review),
    // z których dopiero naliczą się punkty (PENDING → CONFIRMED, ADR-004).
    async confirm(userId: string, orderId: string) {
      const order = await requireOrder(orderId);
      await requireCompanyMember(userId, order.companyId);
      const leaderUserId = await getAwardedLeaderUserId(orderId);
      await prisma.$transaction(async (tx) => {
        await transition(tx, orderId, ['DELIVERED'], { status: 'CONFIRMED' });
        await emitEvent(tx, 'marketplace.order_confirmed', {
          orderId,
          orderTitle: order.title,
          companyId: order.companyId,
          leaderUserId,
        });
      });
    },

    async dispute(userId: string, orderId: string) {
      const order = await requireOrder(orderId);
      const isMember = await identity.isCompanyMember(userId, order.companyId);
      const awardedLeader = await getAwardedLeaderUserId(orderId);
      if (!isMember && awardedLeader !== userId) {
        throw new ForbiddenError('NOT_PARTICIPANT', 'Nie jesteś stroną tego zlecenia');
      }
      await prisma.$transaction(async (tx) => {
        await transition(tx, orderId, ['IN_PROGRESS', 'DELIVERED'], { status: 'DISPUTED' });
        await emitEvent(tx, 'marketplace.order_disputed', { orderId, raisedBy: userId });
      });
    },

    async myOffers(userId: string) {
      const offers = await prisma.offer.findMany({
        where: { leaderProfile: { userId } },
        include: {
          order: { select: { id: true, title: true, status: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return offers.map((o) => ({
        id: o.id,
        status: o.status,
        proposedBudget: o.proposedBudget,
        createdAt: o.createdAt,
        messagesCount: o._count.messages,
        order: o.order,
      }));
    },

    // --- Wątek przy ofercie (PL1) -------------------------------------------
    //
    // Lustro Inquiry/InquiryMessage z modułu listings. Uczestnicy: członkowie
    // Firmy zlecenia i oferent. Wątek jest ŻYWY, dopóki oferta nie została
    // wycofana/odrzucona, a zlecenie anulowane — po tym zostaje do odczytu.
    // To NIE jest komunikator (ADR-010): nie ma wątku bez oferty.

    async getOfferThread(userId: string, offerId: string) {
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        include: {
          order: { include: { industry: true } },
          leaderProfile: { select: { id: true, userId: true } },
          messages: { orderBy: { createdAt: 'asc' } },
        },
      });
      if (!offer) throw new NotFoundError('Oferta nie istnieje');
      const isLeader = offer.leaderProfile.userId === userId;
      const isCompany = await identity.isCompanyMember(userId, offer.order.companyId);
      if (!isLeader && !isCompany) throw new ForbiddenError();

      const [users, companies] = await Promise.all([
        identity.getPublicUsers([
          ...new Set([offer.leaderProfile.userId, ...offer.messages.map((m) => m.authorId)]),
        ]),
        identity.getPublicCompanies([offer.order.companyId]),
      ]);
      return {
        offer: {
          id: offer.id,
          status: offer.status,
          message: offer.message,
          proposedBudget: offer.proposedBudget,
          proposedDays: offer.proposedDays,
          createdAt: offer.createdAt,
        },
        order: {
          id: offer.order.id,
          title: offer.order.title,
          status: offer.order.status,
          budgetMin: offer.order.budgetMin,
          budgetMax: offer.order.budgetMax,
          industryName: offer.order.industry.name,
          companyId: offer.order.companyId,
          companyName: companies.get(offer.order.companyId)?.name ?? 'Firma',
        },
        leader: {
          profileId: offer.leaderProfile.id,
          displayName: users.get(offer.leaderProfile.userId)?.displayName ?? 'Lider',
        },
        viewer: { isLeader, isCompany },
        canReply: offerThreadOpen(offer.status, offer.order.status),
        messages: offer.messages.map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt,
          authorName: users.get(m.authorId)?.displayName ?? 'Użytkownik',
          isOwn: m.authorId === userId,
        })),
      };
    },

    async addOfferMessage(userId: string, offerId: string, input: OfferMessageInput) {
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        include: { order: true, leaderProfile: { select: { userId: true } } },
      });
      if (!offer) throw new NotFoundError('Oferta nie istnieje');
      const isLeader = offer.leaderProfile.userId === userId;
      const isCompany = await identity.isCompanyMember(userId, offer.order.companyId);
      if (!isLeader && !isCompany) throw new ForbiddenError();
      if (!offerThreadOpen(offer.status, offer.order.status)) {
        throw new InvalidTransitionError('Ta rozmowa jest zamknięta');
      }
      await prisma.$transaction(async (tx) => {
        await tx.offerMessage.create({ data: { offerId, authorId: userId, body: input.body } });
        // GRANICA ANTY-MLM: to zdarzenie konsumuje WYŁĄCZNIE notifications
        // (ladder/subscriptions.test.ts pilnuje, że `message` nie wchodzi
        // do Drabinki). Rozmowa o ofercie nie jest pracą.
        await emitEvent(tx, 'marketplace.offer_message', {
          offerId,
          orderId: offer.orderId,
          orderTitle: offer.order.title,
          authorUserId: userId,
          authorIsLeader: isLeader,
          leaderUserId: offer.leaderProfile.userId,
          companyId: offer.order.companyId,
        });
      });
      return { ok: true };
    },

    // Publiczne API pod antyfraud (ADR-004): czy Lider ma firmę, która
    // zlecała pracę członkom firmy-kontrahenta (wzajemne podbijanie).
    async hasReciprocalRelationship(leaderUserId: string, companyId: string): Promise<boolean> {
      const count = await prisma.order.count({
        where: {
          company: { members: { some: { userId: leaderUserId } } },
          status: { in: ['AWARDED', 'IN_PROGRESS', 'DELIVERED', 'CONFIRMED'] },
          awardedOffer: {
            leaderProfile: { user: { companyMemberships: { some: { companyId } } } },
          },
        },
      });
      return count > 0;
    },

    async myCompanyOrders(userId: string) {
      // Odczyt członkostw przez publiczne API identity byłby tu N+1;
      // filtrowanie po relacji members jest odczytem przez własną relację
      // zlecenia (company należy do zlecenia) — akceptowalny kompromis
      // udokumentowany w ADR-002 (odczyty przez relacje własnych encji).
      const orders = await prisma.order.findMany({
        where: { company: { members: { some: { userId } } } },
        include: { industry: true, _count: { select: { offers: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      const companies = await identity.getPublicCompanies(orders.map((o) => o.companyId));
      return orders.map((o) => ({
        id: o.id,
        title: o.title,
        status: o.status,
        industry: o.industry.name,
        offersCount: o._count.offers,
        companyName: companies.get(o.companyId)?.name ?? 'Firma',
        createdAt: o.createdAt,
      }));
    },

    /** Publiczna historia zleceń Firmy — do jej profilu. Bez szkiców. */
    async listPublicByCompany(companyId: string, limit = 10) {
      const rows = await prisma.order.findMany({
        where: { companyId, publishedAt: { not: null } },
        orderBy: [{ publishedAt: 'desc' }],
        take: limit,
        select: {
          id: true,
          title: true,
          status: true,
          publishedAt: true,
          industry: { select: { name: true } },
        },
      });
      return rows.map((o) => ({
        id: o.id,
        title: o.title,
        status: o.status,
        publishedAt: o.publishedAt,
        industry: o.industry.name,
      }));
    },

    // Analityka (S12) — moduł liczy własną tabelę i oddaje samą liczbę (ADR-002).
    // Po `publishedAt`: zlecenie w szkicu nie jest jeszcze popytem na rynku.
    async countOrdersPublishedBetween(from: Date, to: Date): Promise<number> {
      return prisma.order.count({ where: { publishedAt: { gte: from, lt: to } } });
    },

    // Lejek (PL0): oferta to „pierwsza akcja" Lidera po stronie marketplace —
    // sama LICZBA w oknie, bez danych osoby.
    async countOffersBetween(from: Date, to: Date): Promise<number> {
      return prisma.offer.count({ where: { createdAt: { gte: from, lt: to } } });
    },
  };
}

export type OrdersService = ReturnType<typeof createOrdersService>;
