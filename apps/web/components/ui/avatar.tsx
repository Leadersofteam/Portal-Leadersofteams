/**
 * Awatar z inicjałami (fallback bez zdjęcia — upload dojdzie w module files).
 * `src` zacznie działać od Sprintu 2 bez zmian w miejscach użycia.
 */
export function Avatar({
  name,
  src,
  size,
}: {
  name: string;
  src?: string | null;
  size?: 'sm' | 'lg';
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <span className={size ? `avatar ${size}` : 'avatar'} aria-hidden="true">
      {src ? (
        // Zwykły <img>: pliki serwuje własne API (moduł files), bez optymalizatora Next.
        <img src={src} alt="" />
      ) : (
        initials || '•'
      )}
    </span>
  );
}
