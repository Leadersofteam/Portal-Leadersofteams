import { credentialCard, OG_SIZE, levelColor } from '@/lib/og';
import { serverApi } from '@/lib/server-api';

export const alt = 'Pytanie Q&A — Leaders of Teams';
export const size = OG_SIZE;
export const contentType = 'image/png';

interface Data {
  thread: { title: string; authorName: string; acceptedAnswerId: string | null };
  answers: Array<{ id: string }>;
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await serverApi<Data>(`/threads/${id}`).catch(() => null);

  return credentialCard({
    kicker: 'Pytanie do Liderów · Q&A',
    title: data?.thread.title ?? 'Pytanie do Liderów',
    subtitle: data ? `pyta ${data.thread.authorName}` : undefined,
    chips: data
      ? [
          { label: `${data.answers.length} odpowiedzi` },
          ...(data.thread.acceptedAnswerId
            ? [{ label: '✓ Rozwiązane', color: levelColor(7) }]
            : [{ label: 'Czeka na najlepszą odpowiedź' }]),
        ]
      : [],
  });
}
