import { credentialCard, levelColor, OG_SIZE } from '@/lib/og';
import { serverApi } from '@/lib/server-api';

export const alt = 'Wpis w Leaders of Teams';
export const size = OG_SIZE;
export const contentType = 'image/png';

interface Data {
  post: {
    body: string;
    author: { displayName: string; level: number };
  };
}

const clip = (s: string, n = 120) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await serverApi<Data>(`/social/posts/${id}`).catch(() => null);
  const post = data?.post;

  return credentialCard({
    kicker: 'Wpis · Leaders of Teams',
    // Treść wpisu JEST tytułem karty — to jedyny typ, który sam w sobie jest treścią.
    title: post ? clip(post.body) : 'Wpis w społeczności Liderów',
    subtitle: post?.author.displayName,
    chips: post?.author.level
      ? [{ label: `Poziom ${post.author.level} w Drabince`, color: levelColor(post.author.level) }]
      : [],
  });
}
