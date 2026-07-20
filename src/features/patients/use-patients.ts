import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';
import type { PatientsResponse } from './types';

/**
 * Pulls the signed-in clinician's existing patients from the backend.
 * `scope=mine` returns the doctor's own patients (matches the web default).
 */
export function usePatients(search = '') {
  const api = useApiClient();
  const trimmed = search.trim();

  return useQuery({
    queryKey: ['patients', { search: trimmed }],
    queryFn: () => {
      const params = new URLSearchParams({ scope: 'mine', limit: '50' });
      if (trimmed) params.set('search', trimmed);
      return api<PatientsResponse>(`/api/patients?${params.toString()}`);
    },
  });
}
