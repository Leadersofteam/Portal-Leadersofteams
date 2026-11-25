// Szkielet TYLKO dla listy: grupa (lista) trzyma loading.tsx z dala od [id]/[slug].
// Loading nad stroną szczegółów streamuje powłokę z 200, zanim notFound() zdąży
// ustawić 404 — tak martwe linki zwracały 200 (MINY 25.11). Nie przenoś wyżej.
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
