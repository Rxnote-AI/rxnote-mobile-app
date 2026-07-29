import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';
import { careJourneysKey } from './use-care-journeys';

interface DeleteArgs {
  id: number;
  patientId: number;
}

export function useDeleteCareJourney() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: DeleteArgs) => api(`/api/care-journeys/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: careJourneysKey(patientId) });
    },
  });
}
