/**
 * Kompresja czasu wyprawy — przewija zegar TYLKO kontom wyprawy.
 *
 * Decyzja właściciela 2026-08-22: wyprawa dogfoodingowa przechodzi Drabinkę
 * realnymi ścieżkami serwisu (cykle zleceń, Q&A, anty-fraud aktywny), ale
 * karencja 7 dni i próg „firma ≥14 dni" czynią wspinaczkę wielotygodniową —
 * między „dniami" wyprawy antydatujemy więc znaczniki czasu i uruchamiamy
 * PRAWDZIWE dojrzewanie (`maturePendingPoints` + `recalcUser`), dokładnie tą
 * samą techniką, której używa seed-demo.ts. Reguły nietknięte, czas przewinięty.
 *
 * Co przewija (o N dni wstecz, dla kont z JAWNEJ listy poniżej):
 *  - point_events.createdAt (karencja),
 *  - users.createdAt kont wyprawy (próg „firma młodsza niż 14 dni"),
 *  - companies.createdAt (spójność z powyższym),
 *  - reviews/orders/answers/threads wyprawy (spójność chronologii w UI).
 *
 * Bezpieczniki:
 *  - WYPRAWA_CZAS=1 obowiązkowe; na produkcji dodatkowo WYPRAWA_ALLOW_PRODUCTION=1,
 *  - działa WYŁĄCZNIE na kontach z listy KONTA_WYPRAWY (twarda lista adresów,
 *    lustro wyprawa/KONTA.md) — żadnych wzorców LIKE, żadnych cudzych danych.
 *
 * Uruchomienie (z hosta, jak seed-demo):
 *   WYPRAWA_CZAS=1 WYPRAWA_ALLOW_PRODUCTION=1 DATABASE_URL=... \
 *     pnpm --filter @lot/api exec tsx prisma/wyprawa-czas.ts --dni 7
 */
import { PrismaClient } from '@prisma/client';

import { createLadderService } from '../src/modules/ladder/service';

const KONTA_WYPRAWY = [
  'k.jaworowski@jaworowski-consulting.pl',
  'biuro@kwiatkowscy-wnetrza.pl',
  'kontakt@stalmet-konstrukcje.pl',
  'hello@brandpoint.agency',
  'm.wisniowski@interim-managers.pl',
] as const;

const prisma = new PrismaClient();
const ladder = createLadderService(prisma);

function wymagajFlag(): number {
  if (process.env.WYPRAWA_CZAS !== '1') {
    console.error('Odmowa: ustaw WYPRAWA_CZAS=1 (świadome uruchomienie).');
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production' && process.env.WYPRAWA_ALLOW_PRODUCTION !== '1') {
    console.error('Odmowa: na produkcji wymagane WYPRAWA_ALLOW_PRODUCTION=1.');
    process.exit(1);
  }
  const i = process.argv.indexOf('--dni');
  const dni = i > 0 ? Number(process.argv[i + 1]) : NaN;
  if (!Number.isInteger(dni) || dni < 1 || dni > 60) {
    console.error('Użycie: --dni <1..60>');
    process.exit(1);
  }
  return dni;
}

async function main() {
  const dni = wymagajFlag();

  const users = await prisma.user.findMany({
    where: { email: { in: [...KONTA_WYPRAWY] } },
    select: { id: true, email: true },
  });
  if (users.length === 0) {
    console.error('Brak kont wyprawy w bazie — nic do przewinięcia.');
    process.exit(1);
  }
  const ids = users.map((u) => u.id);
  console.log(`Przewijam zegar o ${dni} dni dla ${users.length} kont wyprawy…`);

  // Surowy UPDATE z arytmetyką dat — Prisma nie ma „kolumna − interwał",
  // a przepisywanie rekord po rekordzie było w seed-demo źródłem rozjazdów.
  // Wszystko w jednej transakcji; identyfikatory to cuidy z własnego SELECT-a.
  const idList = ids.map((id) => `'${id}'`).join(',');
  const wyniki = await prisma.$transaction([
    prisma.$executeRawUnsafe(
      `UPDATE point_events SET createdAt = DATE_SUB(createdAt, INTERVAL ${dni} DAY) WHERE userId IN (${idList})`,
    ),
    prisma.$executeRawUnsafe(
      `UPDATE users SET createdAt = DATE_SUB(createdAt, INTERVAL ${dni} DAY) WHERE id IN (${idList})`,
    ),
    prisma.$executeRawUnsafe(
      `UPDATE companies c JOIN company_members m ON m.companyId = c.id AND m.userId IN (${idList})
       SET c.createdAt = DATE_SUB(c.createdAt, INTERVAL ${dni} DAY)`,
    ),
    prisma.$executeRawUnsafe(
      `UPDATE reviews SET createdAt = DATE_SUB(createdAt, INTERVAL ${dni} DAY),
        publishedAt = IF(publishedAt IS NULL, NULL, DATE_SUB(publishedAt, INTERVAL ${dni} DAY))
       WHERE authorUserId IN (${idList})`,
    ),
    prisma.$executeRawUnsafe(
      `UPDATE orders SET createdAt = DATE_SUB(createdAt, INTERVAL ${dni} DAY),
        publishedAt = IF(publishedAt IS NULL, NULL, DATE_SUB(publishedAt, INTERVAL ${dni} DAY))
       WHERE createdById IN (${idList})`,
    ),
    prisma.$executeRawUnsafe(
      `UPDATE answers SET createdAt = DATE_SUB(createdAt, INTERVAL ${dni} DAY) WHERE authorUserId IN (${idList})`,
    ),
    prisma.$executeRawUnsafe(
      `UPDATE threads SET createdAt = DATE_SUB(createdAt, INTERVAL ${dni} DAY) WHERE authorUserId IN (${idList})`,
    ),
  ]);
  console.log('Zaktualizowane wiersze:', wyniki.join(', '));

  // PRAWDZIWE dojrzewanie i przeliczenie — ta sama ścieżka co worker co 5 min.
  const dojrzale = await ladder.maturePendingPoints();
  console.log(`maturePendingPoints: ${dojrzale} zdarzeń dojrzało.`);

  for (const u of users) {
    const stan = await prisma.ladderState.findUnique({ where: { userId: u.id } });
    if (stan) {
      console.log(
        `  ${u.email}: poziom ${stan.level}, ${stan.totalPoints} pkt ` +
          `(M:${stan.marketplacePoints}/C:${stan.communityPoints})`,
      );
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
