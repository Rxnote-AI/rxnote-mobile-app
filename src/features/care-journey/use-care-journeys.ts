import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';
import type { CareJourneyEntry } from './types';

export function careJourneysKey(patientId: string | number | undefined) {
  return ['care-journeys', String(patientId)];
}

/** Pulls a patient's full care journey timeline, newest first (matches the web query). */
export function useCareJourneys(patientId: string | number | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: careJourneysKey(patientId),
    queryFn: () => api<CareJourneyEntry[]>(`/api/care-journeys?patientId=${patientId}`),
    enabled: Boolean(patientId),
  });
}
