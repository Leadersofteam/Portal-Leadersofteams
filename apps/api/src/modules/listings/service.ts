import { randomBytes } from 'node:crypto';

import type {
  CreateInquiryInput,
  CreateListingInput,
  InquiryMessageInput,
  ListingFilters,
  UpdateListingInput,
} from '@lot/contracts';
import type { Prisma } from '@prisma/client';

import type { PrismaClient } from '../../shared/db';
import { toBooleanQuery } from '../../shared/fulltext';
import {
  DomainError,
  ForbiddenError,
  InvalidTransitionError,
  NotFoundError,
} from '../../shared/errors';
import { emitEvent } from '../../shared/outbox';
import { FRESH_ACCOUNT_LIMITS, enforceFreshAccountQuota } from '../../shared/quota';
import type { Redis } from '../../shared/redis';
import type { IdentityService } from '../identity/index';
import type { OrdersService } from '../marketplace/index';

// Moduł listings — Usługi Liderów (Fiverr-lite). Twarde granice:
// * ceny w pakietach są DEKLARATYWNE (ADR-006) — moduł nie rusza pieniędzy;
// * ŻADNE zdarzenie listings nie jest subskrybowane przez ladder (punkty
//   wyłącznie przez istniejący cykl Order po konwersji zapytania) — pilnuje
//   tego test w modules/ladder/subscriptions.test.ts;
// * kontakt Firma↔Lider wyłącznie w wątku zapytania (bez DM — ADR-010).

const TIER_ORDER = { BASIC: 0, STANDARD: 1, PREMIUM: 2 } as const;

export interface ListingsDeps {
  prisma: PrismaClient;
  identity: Pick<IdentityService, 'isCompanyMember' | 'getPublicUsers' | 'getUserCreatedAt'>;
  orders: Pick<OrdersService, 'createDraft'>;
  files?: { assertOwned(fileId: string, ownerId: string, kind?: string): Promise<void> };
  redis?: Redis;
}

