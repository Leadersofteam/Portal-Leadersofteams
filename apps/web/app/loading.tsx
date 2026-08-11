import { Skeleton, SkeletonList } from '@/components/ui/skeleton';

export default function RootLoading() {
  return (
    <main>
      <Skeleton width="34%" height="2.1rem" />
      <div className="mt-2">
        <Skeleton width="60%" height="0.95rem" />
      </div>
      <div className="mt-4">
        <SkeletonList rows={5} />
      </div>
    </main>
  );
}
