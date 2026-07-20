import { useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';

import { env } from './env';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Authenticated fetch against the existing Next.js API.
 * Attaches the Clerk session JWT as `Authorization: Bearer <jwt>` — the backend
 * accepts this and returns JSON `401 {code:"AUTH_REQUIRED"}` on expiry.
 * See docs/MOBILE_APP_PLAN.md Appendix B.
 */
// Locale-scoped API routes live under app/[locale]/api. Hitting them WITHOUT a locale
// (`/api/...`) triggers a 307 redirect to `/en/api/...`, and RN's fetch drops the
// Authorization header across redirects → 401. Mobile is English-only, so prefix `/en`
// and hit the route directly.
const LOCALE = 'en';

function resolveUrl(path: string): string {
  if (path.startsWith('/api/')) return `${env.apiBaseUrl}/${LOCALE}${path}`;
  return `${env.apiBaseUrl}${path}`;
}

export function useApiClient() {
  const { getToken } = useAuth();

  return useCallback(
    async <T = unknown>(path: string, init?: RequestInit): Promise<T> => {
      const token = await getToken();
      const res = await fetch(resolveUrl(path), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init?.headers,
        },
      });

      if (!res.ok) {
        let code: string | undefined;
        let message = res.statusText;
        try {
          const body = await res.json();
          code = body?.code;
          message = body?.message ?? message;
        } catch {
          // non-JSON error body
        }
        throw new ApiError(res.status, code, message);
      }

      // 204 / empty body
      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    },
    [getToken],
  );
}
