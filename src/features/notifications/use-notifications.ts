import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';
import type { NotificationsResponse } from './types';

/**
 * Polls the notification center every 30s (matches the web app's `notification-bell`
 * cadence exactly) — good enough for an in-app center; there's no push infrastructure
 * anywhere in this stack yet (not even on web), so this is the pragmatic v1.
 * Shared query key: mounting this from both the Home screen (badge) and the
 * notifications screen (list) dedupes to a single active poll, not two.
 */
export function useNotifications() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<NotificationsResponse>('/api/notifications?limit=50'),
    refetchInterval: 30_000,
  });
}
