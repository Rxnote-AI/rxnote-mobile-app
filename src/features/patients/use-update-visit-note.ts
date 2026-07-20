import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';

interface UpdateNoteInput {
  visitId: number;
  patientId: number;
  noteJson: Record<string, unknown>;
}

export function useUpdateVisitNote() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ visitId, noteJson }: UpdateNoteInput) => {
      return api(`/api/visits/${visitId}`, {
        method: 'PUT',
        body: JSON.stringify({ soapNoteJson: noteJson }),
      });
    },
    onSuccess: (_data, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: ['patient-visits', String(patientId)] });
    },
  });
}
