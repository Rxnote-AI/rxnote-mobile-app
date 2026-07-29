import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';

interface RespondInput {
  /** The patient the access request is for — notification's `resourceId`. */
  patientId: number;
  /** The pending patientAccessRequests row id — notification's `metadata.requestId`. */
  requestId: number;
  action: 'approved' | 'denied';
}

/** Approve/deny a "request access to patient" request (PUT /api/patients/[id]/access-requests). */
export function useRespondToAccessRequest() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, requestId, action }: RespondInput) =>
      api(`/api/patients/${patientId}/access-requests`, {
        method: 'PUT',
        body: JSON.stringify({ requestId, action }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
