// Seed DANYCH DEMO na staging (Sprint 4.5). ODDZIELNY od produkcyjnego seed.ts
// (który sieje tylko słowniki + grupy systemowe + poziomy). Ten skrypt zapełnia
// widoki do przeglądu: /zlecenia, /drabinka, /grupy, /watki, /panel/punkty.
//
// Zasady:
//  - IDEMPOTENTNY: najpierw kasuje wcześniejsze dane demo (po markerach: email
//    w domenie demo + nip firmy = DEMO-SEED), potem tworzy od nowa.
//  - ENV-GUARDED: wymaga SEED_DEMO=1 i TWARDO odmawia na NODE_ENV=production —
//    dane demo NIGDY nie trafiają na produkcję.
//  - UCZCIWY LEDGER: punkty Drabinki naliczane przez PRAWDZIWY serwis ladder
//    (handleReviewPublished / handleAnswerAccepted / handleAnswerUpvoted) z
//    wstecznymi znacznikami czasu, a następnie dojrzewane (maturePendingPoints).
//    Żadnego ręcznego wpisywania punktów. Dane zaprojektowane jako legalna
//    aktywność (brak wzajemnej adoracji, rozłożone w czasie) → antyfraud ich nie
//    wstrzymuje. Zdarzenia outbox demo są sprzątane, by worker staging ich nie
//    przetwarzał ponownie (bez duplikatów powiadomień/analiz).
//
// Uruchamianie:  SEED_DEMO=1 pnpm --filter @lot/api exec tsx prisma/seed-demo.ts
//         (lub)  pnpm --filter @lot/api seed:demo
import { PrismaClient } from '@prisma/client';

import { hashPassword } from '../src/modules/identity/password';
import type { ReviewPublishedPayload } from '../src/modules/ladder/service';
import { createLadderService } from '../src/modules/ladder/service';
import { seedSocialLayer } from './seed-demo-social';

const prisma = new PrismaClient();
const ladder = createLadderService(prisma);

const DEMO_EMAIL_DOMAIN = 'demo.leadersofteams.pl';
const DEMO_PASSWORD = 'demo-portal-2026';
const DEMO_COMPANY_NIP = 'DEMO-SEED';
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

// --- definicje person -------------------------------------------------------
interface CompanySpec {
  key: string;
  name: string;
  email: string;
  description: string;
}
interface LeaderSpec {
  key: string;
  name: string;
  email: string;
  industrySlug: string;
  headline: string;
  bio: string;
  portfolio: Array<{ title: string; description: string }>;
}

const COMPANIES: CompanySpec[] = [
  {
    key: 'nordic',
    name: 'Nordic Software House',
    email: `firma.nordic@${DEMO_EMAIL_DOMAIN}`,
    description: 'Software house budujący produkty webowe dla skandynawskich scale-upów.',
  },
  {
    key: 'brandowo',
    name: 'Brandowo Marketing',
    email: `firma.brandowo@${DEMO_EMAIL_DOMAIN}`,
    description: 'Agencja performance marketingu B2B/B2C. Kampanie i analityka.',
  },
  {
    key: 'finteam',
    name: 'FinTeam Sp. z o.o.',
    email: `firma.finteam@${DEMO_EMAIL_DOMAIN}`,
    description: 'Fintech automatyzujący procesy księgowe dla MŚP.',
  },
];

