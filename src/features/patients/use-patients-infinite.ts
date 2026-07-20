import { useInfiniteQuery } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';
import type { PatientsResponse } from './types';

const PAGE_SIZE = 20;

/**
 * Paginated patients for the browse/search screen — loads 20 at a time via
 * `useInfiniteQuery` (server-side search + pagination, same endpoint as the web).
 * Never fetches the whole list up front.
 */
export function usePatientsInfinite(search = '') {
  const api = useApiClient();
  const trimmed = search.trim();

  return useInfiniteQuery({
    queryKey: ['patients-infinite', { search: trimmed }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        scope: 'mine',
        page: String(pageParam),
        limit: String(PAGE_SIZE),
      });
      if (trimmed) params.set('search', trimmed);
      return api<PatientsResponse>(`/api/patients?${params.toString()}`);
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
  });
}
