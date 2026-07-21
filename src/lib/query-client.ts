import { MutationCache, QueryCache, QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

import { showToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api-client';

/**
 * Turns an unknown thrown value into something worth showing a patient.
 * Server messages are surfaced as the secondary line — they're written for
 * humans (e.g. "Patient account not found") and help support diagnose reports.
 */
function describe(error: unknown): { message: string; detail?: string } {
  if (error instanceof ApiError) {
    if (error.status === 401) return { message: 'Your session expired. Please sign in again.' };
    if (error.status === 403) return { message: "You don't have access to that." };
    if (error.status === 404) return { message: 'That item could no longer be found.' };
    if (error.status === 409) return { message: 'That conflicts with an existing record.', detail: error.message };
    if (error.status >= 500) return { message: 'The server had a problem. Please try again.', detail: error.message };
    return { message: error.message || 'Something went wrong.' };
  }
  const raw = error instanceof Error ? error.message : String(error ?? '');
  // RN surfaces connectivity failures as a bare "Network request failed".
  if (/network request failed|fetch failed/i.test(raw)) {
    return { message: 'No connection. Check your internet and try again.' };
  }
  return { message: 'Something went wrong.', detail: raw || undefined };
}

export const queryClient = new QueryClient({
  // Central error surfacing: every query/mutation failure raises a toast, so a
  // hook without its own onError can no longer fail silently. A call that wants
  // bespoke handling can still set `meta: { silent: true }`.
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.silent) return;
      const { message, detail } = describe(error);
      showToast({ message, detail, kind: 'error' });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.meta?.silent) return;
      const { message, detail } = describe(error);
      showToast({ message, detail, kind: 'error' });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      // With focusManager wired to AppState below, "focus" = app returning to the
      // foreground — so queries (patients, visits, processing status) refetch when
      // the user reopens the app after processing continued on the server.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

// Bridge React Native's AppState to React Query's focus tracking. Returning to the
// foreground marks queries focused → stale ones refetch, so the home + patient
// screens show notes that finished processing while the app was closed/backgrounded.
AppState.addEventListener('change', (status: AppStateStatus) => {
  focusManager.setFocused(status === 'active');
});

// Treat the app as always "online" unless we wire NetInfo later; React Query's
// default reconnect handling still applies.
onlineManager.setOnline(true);