const LEADERS: LeaderSpec[] = [
  {
    key: 'anna',
    name: 'Anna Kowalska',
    email: `lider.anna@${DEMO_EMAIL_DOMAIN}`,
    industrySlug: 'it',
    headline: 'Senior Fullstack & Tech Lead',
    bio: 'Buduję aplikacje webowe end-to-end (TypeScript, Next.js, Node). 8 lat w produktach B2B.',
    portfolio: [
      { title: 'Platforma SaaS do fakturowania', description: 'Architektura i wdrożenie MVP.' },
      { title: 'Migracja monolit → moduły', description: 'Rozbicie legacy bez przestoju.' },
    ],
  },
  {
    key: 'marek',
    name: 'Marek Nowak',
    email: `lider.marek@${DEMO_EMAIL_DOMAIN}`,
    industrySlug: 'ai-automatyzacja',
    headline: 'Inżynier AI / MLOps',
    bio: 'Automatyzacja procesów z LLM i klasyczne ML. Wdrożenia produkcyjne z monitoringiem.',
    portfolio: [
      { title: 'Klasyfikacja dokumentów PL', description: 'Pipeline OCR + model + review.' },
    ],
  },
  {
    key: 'kasia',
    name: 'Kasia Wójcik',
    email: `lider.kasia@${DEMO_EMAIL_DOMAIN}`,
    industrySlug: 'marketing',
    headline: 'Performance Marketing Lead',
    bio: 'Kampanie Google/Meta, atrybucja i optymalizacja lejka. Budżety do 500k/mies.',
    portfolio: [
      { title: 'Skalowanie kampanii e-commerce', description: 'ROAS 3.1 → 5.4 w 2 kwartały.' },
    ],
  },
  {
    key: 'piotr',
    name: 'Piotr Zieliński',
    email: `lider.piotr@${DEMO_EMAIL_DOMAIN}`,
    industrySlug: 'sprzedaz',
    headline: 'B2B Sales Strategist',
    bio: 'Budowa procesów sprzedaży outbound i partnerstw. Od strategii po egzekucję.',
    portfolio: [],
  },
  {
    key: 'ola',
    name: 'Ola Lewandowska',
    email: `lider.ola@${DEMO_EMAIL_DOMAIN}`,
    industrySlug: 'design-ux',
    headline: 'Product Designer (UX/UI)',
    bio: 'Projektowanie produktów cyfrowych: badania, przepływy, design system.',
    portfolio: [
      { title: 'Redesign panelu klienta', description: 'Spadek zgłoszeń supportu o 22%.' },
    ],
  },
  {
    key: 'tomek',
    name: 'Tomek Kaczmarek',
    email: `lider.tomek@${DEMO_EMAIL_DOMAIN}`,
    industrySlug: 'zarzadzanie-projektami',
    headline: 'Delivery / Project Manager',
    bio: 'Prowadzę dostawy oprogramowania w modelu agile. Spinam biznes z zespołem.',
    portfolio: [],
  },
];

async function guard() {
  if (process.env.SEED_DEMO !== '1') {
    throw new Error('seed-demo: ustaw SEED_DEMO=1, aby zasiać dane demo (bezpiecznik).');
  }
  if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO_ALLOW_PRODUCTION !== '1') {
    throw new Error(
      'seed-demo: ODMOWA na produkcji. Świadome uruchomienie wymaga DRUGIEJ flagi: ' +
        'SEED_DEMO_ALLOW_PRODUCTION=1.',
    );
  }
  if (process.env.NODE_ENV === 'production') {
    // DECYZJA WŁAŚCICIELA 2026-08-13: dane demo lądują także na produkcji, żeby
    // portal nie wyglądał na pusty przed pierwszymi realnymi ludźmi. Zgłoszone
    // ryzyko: fikcyjni Liderzy z punktami podważają obietnicę ADR-004 („status
    // trzeba zapracować"), jeśli ktoś to odkryje. Dlatego istnieje `--purge`:
    // decyzja jest w każdej chwili odwracalna jedną komendą.
    console.warn('⚠ seed-demo: PRODUKCJA. Dane demo będą publicznie widoczne.');
    console.warn('  Zdjęcie danych: SEED_DEMO=1 … tsx prisma/seed-demo.ts --purge');
  }
}

async function cleanupPreviousDemo(demoUserIds: string[], demoCompanyIds: string[]) {
  if (demoUserIds.length === 0 && demoCompanyIds.length === 0) return;
  // Kolejność: dzieci → rodzice (część relacji bez ON DELETE CASCADE).
  await prisma.pointEvent.deleteMany({ where: { userId: { in: demoUserIds } } });

  // Zdarzenia outbox demo (PENDING): usuwamy po wystąpieniu cuid usera demo w
  // payloadzie — zapobiega ponownemu przetworzeniu przez workera staging.
  if (demoUserIds.length) {
    const pending = await prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      select: { id: true, payload: true },
    });
    const idSet = new Set(demoUserIds);
    const toDelete = pending
      .filter((row) => {
        const raw = JSON.stringify(row.payload ?? {});
        return demoUserIds.some((id) => raw.includes(id)) || idSet.size === 0;
      })
      .map((row) => row.id);
    if (toDelete.length) await prisma.outboxEvent.deleteMany({ where: { id: { in: toDelete } } });
  }

  // Warstwa społecznościowa (dodana w S16) — PRZED usunięciem kont, bo część
  // relacji nie ma kaskady, a osierocony wpis w feedzie linkowałby w 404.
  await prisma.activityItem.deleteMany({ where: { actorId: { in: demoUserIds } } });
  await prisma.socialComment.deleteMany({ where: { authorUserId: { in: demoUserIds } } });
  await prisma.socialReaction.deleteMany({ where: { userId: { in: demoUserIds } } });
  // Cytaty: zdejmujemy wskazanie, zanim skasujemy cytowane wpisy.
  await prisma.socialPost.updateMany({
    where: { quotedPostId: { not: null }, authorUserId: { in: demoUserIds } },
    data: { quotedPostId: null },
  });
  await prisma.socialPost.deleteMany({ where: { authorUserId: { in: demoUserIds } } });
  await prisma.follow.deleteMany({
    where: { OR: [{ followerId: { in: demoUserIds } }, { followedId: { in: demoUserIds } }] },
  });
  await prisma.post.deleteMany({ where: { authorUserId: { in: demoUserIds } } }); // → comments, reactions
  await prisma.notification.deleteMany({ where: { userId: { in: demoUserIds } } });

  await prisma.thread.deleteMany({ where: { authorUserId: { in: demoUserIds } } }); // → answers, votes
  await prisma.order.deleteMany({
    where: { OR: [{ createdById: { in: demoUserIds } }, { companyId: { in: demoCompanyIds } }] },
  }); // → offers, reviews (cascade)
  await prisma.groupMembership.deleteMany({ where: { userId: { in: demoUserIds } } });
  await prisma.company.deleteMany({ where: { id: { in: demoCompanyIds } } }); // → companyMembers
  await prisma.user.deleteMany({ where: { id: { in: demoUserIds } } }); // → profile, portfolio, itd.
}