function slugify(title: string): string {
  const map: Record<string, string> = {
    ą: 'a',
    ć: 'c',
    ę: 'e',
    ł: 'l',
    ń: 'n',
    ó: 'o',
    ś: 's',
    ź: 'z',
    ż: 'z',
  };
  const base = title
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (ch) => map[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'usluga'}-${randomBytes(3).toString('hex')}`;
}

function tagSlug(name: string): string {
  return slugify(name).replace(/-[0-9a-f]{6}$/, '');
}

export function createListingsService({ prisma, identity, orders, files, redis }: ListingsDeps) {
  async function requireOwnProfile(userId: string) {
    const profile = await prisma.leaderProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new DomainError(
        'PROFILE_REQUIRED',
        'Najpierw utwórz profil Lidera (wybierz branżę i przedstaw się)',
        400,
      );
    }
    return profile;
  }

  async function requireOwnListing(userId: string, listingId: string) {
    const listing = await prisma.serviceListing.findUnique({
      where: { id: listingId },
      include: { leaderProfile: { select: { userId: true } } },
    });
    if (!listing) throw new NotFoundError('Usługa nie istnieje');
    if (listing.leaderProfile.userId !== userId) throw new ForbiddenError();
    return listing;
  }

  async function requireIndustry(industryId: string) {
    const industry = await prisma.industry.findUnique({ where: { id: industryId } });
    if (!industry) throw new DomainError('UNKNOWN_INDUSTRY', 'Nieznana branża', 400);
  }

  async function syncRelations(
    tx: Prisma.TransactionClient,
    listingId: string,
    ownerId: string,
    input: Pick<CreateListingInput, 'packages' | 'tags' | 'imageFileIds'>,
  ) {
    await tx.listingPackage.deleteMany({ where: { listingId } });
    await tx.listingPackage.createMany({
      data: input.packages.map((p) => ({
        listingId,
        tier: p.tier,
        name: p.name,
        priceDeclared: p.priceDeclared,
        scope: p.scope,
        deliveryDays: p.deliveryDays,
      })),
    });

    await tx.listingTagLink.deleteMany({ where: { listingId } });
    for (const rawName of input.tags) {
      const slug = tagSlug(rawName);
      if (!slug) continue;
      const tag = await tx.tag.upsert({
        where: { slug },
        update: {},
        create: { name: rawName.trim(), slug },
      });
      await tx.listingTagLink.createMany({
        data: [{ listingId, tagId: tag.id }],
        skipDuplicates: true,
      });
    }

    await tx.listingImage.deleteMany({ where: { listingId } });
    if (input.imageFileIds.length > 0) {
      await tx.listingImage.createMany({
        data: input.imageFileIds.map((fileId, i) => ({ listingId, fileId, position: i })),
      });
    }

    const priceFrom = Math.min(...input.packages.map((p) => p.priceDeclared));
    await tx.serviceListing.update({ where: { id: listingId }, data: { priceFrom } });
  }

  async function assertImagesOwned(userId: string, imageFileIds: string[]) {
    if (!files) return;
    for (const fileId of imageFileIds) {
      await files.assertOwned(fileId, userId, 'LISTING');
    }
  }

  function decorate<
    T extends {
      packages: Array<{ tier: 'BASIC' | 'STANDARD' | 'PREMIUM' }>;
      tags: Array<{ tag: { name: string; slug: string } }>;
      images: Array<{ fileId: string; position: number }>;
    },
  >(listing: T) {
    return {
      ...listing,
      packages: [...listing.packages].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]),
      tags: listing.tags.map((t) => t.tag),
      images: [...listing.images].sort((a, b) => a.position - b.position).map((i) => i.fileId),
    };
  }

  const fullInclude = {
    industry: true,
    packages: true,
    images: true,
    tags: { include: { tag: true } },
    leaderProfile: { select: { id: true, userId: true, headline: true, isVisible: true } },
  } satisfies Prisma.ServiceListingInclude;

  return {
    async createDraft(userId: string, input: CreateListingInput) {
      const profile = await requireOwnProfile(userId);
      await requireIndustry(input.industryId);
      await assertImagesOwned(userId, input.imageFileIds);

      const listing = await prisma.$transaction(async (tx) => {
        const created = await tx.serviceListing.create({
          data: {
            leaderProfileId: profile.id,
            industryId: input.industryId,
            title: input.title,
            slug: slugify(input.title),
            description: input.description,
          },
        });
        await syncRelations(tx, created.id, userId, input);
        return created;
      });
      return { id: listing.id, slug: listing.slug };
    },

    async update(userId: string, listingId: string, input: UpdateListingInput) {
      const listing = await requireOwnListing(userId, listingId);
      if (listing.status === 'ARCHIVED') {
        throw new InvalidTransitionError('Zarchiwizowanej usługi nie można edytować');
      }
      if (input.industryId) await requireIndustry(input.industryId);
      if (input.imageFileIds) await assertImagesOwned(userId, input.imageFileIds);

      await prisma.$transaction(async (tx) => {
        await tx.serviceListing.update({
          where: { id: listingId },
          data: {
            ...(input.industryId ? { industryId: input.industryId } : {}),
            ...(input.title ? { title: input.title } : {}),
            ...(input.description ? { description: input.description } : {}),
          },
        });
        if (input.packages || input.tags || input.imageFileIds) {
          const current = await tx.serviceListing.findUniqueOrThrow({
            where: { id: listingId },
            include: { packages: true, tags: { include: { tag: true } }, images: true },
          });
          await syncRelations(tx, listingId, userId, {
            packages:
              input.packages ??
              current.packages.map((p) => ({
                tier: p.tier,
                name: p.name,
                priceDeclared: p.priceDeclared,
                scope: p.scope,
                deliveryDays: p.deliveryDays,
              })),
            tags: input.tags ?? current.tags.map((t) => t.tag.name),
            imageFileIds: input.imageFileIds ?? current.images.map((i) => i.fileId),
          });
        }
      });
      return { id: listingId };
    },

    async publish(userId: string, listingId: string) {
      const listing = await requireOwnListing(userId, listingId);
      if (listing.status !== 'DRAFT' && listing.status !== 'PAUSED') {
        throw new InvalidTransitionError('Publikować można szkic lub wstrzymaną usługę');
      }
      await enforceFreshAccountQuota(
        redis,
        identity.getUserCreatedAt,
        userId,
        FRESH_ACCOUNT_LIMITS.listing_publish,
      );
      await prisma.$transaction(async (tx) => {
        await tx.serviceListing.update({
          where: { id: listingId },
          data: { status: 'PUBLISHED', publishedAt: listing.publishedAt ?? new Date() },
        });
        // Zdarzenie dla powiadomień/feedu (S4) — ladder go NIE subskrybuje.
        await emitEvent(tx, 'marketplace.listing_published', {
          listingId,
          leaderUserId: userId,
          title: listing.title,
        });
      });
      return { id: listingId, status: 'PUBLISHED' as const };
    },

    async pause(userId: string, listingId: string) {
      const listing = await requireOwnListing(userId, listingId);
      if (listing.status !== 'PUBLISHED') {
        throw new InvalidTransitionError('Wstrzymać można tylko opublikowaną usługę');
      }
      await prisma.serviceListing.update({ where: { id: listingId }, data: { status: 'PAUSED' } });
      return { id: listingId, status: 'PAUSED' as const };
    },

    async archive(userId: string, listingId: string) {
      await requireOwnListing(userId, listingId);
      await prisma.serviceListing.update({
        where: { id: listingId },
        data: { status: 'ARCHIVED' },
      });
      return { id: listingId, status: 'ARCHIVED' as const };
    },

    // Publiczny katalog /uslugi: tylko PUBLISHED + widoczne profile.
    async list(filters: ListingFilters) {
      // FULLTEXT jak w orders: surowy MATCH…AGAINST po id (wzorzec loadPublished).
      let fulltextIds: string[] | null = null;
      let likeQ: string | null = null;
      if (filters.q) {
        const expr = toBooleanQuery(filters.q);
        if (expr) {
          const rows = await prisma.$queryRaw<Array<{ id: string }>>`
              SELECT id FROM service_listings
              WHERE MATCH(title, description) AGAINST(${expr} IN BOOLEAN MODE)
                AND status = 'PUBLISHED'
              LIMIT 200`;
          fulltextIds = rows.map((r) => r.id);
          if (fulltextIds.length === 0) return { listings: [], nextCursor: null };
        } else {
          // Fraza krótsza niż próg indeksu — fallback na LIKE po tytule.
          likeQ = filters.q;
        }
      }

      const priceWhere: Prisma.IntFilter | undefined =
        filters.priceMin != null || filters.priceMax != null
          ? {
              ...(filters.priceMin != null ? { gte: filters.priceMin } : {}),
              ...(filters.priceMax != null ? { lte: filters.priceMax } : {}),
            }
          : undefined;

      const where: Prisma.ServiceListingWhereInput = {
        status: 'PUBLISHED',
        leaderProfile: { isVisible: true },
        ...(fulltextIds ? { id: { in: fulltextIds } } : {}),
        ...(likeQ ? { title: { contains: likeQ } } : {}),
        ...(filters.leaderProfileId ? { leaderProfileId: filters.leaderProfileId } : {}),
        ...(filters.industryId ? { industryId: filters.industryId } : {}),
        ...(filters.tag ? { tags: { some: { tag: { slug: filters.tag } } } } : {}),
        ...(priceWhere ? { priceFrom: priceWhere } : {}),
      };

      const orderBy: Prisma.ServiceListingOrderByWithRelationInput[] =
        filters.sort === 'price_asc'
          ? [{ priceFrom: 'asc' }, { id: 'asc' }]
          : filters.sort === 'price_desc'
            ? [{ priceFrom: 'desc' }, { id: 'desc' }]
            : [{ publishedAt: 'desc' }, { id: 'desc' }];

      const rows = await prisma.serviceListing.findMany({
        where,
        include: fullInclude,
        orderBy,
        take: filters.limit + 1,
        ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      });
      const hasMore = rows.length > filters.limit;
      const page = hasMore ? rows.slice(0, filters.limit) : rows;
      return {
        listings: page.map(decorate),
        nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      };
    },

    async getBySlug(slug: string) {
      const listing = await prisma.serviceListing.findUnique({
        where: { slug },
        include: fullInclude,
      });
      if (!listing || listing.status === 'DRAFT' || listing.status === 'ARCHIVED') {
        throw new NotFoundError('Usługa nie istnieje');
      }
      if (!listing.leaderProfile.isVisible) throw new NotFoundError('Usługa nie istnieje');
      return decorate(listing);
    },

    async myListings(userId: string) {
      // Brak profilu Lidera to brak usług, NIE błąd: panel (SSR) odpytuje tę
      // trasę dla każdego zalogowanego, a świeże konto dostawało tu 400
      // (PROFILE_REQUIRED). Bramka profilu zostaje przy tworzeniu (createDraft),
      // gdzie profil jest realnie potrzebny — ten sam wzorzec co listMyInquiries.
      const profile = await prisma.leaderProfile.findUnique({ where: { userId } });
      if (!profile) return [];
      const rows = await prisma.serviceListing.findMany({
        where: { leaderProfileId: profile.id, status: { not: 'ARCHIVED' } },
        include: fullInclude,
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(decorate);
    },

    async setFavorite(userId: string, listingId: string, favorite: boolean) {
      const listing = await prisma.serviceListing.findUnique({ where: { id: listingId } });
      if (!listing) throw new NotFoundError('Usługa nie istnieje');
      if (favorite) {
        await prisma.listingFavorite.createMany({
          data: [{ userId, listingId }],
          skipDuplicates: true,
        });
      } else {
        await prisma.listingFavorite.deleteMany({ where: { userId, listingId } });
      }
      return { listingId, favorite };
    },

    async myFavorites(userId: string) {
      const rows = await prisma.listingFavorite.findMany({
        where: { userId, listing: { status: 'PUBLISHED' } },
        include: { listing: { include: fullInclude } },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map((r) => decorate(r.listing));
    },

    async favoriteIds(userId: string, listingIds: string[]) {
      if (listingIds.length === 0) return new Set<string>();
      const rows = await prisma.listingFavorite.findMany({
        where: { userId, listingId: { in: listingIds } },
        select: { listingId: true },
      });
      return new Set(rows.map((r) => r.listingId));
    },

    // --- Zapytania (Inquiry) ------------------------------------------------

    async createInquiry(userId: string, listingId: string, input: CreateInquiryInput) {
      const listing = await prisma.serviceListing.findUnique({
        where: { id: listingId },
        include: { leaderProfile: { select: { userId: true } } },
      });
      if (!listing || listing.status !== 'PUBLISHED') {
        throw new NotFoundError('Usługa nie istnieje lub nie jest opublikowana');
      }
      if (listing.leaderProfile.userId === userId) {
        throw new DomainError('OWN_LISTING', 'Nie można wysłać zapytania do własnej usługi', 400);
      }
      if (!(await identity.isCompanyMember(userId, input.companyId))) {
        throw new ForbiddenError('NOT_COMPANY_MEMBER', 'Nie należysz do tej firmy');
      }
      await enforceFreshAccountQuota(
        redis,
        identity.getUserCreatedAt,
        userId,
        FRESH_ACCOUNT_LIMITS.inquiry_create,
      );

      const inquiry = await prisma.$transaction(async (tx) => {
        const created = await tx.inquiry.create({
          data: {
            listingId,
            companyId: input.companyId,
            createdById: userId,
            messages: {
              create: {
                authorId: userId,
                body: input.packageTier
                  ? `[pakiet: ${input.packageTier}] ${input.message}`
                  : input.message,
              },
            },
          },
        });
        await emitEvent(tx, 'marketplace.inquiry_created', {
          inquiryId: created.id,
          listingId,
          listingTitle: listing.title,
          leaderUserId: listing.leaderProfile.userId,
          companyId: input.companyId,
        });
        return created;
      });
      return { id: inquiry.id };
    },

    async getInquiry(userId: string, inquiryId: string) {
      const inquiry = await prisma.inquiry.findUnique({
        where: { id: inquiryId },
        include: {
          listing: {
            include: {
              leaderProfile: { select: { userId: true, id: true } },
              packages: true,
            },
          },
          messages: { orderBy: { createdAt: 'asc' } },
        },
      });
      if (!inquiry) throw new NotFoundError('Zapytanie nie istnieje');
      const isLeader = inquiry.listing.leaderProfile.userId === userId;
      const isCompany = await identity.isCompanyMember(userId, inquiry.companyId);
      if (!isLeader && !isCompany) throw new ForbiddenError();

      const authorIds = [...new Set(inquiry.messages.map((m) => m.authorId))];
      const users = await identity.getPublicUsers(authorIds);
      return {
        id: inquiry.id,
        status: inquiry.status,
        convertedOrderId: inquiry.convertedOrderId,
        companyId: inquiry.companyId,
        viewer: { isLeader, isCompany },
        listing: {
          id: inquiry.listing.id,
          slug: inquiry.listing.slug,
          title: inquiry.listing.title,
          industryId: inquiry.listing.industryId,
          packages: [...inquiry.listing.packages].sort(
            (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier],
          ),
        },
        messages: inquiry.messages.map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt,
          authorName: users.get(m.authorId)?.displayName ?? 'Użytkownik',
          isOwn: m.authorId === userId,
        })),
      };
    },

    async listMyInquiries(userId: string) {
      const profile = await prisma.leaderProfile.findUnique({ where: { userId } });
      const [asLeader, asCompany] = await Promise.all([
        profile
          ? prisma.inquiry.findMany({
              where: { listing: { leaderProfileId: profile.id } },
              include: { listing: { select: { title: true, slug: true } } },
              orderBy: { updatedAt: 'desc' },
              take: 100,
            })
          : Promise.resolve([]),
        prisma.inquiry.findMany({
          where: { createdById: userId },
          include: { listing: { select: { title: true, slug: true } } },
          orderBy: { updatedAt: 'desc' },
          take: 100,
        }),
      ]);
      const shape = (rows: typeof asCompany) =>
        rows.map((i) => ({
          id: i.id,
          status: i.status,
          listingTitle: i.listing.title,
          listingSlug: i.listing.slug,
          updatedAt: i.updatedAt,
        }));
      return { asLeader: shape(asLeader), asCompany: shape(asCompany) };
    },

    async addMessage(userId: string, inquiryId: string, input: InquiryMessageInput) {
      const inquiry = await prisma.inquiry.findUnique({
        where: { id: inquiryId },
        include: { listing: { include: { leaderProfile: { select: { userId: true } } } } },
      });
      if (!inquiry) throw new NotFoundError('Zapytanie nie istnieje');
      if (inquiry.status !== 'OPEN') {
        throw new InvalidTransitionError('Wątek jest zamknięty');
      }
      const isLeader = inquiry.listing.leaderProfile.userId === userId;
      const isCompany = await identity.isCompanyMember(userId, inquiry.companyId);
      if (!isLeader && !isCompany) throw new ForbiddenError();

      await prisma.$transaction(async (tx) => {
        await tx.inquiryMessage.create({
          data: { inquiryId, authorId: userId, body: input.body },
        });
        await tx.inquiry.update({ where: { id: inquiryId }, data: { updatedAt: new Date() } });
        await emitEvent(tx, 'marketplace.inquiry_message', {
          inquiryId,
          listingTitle: inquiry.listing.title,
          authorUserId: userId,
          // Adresat: druga strona wątku.
          recipientUserId: isLeader ? inquiry.createdById : inquiry.listing.leaderProfile.userId,
        });
      });
      return { ok: true };
    },

    async closeInquiry(userId: string, inquiryId: string) {
      const inquiry = await prisma.inquiry.findUnique({
        where: { id: inquiryId },
        include: { listing: { include: { leaderProfile: { select: { userId: true } } } } },
      });
      if (!inquiry) throw new NotFoundError('Zapytanie nie istnieje');
      const isLeader = inquiry.listing.leaderProfile.userId === userId;
      const isCompany = await identity.isCompanyMember(userId, inquiry.companyId);
      if (!isLeader && !isCompany) throw new ForbiddenError();
      if (inquiry.status !== 'OPEN') {
        throw new InvalidTransitionError('Wątek nie jest otwarty');
      }
      await prisma.inquiry.update({ where: { id: inquiryId }, data: { status: 'CLOSED' } });
      return { ok: true };
    },

    // Konwersja zapytania w zwykłe zlecenie (DRAFT) — dalej ISTNIEJĄCY cykl
    // życia Order: publish → oferta → realizacja → recenzja → punkty. To jedyna
    // droga, którą usługa prowadzi do punktów Drabinki.
    async convertToOrder(userId: string, inquiryId: string) {
      const inquiry = await prisma.inquiry.findUnique({
        where: { id: inquiryId },
        include: {
          listing: { include: { packages: true } },
          messages: { orderBy: { createdAt: 'asc' }, take: 1 },
        },
      });
      if (!inquiry) throw new NotFoundError('Zapytanie nie istnieje');
      if (!(await identity.isCompanyMember(userId, inquiry.companyId))) {
        throw new ForbiddenError('NOT_COMPANY_MEMBER', 'Konwersji dokonuje Firma');
      }
      if (inquiry.status !== 'OPEN') {
        throw new InvalidTransitionError('Zapytanie zostało już zamknięte lub przekształcone');
      }

      const prices = inquiry.listing.packages.map((p) => p.priceDeclared);
      const budgetMin = prices.length ? Math.min(...prices) : 1;
      const budgetMax = prices.length ? Math.max(...prices) : 1;

      const order = await orders.createDraft(userId, {
        companyId: inquiry.companyId,
        industryId: inquiry.listing.industryId,
        title: inquiry.listing.title,
        description:
          `Zlecenie z zapytania o usługę „${inquiry.listing.title}".\n\n` +
          (inquiry.messages[0]?.body ?? ''),
        budgetMin,
        budgetMax,
        minLevel: 0,
      });

      await prisma.inquiry.update({
        where: { id: inquiryId },
        data: { status: 'CONVERTED', convertedOrderId: order.id },
      });
      return { orderId: order.id };
    },

    /**
     * Najczęściej używane tagi opublikowanych usług.
     *
     * To NIE jest ozdoba katalogu. `innodb_ft_min_token_size` wynosi domyślnie 3,
     * więc frazy „HR", „IT", „AI" NIGDY nie trafią do indeksu FULLTEXT i nie da
     * się ich wyszukać — tagi są jedyną drogą do tych kategorii.
     *
     * Ranking po liczbie użyć jest tu dopuszczalny mimo ADR-010: to podpowiedź
     * NAWIGACYJNA w katalogu usług, a nie kolejność treści w feedzie. Feed
     * pozostaje chronologiczny.
     */
    async getPopularTags(limit = 12) {
      const grouped = await prisma.listingTagLink.groupBy({
        by: ['tagId'],
        where: { listing: { status: 'PUBLISHED' } },
        _count: { tagId: true },
        orderBy: { _count: { tagId: 'desc' } },
        take: limit,
      });
      if (grouped.length === 0) return [];
      const tags = await prisma.tag.findMany({
        where: { id: { in: grouped.map((g) => g.tagId) } },
        select: { id: true, name: true, slug: true },
      });
      const byId = new Map(tags.map((t) => [t.id, t]));
      // Kolejność z groupBy jest tą właściwą — findMany jej nie zachowuje.
      return grouped
        .map((g) => {
          const tag = byId.get(g.tagId);
          return tag ? { name: tag.name, slug: tag.slug, count: g._count.tagId } : null;
        })
        .filter((t): t is { name: string; slug: string; count: number } => t !== null);
    },

    // Analityka (S12) — moduł liczy własną tabelę i oddaje samą liczbę (ADR-002).
    // Po `publishedAt`, nie `createdAt`: szkic, którego nikt nie opublikował,
    // nie jest zdarzeniem na rynku i zawyżałby obraz aktywności.
    async countListingsPublishedBetween(from: Date, to: Date): Promise<number> {
      return prisma.serviceListing.count({ where: { publishedAt: { gte: from, lt: to } } });
    },

    // Lejek (PL0): zapytanie o usługę to „pierwsza akcja" Firmy — sama liczba.
    async countInquiriesBetween(from: Date, to: Date): Promise<number> {
      return prisma.inquiry.count({ where: { createdAt: { gte: from, lt: to } } });
    },
  };
}

export type ListingsService = ReturnType<typeof createListingsService>;
