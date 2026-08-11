/**
 * Szkielety ładowania (shimmer). SkeletonList odwzorowuje rytm .list-row,
 * więc przejście loading → treść nie skacze.
 */
export function Skeleton({
  width,
  height = '1rem',
}: {
  width?: string;
  height?: string;
}) {
  return <span className="skeleton" style={{ display: 'block', width: width ?? '100%', height }} />;
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Ładowanie">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-row">
          <Skeleton width="40%" height="1.1rem" />
          <Skeleton width="70%" height="0.85rem" />
          <Skeleton width="25%" height="0.85rem" />
        </div>
      ))}
    </div>
  );
}
