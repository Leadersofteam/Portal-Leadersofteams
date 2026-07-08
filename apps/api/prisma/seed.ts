// Seed słowników: startowe branże (ADR-010: kuratorowana lista sektorów).
// Uruchamianie: pnpm --filter @lot/api exec prisma db seed
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INDUSTRIES: Array<{ name: string; slug: string }> = [
  { name: 'IT i programowanie', slug: 'it' },
  { name: 'AI i automatyzacja', slug: 'ai-automatyzacja' },
  { name: 'Marketing', slug: 'marketing' },
  { name: 'Sprzedaż', slug: 'sprzedaz' },
  { name: 'Zarządzanie projektami', slug: 'zarzadzanie-projektami' },
  { name: 'E-commerce', slug: 'e-commerce' },
  { name: 'Finanse i księgowość', slug: 'finanse' },
  { name: 'HR i rekrutacja', slug: 'hr' },
  { name: 'Design i UX', slug: 'design-ux' },
  { name: 'Produkcja i logistyka', slug: 'produkcja-logistyka' },
];

// Definicje poziomów trzymane w kodzie (modules/ladder/rules.ts) i lustrzanie
// w DB — do audytu i publicznego endpointu GET /ladder/levels.
import { LEVELS, RULESET_VERSION } from '../src/modules/ladder/rules';

async function main() {
  for (const industry of INDUSTRIES) {
    await prisma.industry.upsert({
      where: { slug: industry.slug },
      update: { name: industry.name },
      create: industry,
    });
  }

  // Grupy systemowe (ADR-010 dec. 1): jedna otwarta grupa branżowa na sektor ze
  // słownika — kuratorowana lista startowa „portalu jak Facebook". Właścicielem
  // jest platforma (createdById = null, isSystem = true). Aktywność w tych
  // grupach NIE generuje punktów Drabinki (anty-MLM, ADR-010 dec. 4).
  let createdGroups = 0;
  for (const industry of INDUSTRIES) {
    const record = await prisma.industry.findUnique({ where: { slug: industry.slug } });
    if (!record) continue;
    const existing = await prisma.group.findFirst({
      where: { industryId: record.id, isSystem: true },
    });
    if (!existing) {
      await prisma.group.create({
        data: {
          name: industry.name,
          description: `Grupa branżowa: ${industry.name}. Dyskusje, case studies i pomysły.`,
          industryId: record.id,
          type: 'OPEN',
          isSystem: true,
        },
      });
      createdGroups++;
    }
  }

  for (const rule of LEVELS) {
    await prisma.levelDefinition.upsert({
      where: { rulesetVersion_level: { rulesetVersion: RULESET_VERSION, level: rule.level } },
      update: {
        name: rule.name,
        pointsRequired: rule.pointsRequired,
        minPathSharePct: rule.minPathSharePct,
        unlocksAppAccess: rule.unlocksAppAccess,
        unlocksTeamCreation: rule.unlocksTeamCreation,
      },
      create: { rulesetVersion: RULESET_VERSION, ...rule },
    });
  }
  console.log(
    `Seed: ${INDUSTRIES.length} branż, ${createdGroups} nowych grup systemowych, ${LEVELS.length} poziomów (${RULESET_VERSION})`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
