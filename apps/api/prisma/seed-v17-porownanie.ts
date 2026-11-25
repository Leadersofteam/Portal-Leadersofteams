// Fixture do PORÓWNANIA ekranów V17 „Światło” z makietą (nie dane produktowe).
// Cel: zgodność ma mierzyć kod, a nie dziurę w demo. Po `seed-demo.ts` dokłada:
//  - Lidera Annę Kowalską na L3 (770 pkt: rynek 640 + 100 dojrzewa, społeczność 130 + 50 dojrzewa),
//    z ≥3 realizacjami ocenionymi przez RÓŻNE firmy i 2 uznanymi odpowiedziami;
//  - chronologię, w której pierwsze 8 wpisów strumienia /feed to wszystkie 4 formy
//    (zlecenie, realizacja, pytanie, usługa).
// UWAGA (uczciwość ledgera): wpisy punktowe są wstawiane WPROST jako fixture z oznaczeniem w meta,
// nie przez serwis ladder — to dane testowe wyłącznie dev. Twardo odmawia na NODE_ENV=production
// i bez SEED_V17=1. Uruchomienie: SEED_V17=1 pnpm -C apps/api exec tsx prisma/seed-v17-porownanie.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MIN = 60_000;
const H = 60 * MIN;
const D = 24 * H;
const ago = (ms: number) => new Date(Date.now() - ms);

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.SEED_V17 !== '1') {
    console.error('Odmowa: tylko dev, wymaga SEED_V17=1 i NODE_ENV != production.');
    process.exit(1);
  }
  const anna = await prisma.user.findUnique({
    where: { email: 'lider.anna@demo.leadersofteams.pl' },
  });
  if (!anna) throw new Error('Brak konta demo — najpierw seed:demo.');

  // 1) Drabinka: L3, rynek 640 + społeczność 130 = 770 (próg L4 = 1500, 20% = 300 na ścieżkę).
  await prisma.ladderState.update({
    where: { userId: anna.id },
    data: {
      level: 3,
      marketplacePoints: 640,
      communityPoints: 130,
      totalPoints: 770,
      isLeader: true,
    },
  });
  await prisma.levelAchievement.upsert({
    where: { userId_level: { userId: anna.id, level: 3 } },
    create: { userId: anna.id, level: 3, achievedAt: ago(6 * D) },
    update: {},
  });
  const ev = (
    type: 'ORDER_COMPLETED_RATED' | 'ANSWER_ACCEPTED',
    key: string,
    points: number,
    status: 'CONFIRMED' | 'PENDING',
    when: number,
    why: string,
  ) =>
    prisma.pointEvent.upsert({
      where: { type_sourceId_userId: { type, sourceId: `v17-${key}`, userId: anna.id } },
      create: {
        userId: anna.id,
        type,
        points,
        weightApplied: 1,
        status,
        sourceType: 'V17Fixture',
        sourceId: `v17-${key}`,
        rulesetVersion: 'v1',
        createdAt: ago(when),
        confirmedAt: status === 'CONFIRMED' ? ago(when - 7 * D) : null,
        meta: { explanation: `${why} (fixture porównania V17)` },
      },
      update: {},
    });
  await ev(
    'ORDER_COMPLETED_RATED',
    'r1',
    310,
    'CONFIRMED',
    20 * D,
    'Ocena 5/5 za zlecenie: 100 pkt bazowych',
  );
  await ev(
    'ORDER_COMPLETED_RATED',
    'r2',
    100,
    'PENDING',
    2 * D,
    'Ocena 5/5 za zlecenie: 100 pkt bazowych',
  );
  await ev(
    'ANSWER_ACCEPTED',
    'a1',
    70,
    'CONFIRMED',
    15 * D,
    'Odpowiedź zaakceptowana przez autora: 50 pkt bazowych',
  );
  await ev(
    'ANSWER_ACCEPTED',
    'a2',
    50,
    'PENDING',
    3 * D,
    'Odpowiedź zaakceptowana przez autora: 50 pkt bazowych',
  );

  // 1a) Różne szczeble pozostałych Liderów, żeby pierścienie i odznaki miały co pokazać (jak w makiecie).
  const spread: Record<string, [number, number]> = {
    'lider.marek@demo.leadersofteams.pl': [4, 1720],
    'lider.kasia@demo.leadersofteams.pl': [5, 3300],
    'lider.tomek@demo.leadersofteams.pl': [3, 980],
    'lider.ola@demo.leadersofteams.pl': [6, 6420],
    'lider.piotr@demo.leadersofteams.pl': [2, 390],
  };
  for (const [email, [level, total]] of Object.entries(spread)) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u)
      await prisma.ladderState.update({
        where: { userId: u.id },
        data: {
          level,
          totalPoints: total,
          marketplacePoints: Math.round(total * 0.7),
          communityPoints: total - Math.round(total * 0.7),
        },
      });
  }

  // 1b) Firmy demo „zweryfikowane” (wiersz zaufania zlecenia jak w makiecie).
  await prisma.company.updateMany({
    where: { nip: 'DEMO-SEED' },
    data: { nipVerifiedAt: ago(40 * D) },
  });

  // 2) Dwie uznane odpowiedzi Anny (realne wiersze Answer + wskaźnik w wątku).
  const threads = await prisma.thread.findMany({
    orderBy: { createdAt: 'asc' },
    include: { answers: true },
  });
  let accepted = 0;
  for (const t of threads) {
    if (accepted >= 2) break;
    const other = t.answers.find((a) => a.authorUserId !== t.authorUserId);
    if (!other) continue;
    await prisma.answer.update({
      where: { id: other.id },
      data: { authorUserId: anna.id, isAccepted: true },
    });
    await prisma.thread.update({
      where: { id: t.id },
      data: { acceptedAnswerId: other.id, status: 'ANSWERED' },
    });
    accepted++;
  }

  // 3) Chronologia: pierwsze 8 wpisów /feed = 4 formy, dalej stara historia.
  const orders = await prisma.order.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { id: 'asc' },
  });
  const reviews = await prisma.review.findMany({
    where: { direction: 'COMPANY_TO_LEADER', publishedAt: { not: null } },
    orderBy: { id: 'asc' },
  });
  const listings = await prisma.serviceListing.findMany({ orderBy: { id: 'asc' } });
  const old = (i: number) => ago((30 + i) * D);
  const orderT = [12 * MIN, 1 * D + 3 * H, 4 * D];
  for (const [i, o] of orders.entries())
    await prisma.order.update({
      where: { id: o.id },
      data: { publishedAt: i < 3 ? ago(orderT[i]!) : old(i) },
    });
  const revT = [2 * H, 3 * D];
  for (const [i, r] of reviews.entries())
    await prisma.review.update({
      where: { id: r.id },
      data: { publishedAt: i < 2 ? ago(revT[i]!) : old(i + 5) },
    });
  const thrT = [4 * H, 2 * D];
  for (const [i, t] of threads.entries())
    await prisma.thread.update({
      where: { id: t.id },
      data: { createdAt: i < 2 ? ago(thrT[i]!) : old(i + 10) },
    });
  for (const [i, l] of listings.entries())
    await prisma.serviceListing.update({
      where: { id: l.id },
      data: { publishedAt: i === 0 ? ago(1 * D) : old(i + 15) },
    });
  console.log('Fixture V17 gotowy: Anna L3 770 pkt, odpowiedzi uznane:', accepted);
}

main().finally(() => prisma.$disconnect());
