import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';

export function useMarkNotificationRead() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api(`/api/notifications/${id}`, { method: 'PATCH', body: JSON.stringify({ isRead: true }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
