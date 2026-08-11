import { Skeleton, SkeletonList } from '@/components/ui/skeleton';

export default function OrdersLoading() {
  return (
    <main>
      <Skeleton width="22%" height="2.1rem" />
      <div className="mt-2">
        <Skeleton width="55%" height="0.95rem" />
      </div>
      <div className="mt-3">
        <Skeleton width="100%" height="5.2rem" />
      </div>
      <div className="mt-2">
        <SkeletonList rows={6} />
      </div>
    </main>
  );
}
