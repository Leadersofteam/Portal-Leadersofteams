// Klient API dla komponentów klienckich — ruch idzie przez rewrites Next
// (same-origin), więc cookies sesyjne działają bez CORS.
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // content-type: application/json TYLKO gdy jest body. Akcje bez body (POST
  // publish/accept/start/…, DELETE) inaczej wywołują w Fastify błąd
  // „Body cannot be empty when content-type is set to 'application/json'".
  // FormData: przeglądarka MUSI sama ustawić multipart boundary — ręczny
  // content-type json po cichu psuje upload (sprawdzona pułapka).
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const hasBody = init?.body != null && !isFormData;
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiRequestError(
      res.status,
      body?.error.code ?? 'UNKNOWN',
      body?.error.message ?? `Błąd ${res.status}`,
    );
  }
  return (await res.json()) as T;
}
