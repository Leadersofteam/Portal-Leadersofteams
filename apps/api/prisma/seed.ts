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

async function main() {
  for (const industry of INDUSTRIES) {
    await prisma.industry.upsert({
      where: { slug: industry.slug },
      update: { name: industry.name },
      create: industry,
    });
  }
  console.log(`Seed: ${INDUSTRIES.length} branż`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
