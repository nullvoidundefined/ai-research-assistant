const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

let csrfToken: string | null = null;

async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const res = await fetch(`${API_URL}/api/csrf-token`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch CSRF token');
  const data = await res.json();
  csrfToken = data.token as string;
  return csrfToken;
}

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const method = options?.method ?? 'GET';

  for (let attempt = 0; attempt < 2; attempt++) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(options?.headers as Record<string, string>),
    };

    if (STATE_CHANGING_METHODS.has(method)) {
      headers['X-CSRF-Token'] = await ensureCsrfToken();
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    });

    if (!res.ok) {
      if (res.status === 403) {
        csrfToken = null;
        if (attempt === 0) continue;
      }
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error ?? `HTTP ${res.status}`);
    }

    return res.json();
  }
  throw new Error('CSRF validation failed');
}

export { API_URL };
