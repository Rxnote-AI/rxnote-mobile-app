import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';

export function useMarkAllNotificationsRead() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api('/api/notifications/mark-all-read', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
