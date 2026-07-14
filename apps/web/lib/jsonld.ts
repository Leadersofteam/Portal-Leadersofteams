// Buildery structured data (schema.org / JSON-LD) dla publicznych stron — dają
// rich results w Google (Q&A, oceny, oferty pracy). Czysto prezentacyjne: żadnych
// danych prywatnych, tylko to, co i tak jest publiczne na stronie.
import { SITE_URL } from '@/app/layout';

type Json = Record<string, unknown>;

export function organizationJsonLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Leaders of Teams',
    url: SITE_URL,
    description:
      'Marketplace usług B2B, społeczność mentoringowa i Drabinka Lidera — status zdobywany realną pracą i mentoringiem.',
  };
}

export function websiteJsonLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Leaders of Teams',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/liderzy?q={query}`,
      'query-input': 'required name=query',
    },
  };
}

export function leaderProfileJsonLd(p: {
  id: string;
  displayName: string;
  headline: string;
  bio: string | null;
  level: number;
  averageRating: number | null;
  reviewCount: number;
  industryName: string;
}): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.displayName,
    url: `${SITE_URL}/liderzy/${p.id}`,
    jobTitle: p.headline,
    description: p.bio ?? p.headline,
    knowsAbout: p.industryName,
    ...(p.reviewCount > 0 && p.averageRating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: p.averageRating,
            reviewCount: p.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

export function orderJsonLd(o: {
  id: string;
  title: string;
  description: string;
  industryName: string;
  budgetMin: number;
  budgetMax: number;
  companyName: string;
  publishedAt: string | null;
}): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: o.title,
    description: o.description,
    datePosted: o.publishedAt ?? undefined,
    industry: o.industryName,
    employmentType: 'CONTRACTOR',
    hiringOrganization: { '@type': 'Organization', name: o.companyName },
    url: `${SITE_URL}/zlecenia/${o.id}`,
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'PLN',
      value: {
        '@type': 'QuantitativeValue',
        minValue: o.budgetMin,
        maxValue: o.budgetMax,
        unitText: 'PROJECT',
      },
    },
  };
}

export function threadQaJsonLd(t: {
  id: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  answers: Array<{ body: string; authorName: string; votesCount: number; isAccepted: boolean }>;
}): Json {
  const toAnswer = (a: (typeof t.answers)[number]) => ({
    '@type': 'Answer',
    text: a.body,
    upvoteCount: a.votesCount,
    author: { '@type': 'Person', name: a.authorName },
  });
  const accepted = t.answers.find((a) => a.isAccepted);
  const suggested = t.answers.filter((a) => !a.isAccepted);
  return {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: t.title,
      text: t.body,
      answerCount: t.answers.length,
      dateCreated: t.createdAt,
      author: { '@type': 'Person', name: t.authorName },
      ...(accepted ? { acceptedAnswer: toAnswer(accepted) } : {}),
      ...(suggested.length ? { suggestedAnswer: suggested.map(toAnswer) } : {}),
    },
  };
}
