import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';
import { careJourneysKey } from './use-care-journeys';
import type { CareJourneyEntry, UpdateCareJourneyInput } from './types';

interface UpdateArgs {
  id: number;
  patientId: number;
  updates: UpdateCareJourneyInput;
}

export function useUpdateCareJourney() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: UpdateArgs) =>
      api<CareJourneyEntry>(`/api/care-journeys/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    onSuccess: (_entry, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: careJourneysKey(patientId) });
    },
  });
}
