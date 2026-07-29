import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';

/** Deletes a patient (DELETE /api/patients/[id]) and refreshes every patient list. */
export function useDeletePatient() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patientId: number) => api(`/api/patients/${patientId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients-infinite'] });
    },
  });
}
