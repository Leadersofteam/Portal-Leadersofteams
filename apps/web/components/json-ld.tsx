// Wstrzykuje structured data JSON-LD do strony (schema.org). Dane pochodzą z
// serwera (publiczne), więc dangerouslySetInnerHTML jest tu bezpieczne.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
