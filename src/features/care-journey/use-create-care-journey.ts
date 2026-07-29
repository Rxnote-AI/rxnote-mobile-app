import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';
import { careJourneysKey } from './use-care-journeys';
import type { CareJourneyEntry, CreateCareJourneyInput } from './types';

export function useCreateCareJourney() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCareJourneyInput) =>
      api<CareJourneyEntry>('/api/care-journeys', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_entry, input) => {
      queryClient.invalidateQueries({ queryKey: careJourneysKey(input.patientId) });
    },
  });
}