async function main() {
  await guard();

  // --- Tryb czyszczenia -----------------------------------------------------
  // Jedna komenda zdejmuje KOMPLET danych demo (markery: domena e-mail + NIP
  // firmy). Istnieje po to, żeby decyzja o danych demo na produkcji była
  // odwracalna w sekundę, a nie żeby ktoś kiedyś kasował je ręcznie po tabelach.
  if (process.argv.includes('--purge')) {
    const users = await prisma.user.findMany({
      where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
      select: { id: true },
    });
    const companies = await prisma.company.findMany({
      where: { nip: DEMO_COMPANY_NIP },
      select: { id: true },
    });
    await cleanupPreviousDemo(
      users.map((u) => u.id),
      companies.map((c) => c.id),
    );
    console.log(`— DANE DEMO USUNIĘTE — konta: ${users.length}, firmy: ${companies.length}`);
    return;
  }

  // Wymagane słowniki/grupy z produkcyjnego seedu.
  const industries = await prisma.industry.findMany();
  const industryBySlug = new Map(industries.map((i) => [i.slug, i]));
  const usedSlugs = new Set([
    ...LEADERS.map((l) => l.industrySlug),
    'it',
    'ai-automatyzacja',
    'marketing',
  ]);
  for (const slug of usedSlugs) {
    if (!industryBySlug.has(slug)) {
      throw new Error(
        `seed-demo: brak branży '${slug}'. Najpierw uruchom bazowy seed (prisma db seed).`,
      );
    }
  }
  const groups = await prisma.group.findMany({ where: { isSystem: true } });
  const groupByIndustryId = new Map(groups.map((g) => [g.industryId ?? '', g]));
  const groupFor = (slug: string) => {
    const ind = industryBySlug.get(slug)!;
    const g = groupByIndustryId.get(ind.id);
    if (!g) throw new Error(`seed-demo: brak grupy systemowej dla '${slug}'. Uruchom bazowy seed.`);
    return g;
  };

  // Sprzątanie poprzedniego przebiegu demo.
  const existingUsers = await prisma.user.findMany({
    where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
    select: { id: true },
  });
  const existingCompanies = await prisma.company.findMany({
    where: { nip: DEMO_COMPANY_NIP },
    select: { id: true },
  });
  await cleanupPreviousDemo(
    existingUsers.map((u) => u.id),
    existingCompanies.map((c) => c.id),
  );

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const accountCreatedAt = daysAgo(60); // konta dojrzałe (kwalifikacja głosów ≥14 dni)

  // --- Firmy + właściciele --------------------------------------------------
  const companyByKey = new Map<string, { companyId: string; ownerUserId: string }>();
  for (const spec of COMPANIES) {
    const owner = await prisma.user.create({
      data: {
        email: spec.email,
        passwordHash,
        displayName: spec.name,
        emailVerifiedAt: accountCreatedAt,
        createdAt: accountCreatedAt,
      },
    });
    const company = await prisma.company.create({
      data: {
        name: spec.name,
        nip: DEMO_COMPANY_NIP,
        description: spec.description,
        createdAt: accountCreatedAt,
      },
    });
    await prisma.companyMember.create({
      data: { companyId: company.id, userId: owner.id, role: 'OWNER', createdAt: accountCreatedAt },
    });
    companyByKey.set(spec.key, { companyId: company.id, ownerUserId: owner.id });
  }

  // --- Liderzy + profile + portfolio ----------------------------------------
  const leaderByKey = new Map<
    string,
    { userId: string; profileId: string; industrySlug: string }
  >();
  for (const spec of LEADERS) {
    const industry = industryBySlug.get(spec.industrySlug)!;
    const user = await prisma.user.create({
      data: {
        email: spec.email,
        passwordHash,
        displayName: spec.name,
        emailVerifiedAt: accountCreatedAt,
        createdAt: accountCreatedAt,
      },
    });
    const profile = await prisma.leaderProfile.create({
      data: {
        userId: user.id,
        industryId: industry.id,
        headline: spec.headline,
        bio: spec.bio,
        createdAt: accountCreatedAt,
        portfolioItems: {
          create: spec.portfolio.map((p) => ({ title: p.title, description: p.description })),
        },
      },
    });
    leaderByKey.set(spec.key, {
      userId: user.id,
      profileId: profile.id,
      industrySlug: spec.industrySlug,
    });
  }

  const leader = (k: string) => leaderByKey.get(k)!;
  const company = (k: string) => companyByKey.get(k)!;

  // --- Członkostwa w grupach (żeby /grupy i Q&A były wypełnione) -------------
  const memberGroups = [
    'it',
    'ai-automatyzacja',
    'marketing',
    'design-ux',
    'sprzedaz',
    'zarzadzanie-projektami',
  ];
  const allMemberUserIds = [
    ...[...leaderByKey.values()].map((l) => l.userId),
    ...[...companyByKey.values()].map((c) => c.ownerUserId),
  ];
  for (const slug of memberGroups) {
    const g = groupFor(slug);
    for (const userId of allMemberUserIds) {
      await prisma.groupMembership.upsert({
        where: { groupId_userId: { groupId: g.id, userId } },
        update: {},
        create: { groupId: g.id, userId, status: 'ACTIVE', createdAt: accountCreatedAt },
      });
    }
  }

  // --- Zlecenia OTWARTE (listing /zlecenia) z ofertami SUBMITTED -------------
  interface OpenOrderSpec {
    companyKey: string;
    industrySlug: string;
    title: string;
    description: string;
    budgetMin: number;
    budgetMax: number;
    minLevel: number;
    publishedDaysAgo: number;
    offerLeaderKeys: string[];
  }
  const OPEN_ORDERS: OpenOrderSpec[] = [
    {
      companyKey: 'nordic',
      industrySlug: 'it',
      title: 'Aplikacja webowa do zarządzania zleceniami (Next.js)',
      description:
        'Szukamy Lidera do zbudowania panelu SaaS: autoryzacja, CRUD zleceń, role, powiadomienia. Stack: Next.js + Node + MySQL.',
      budgetMin: 8000,
      budgetMax: 15000,
      minLevel: 1,
      publishedDaysAgo: 5,
      offerLeaderKeys: ['anna', 'tomek'],
    },
    {
      companyKey: 'brandowo',
      industrySlug: 'marketing',
      title: 'Kampania performance na Q3 (Google/Meta)',
      description: 'Planowanie i egzekucja kampanii lead-gen, atrybucja, raportowanie tygodniowe.',
      budgetMin: 5000,
      budgetMax: 12000,
      minLevel: 0,
      publishedDaysAgo: 3,
      offerLeaderKeys: ['kasia'],
    },
    {
      companyKey: 'finteam',
      industrySlug: 'ai-automatyzacja',
      title: 'Automatyzacja procesów księgowych (AI)',
      description:
        'Klasyfikacja i ekstrakcja danych z dokumentów, integracja z systemem księgowym.',
      budgetMin: 10000,
      budgetMax: 25000,
      minLevel: 2,
      publishedDaysAgo: 2,
      offerLeaderKeys: ['marek'],
    },
    {
      companyKey: 'nordic',
      industrySlug: 'design-ux',
      title: 'Redesign panelu klienta',
      description: 'Audyt UX, nowe przepływy, komponenty i prototyp klikalny.',
      budgetMin: 6000,
      budgetMax: 10000,
      minLevel: 1,
      publishedDaysAgo: 1,
      offerLeaderKeys: ['ola'],
    },
  ];
  for (const spec of OPEN_ORDERS) {
    const ind = industryBySlug.get(spec.industrySlug)!;
    const c = company(spec.companyKey);
    const publishedAt = daysAgo(spec.publishedDaysAgo);
    const order = await prisma.order.create({
      data: {
        companyId: c.companyId,
        createdById: c.ownerUserId,
        industryId: ind.id,
        title: spec.title,
        description: spec.description,
        budgetMin: spec.budgetMin,
        budgetMax: spec.budgetMax,
        minLevel: spec.minLevel,
        status: 'PUBLISHED',
        publishedAt,
        createdAt: publishedAt,
      },
    });
    for (const lk of spec.offerLeaderKeys) {
      await prisma.offer.create({
        data: {
          orderId: order.id,
          leaderProfileId: leader(lk).profileId,
          message: `Chętnie zrealizuję to zlecenie — mam doświadczenie w podobnych projektach. (${leader(lk).industrySlug})`,
          proposedBudget: Math.round((spec.budgetMin + spec.budgetMax) / 2),
          proposedDays: 30,
          status: 'SUBMITTED',
          createdAt: publishedAt,
        },
      });
    }
  }

  // --- Zlecenia ZAKOŃCZONE → oceny → punkty marketplace ---------------------
  // reviewDaysAgo ≥ 8 (dojrzewanie 7 dni). Kolejność wywołań ladder od
  // najstarszych, by malejące zwroty liczyły się poprawnie.
  interface DoneOrderSpec {
    companyKey: string;
    leaderKey: string;
    industrySlug: string;
    title: string;
    rating: number; // ocena Firmy dla Lidera (COMPANY_TO_LEADER)
    leaderRating: number; // ocena Lidera dla Firmy (druga strona)
    reviewDaysAgo: number;
  }
  const DONE_ORDERS: DoneOrderSpec[] = [
    {
      companyKey: 'nordic',
      leaderKey: 'anna',
      industrySlug: 'it',
      title: 'Portal ofert wewnętrznych',
      rating: 5,
      leaderRating: 5,
      reviewDaysAgo: 40,
    },
    {
      companyKey: 'brandowo',
      leaderKey: 'anna',
      industrySlug: 'it',
      title: 'Integracja API płatności',
      rating: 5,
      leaderRating: 4,
      reviewDaysAgo: 33,
    },
    {
      companyKey: 'finteam',
      leaderKey: 'anna',
      industrySlug: 'it',
      title: 'Dashboard analityczny',
      rating: 4,
      leaderRating: 5,
      reviewDaysAgo: 26,
    },
    {
      companyKey: 'nordic',
      leaderKey: 'anna',
      industrySlug: 'it',
      title: 'Moduł raportów (druga współpraca)',
      rating: 5,
      leaderRating: 5,
      reviewDaysAgo: 19,
    },
    {
      companyKey: 'nordic',
      leaderKey: 'marek',
      industrySlug: 'ai-automatyzacja',
      title: 'Model rekomendacji',
      rating: 5,
      leaderRating: 5,
      reviewDaysAgo: 38,
    },
    {
      companyKey: 'brandowo',
      leaderKey: 'marek',
      industrySlug: 'ai-automatyzacja',
      title: 'Automatyzacja raportów',
      rating: 4,
      leaderRating: 4,
      reviewDaysAgo: 30,
    },
    {
      companyKey: 'brandowo',
      leaderKey: 'kasia',
      industrySlug: 'marketing',
      title: 'Kampania świąteczna',
      rating: 5,
      leaderRating: 5,
      reviewDaysAgo: 22,
    },
    {
      companyKey: 'finteam',
      leaderKey: 'piotr',
      industrySlug: 'sprzedaz',
      title: 'Proces outbound B2B',
      rating: 4,
      leaderRating: 4,
      reviewDaysAgo: 15,
    },
    {
      companyKey: 'nordic',
      leaderKey: 'ola',
      industrySlug: 'design-ux',
      title: 'Design system v1',
      rating: 5,
      leaderRating: 5,
      reviewDaysAgo: 12,
    },
    {
      companyKey: 'brandowo',
      leaderKey: 'tomek',
      industrySlug: 'zarzadzanie-projektami',
      title: 'Koordynacja wdrożenia',
      rating: 4,
      leaderRating: 5,
      reviewDaysAgo: 11,
    },
  ];
  // sort rosnąco po wieku wstecznym => od najstarszych do najnowszych
  DONE_ORDERS.sort((a, b) => b.reviewDaysAgo - a.reviewDaysAgo);
  for (const spec of DONE_ORDERS) {
    const ind = industryBySlug.get(spec.industrySlug)!;
    const c = company(spec.companyKey);
    const l = leader(spec.leaderKey);
    const reviewAt = daysAgo(spec.reviewDaysAgo);
    const createdAt = daysAgo(spec.reviewDaysAgo + 20);
    const order = await prisma.order.create({
      data: {
        companyId: c.companyId,
        createdById: c.ownerUserId,
        industryId: ind.id,
        title: spec.title,
        description: `Zrealizowane zlecenie: ${spec.title}. Zakończone i ocenione obustronnie.`,
        budgetMin: 5000,
        budgetMax: 12000,
        minLevel: 0,
        status: 'CONFIRMED',
        publishedAt: createdAt,
        createdAt,
      },
    });
    const offer = await prisma.offer.create({
      data: {
        orderId: order.id,
        leaderProfileId: l.profileId,
        message: 'Zrealizowane zgodnie z zakresem.',
        proposedBudget: 9000,
        proposedDays: 21,
        status: 'ACCEPTED',
        createdAt,
      },
    });
    await prisma.order.update({ where: { id: order.id }, data: { awardedOfferId: offer.id } });

    // Ocena Firma → Lider (punktowana) + Lider → Firma (druga strona).
    const companyToLeader = await prisma.review.create({
      data: {
        orderId: order.id,
        direction: 'COMPANY_TO_LEADER',
        authorUserId: c.ownerUserId,
        rating: spec.rating,
        comment:
          spec.rating >= 5
            ? 'Świetna współpraca, polecam!'
            : 'Solidna realizacja, wszystko na czas.',
        subjectLeaderUserId: l.userId,
        createdAt: reviewAt,
        publishedAt: reviewAt,
      },
    });
    await prisma.review.create({
      data: {
        orderId: order.id,
        direction: 'LEADER_TO_COMPANY',
        authorUserId: l.userId,
        rating: spec.leaderRating,
        comment: 'Konkretny brief i sprawna komunikacja.',
        subjectCompanyId: c.companyId,
        createdAt: reviewAt,
        publishedAt: reviewAt,
      },
    });

    const payload: ReviewPublishedPayload = {
      reviewId: companyToLeader.id,
      orderId: order.id,
      direction: 'COMPANY_TO_LEADER',
      rating: spec.rating,
      authorUserId: c.ownerUserId,
      leaderUserId: l.userId,
      companyId: c.companyId,
      companyCreatedAt: accountCreatedAt.toISOString(),
      publishedAt: reviewAt.toISOString(),
    };
    await ladder.handleReviewPublished(payload, reviewAt);
  }

  // --- Q&A / mentoring → punkty community -----------------------------------
  // Każdy wątek: autor pytania, odpowiedzi, akceptacja i/lub głosy. Zdarzenia
  // rozłożone na różne dni (bez wzajemnej adoracji) → antyfraud nie wstrzymuje.
  async function seedThread(args: {
    industrySlug: string;
    askerUserId: string;
    title: string;
    body: string;
    createdDaysAgo: number;
    answers: Array<{ leaderKey: string; body: string; accepted?: boolean; acceptDaysAgo?: number }>;
    votes?: Array<{ answerLeaderKey: string; voterUserId: string; voteDaysAgo: number }>;
  }) {
    const g = groupFor(args.industrySlug);
    const thread = await prisma.thread.create({
      data: {
        groupId: g.id,
        authorUserId: args.askerUserId,
        title: args.title,
        body: args.body,
        createdAt: daysAgo(args.createdDaysAgo),
      },
    });
    const answerIdByLeader = new Map<string, string>();
    for (const a of args.answers) {
      const l = leader(a.leaderKey);
      const answer = await prisma.answer.create({
        data: {
          threadId: thread.id,
          authorUserId: l.userId,
          body: a.body,
          createdAt: daysAgo(args.createdDaysAgo - 1),
        },
      });
      answerIdByLeader.set(a.leaderKey, answer.id);
      if (a.accepted) {
        const acceptAt = daysAgo(a.acceptDaysAgo ?? args.createdDaysAgo - 2);
        await prisma.answer.update({ where: { id: answer.id }, data: { isAccepted: true } });
        await prisma.thread.update({
          where: { id: thread.id },
          data: { status: 'ANSWERED', acceptedAnswerId: answer.id },
        });
        await ladder.handleAnswerAccepted(
          {
            answerId: answer.id,
            answerAuthorUserId: l.userId,
            questionAuthorUserId: args.askerUserId,
            groupId: g.id,
          },
          acceptAt,
        );
      }
    }
    for (const v of args.votes ?? []) {
      const answerId = answerIdByLeader.get(v.answerLeaderKey);
      const l = leader(v.answerLeaderKey);
      if (!answerId) continue;
      const voteAt = daysAgo(v.voteDaysAgo);
      const vote = await prisma.answerVote.create({
        data: { answerId, userId: v.voterUserId, createdAt: voteAt },
      });
      // Aktywność wyborcy (wątki + odpowiedzi) — jak w community.service.
      const [threads, answers] = await Promise.all([
        prisma.thread.count({ where: { authorUserId: v.voterUserId } }),
        prisma.answer.count({ where: { authorUserId: v.voterUserId } }),
      ]);
      await ladder.handleAnswerUpvoted(
        {
          voteId: vote.id,
          answerId,
          answerAuthorUserId: l.userId,
          voterUserId: v.voterUserId,
          groupId: g.id,
          voterAccountCreatedAt: accountCreatedAt.toISOString(),
          voterActivityCount: threads + answers,
        },
        voteAt,
      );
    }
  }

  await seedThread({
    industrySlug: 'it',
    askerUserId: company('nordic').ownerUserId,
    title: 'Jak wersjonować API przy częstych zmianach kontraktu?',
    body: 'Mamy kilku klientów na różnych wersjach. Jak prowadzicie wersjonowanie i deprecację endpointów?',
    createdDaysAgo: 29,
    answers: [
      {
        leaderKey: 'anna',
        body: 'Semver na kontrakcie + nagłówek wersji, deprecacja z oknem 2 wydań i changelogiem.',
        accepted: true,
        acceptDaysAgo: 27,
      },
      {
        leaderKey: 'tomek',
        body: 'U nas sprawdza się osobny pakiet contracts i testy kontraktowe w CI.',
      },
    ],
    // Wyborca (Tomek) ma już własną odpowiedź w tym wątku → głos KWALIFIKOWANY.
    votes: [{ answerLeaderKey: 'anna', voterUserId: leader('tomek').userId, voteDaysAgo: 26 }],
  });

  await seedThread({
    industrySlug: 'marketing',
    askerUserId: company('brandowo').ownerUserId,
    title: 'Atrybucja w kampaniach cross-channel — jak liczycie?',
    body: 'Meta vs Google vs organic. Model last-click zafałszowuje. Co stosujecie w praktyce?',
    createdDaysAgo: 21,
    answers: [
      {
        leaderKey: 'kasia',
        body: 'Data-driven w GA4 + kontrola przez geo-lift testy raz na kwartał.',
        accepted: true,
        acceptDaysAgo: 20,
      },
    ],
  });

  await seedThread({
    industrySlug: 'ai-automatyzacja',
    askerUserId: leader('piotr').userId,
    title: 'Które modele do klasyfikacji dokumentów PL?',
    body: 'Faktury i umowy po polsku. Zależy mi na jakości ekstrakcji pól. Open-source czy API?',
    createdDaysAgo: 18,
    answers: [
      {
        leaderKey: 'marek',
        body: 'Dla PL: layout-aware model + reguły na polach krytycznych. API tylko na fallback.',
        accepted: true,
        acceptDaysAgo: 16,
      },
    ],
    votes: [{ answerLeaderKey: 'marek', voterUserId: leader('anna').userId, voteDaysAgo: 15 }],
  });

  await seedThread({
    industrySlug: 'ai-automatyzacja',
    askerUserId: company('finteam').ownerUserId,
    title: 'Bezpieczeństwo danych przy automatyzacji księgowości?',
    body: 'Przetwarzamy dane finansowe klientów. Jak podchodzicie do retencji i dostępu?',
    createdDaysAgo: 12,
    answers: [
      {
        leaderKey: 'marek',
        body: 'Szyfrowanie w spoczynku, minimalizacja danych, pełny audit log dostępu.',
      },
    ],
    votes: [{ answerLeaderKey: 'marek', voterUserId: leader('tomek').userId, voteDaysAgo: 10 }],
  });

  await seedThread({
    industrySlug: 'it',
    askerUserId: company('nordic').ownerUserId,
    title: 'Monorepo czy polyrepo dla 3 aplikacji?',
    body: 'Web, API, worker. Chcemy współdzielić typy. Co się sprawdza przy małym zespole?',
    createdDaysAgo: 9,
    answers: [
      {
        leaderKey: 'tomek',
        body: 'Monorepo pnpm + współdzielony pakiet kontraktów. Prostsze wydania i spójność typów.',
        accepted: true,
        acceptDaysAgo: 8,
      },
    ],
  });

  // --- Dojrzewanie punktów → projekcja poziomów -----------------------------
  const matured = await ladder.maturePendingPoints(new Date());

  // --- Sprzątanie zdarzeń outbox demo (żeby worker staging ich nie mielił) ---
  const freshDemoUsers = await prisma.user.findMany({
    where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
    select: { id: true },
  });
  const freshIds = freshDemoUsers.map((u) => u.id);
  const pending = await prisma.outboxEvent.findMany({
    where: { status: 'PENDING' },
    select: { id: true, payload: true },
  });
  const outboxToDelete = pending
    .filter((row) => {
      const raw = JSON.stringify(row.payload ?? {});
      return freshIds.some((id) => raw.includes(id));
    })
    .map((row) => row.id);
  if (outboxToDelete.length) {
    await prisma.outboxEvent.deleteMany({ where: { id: { in: outboxToDelete } } });
  }

  // --- Raport ---------------------------------------------------------------
  const states = await prisma.ladderState.findMany({
    where: { userId: { in: [...leaderByKey.values()].map((l) => l.userId) } },
    orderBy: { totalPoints: 'desc' },
  });
  const nameByUserId = new Map(
    (await prisma.user.findMany({ where: { id: { in: states.map((s) => s.userId) } } })).map(
      (u) => [u.id, u.displayName],
    ),
  );
  console.log('— DANE DEMO zasiane —');
  console.log(`Firmy: ${COMPANIES.length} · Liderzy: ${LEADERS.length}`);
  // --- Usługi (Fiverr-lite, Sprint 3): po jednej dla kilku Liderów ----------
  const DEMO_LISTINGS: Array<{
    leaderKey: string;
    title: string;
    description: string;
    tags: string[];
    packages: Array<{
      tier: 'BASIC' | 'STANDARD' | 'PREMIUM';
      name: string;
      price: number;
      scope: string;
      days: number;
    }>;
  }> = [];
  let listingIdx = 0;
  for (const [key, l] of leaderByKey) {
    listingIdx += 1;
    if (listingIdx > 6) break;
    DEMO_LISTINGS.push({
      leaderKey: key,
      title: `Sprint doradczy: diagnoza i plan działań (${l.industrySlug})`,
      description:
        'Tygodniowy sprint doradczy: audyt obecnej sytuacji, warsztat z zespołem i plan działań na 90 dni. ' +
        'Pracuję na Waszych danych i procesach — kończymy konkretną listą kroków z priorytetami.',
      tags: ['doradztwo', l.industrySlug],
      packages: [
        {
          tier: 'BASIC',
          name: 'Diagnoza',
          price: 1900 + listingIdx * 100,
          scope: 'Audyt + raport z rekomendacjami (do 10 stron).',
          days: 7,
        },
        {
          tier: 'STANDARD',
          name: 'Diagnoza + warsztat',
          price: 3900 + listingIdx * 100,
          scope: 'Audyt, warsztat 4h z zespołem i plan 90 dni.',
          days: 14,
        },
      ],
    });
  }
  for (const spec of DEMO_LISTINGS) {
    const l = leader(spec.leaderKey);
    const slugBase = spec.title
      .toLowerCase()
      .replace(
        /[ąćęłńóśźż]/g,
        (ch) =>
          ({ ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' })[ch] ?? ch,
      )
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    const listing = await prisma.serviceListing.create({
      data: {
        leaderProfileId: l.profileId,
        industryId: (await prisma.leaderProfile.findUniqueOrThrow({ where: { id: l.profileId } }))
          .industryId,
        title: spec.title,
        slug: `${slugBase}-${l.profileId.slice(-6)}`,
        description: spec.description,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        priceFrom: Math.min(...spec.packages.map((p) => p.price)),
        packages: {
          create: spec.packages.map((p) => ({
            tier: p.tier,
            name: p.name,
            priceDeclared: p.price,
            scope: p.scope,
            deliveryDays: p.days,
          })),
        },
      },
    });
    for (const tagName of spec.tags) {
      const tagSlugValue = tagName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (!tagSlugValue) continue;
      const tag = await prisma.tag.upsert({
        where: { slug: tagSlugValue },
        update: {},
        create: { name: tagName, slug: tagSlugValue },
      });
      await prisma.listingTagLink.createMany({
        data: [{ listingId: listing.id, tagId: tag.id }],
        skipDuplicates: true,
      });
    }
  }
  console.log(`Usługi demo: ${DEMO_LISTINGS.length}`);

  // --- Warstwa społecznościowa (S16) ---------------------------------------
  // Wpisy, posty w grupach, obserwowanie i obrazy. Bez tego feed i grupy
  // zostawały puste nawet przy „pełnych" danych demo, bo ten seed powstał
  // przed modułem `social`.
  const socialStats = await seedSocialLayer(
    prisma,
    [...leaderByKey.entries()].map(([key, l]) => ({
      key,
      userId: l.userId,
      displayName: nameByUserId.get(l.userId) ?? key,
      industrySlug: l.industrySlug,
    })),
    { uploadsDir: process.env.UPLOADS_DIR ?? './uploads' },
  );
  console.log(
    `Wpisy portalowe: ${socialStats.posts} (obrazy: ${socialStats.images}) · ` +
      `posty w grupach: ${socialStats.groupPosts} · obserwowania: ${socialStats.follows}`,
  );

  console.log(`Zlecenia otwarte: ${OPEN_ORDERS.length} · zakończone: ${DONE_ORDERS.length}`);
  console.log(
    `Punkty dojrzałe (CONFIRMED): ${matured} · usunięto zdarzeń outbox demo: ${outboxToDelete.length}`,
  );
  console.log('Poziomy Liderów:');
  for (const s of states) {
    console.log(
      `  ${nameByUserId.get(s.userId)}: L${s.level} · total ${s.totalPoints} (marketplace ${s.marketplacePoints} / community ${s.communityPoints})`,
    );
  }
  console.log(`Konta demo — hasło dla wszystkich: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
