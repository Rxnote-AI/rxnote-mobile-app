import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';
import type { Visit } from './types';

/** Pulls a patient's existing visits / notes. */
export function usePatientVisits(patientId: string | number | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['patient-visits', String(patientId)],
    queryFn: () => api<Visit[]>(`/api/patients/${patientId}/visits`),
    enabled: Boolean(patientId),
  });
}
