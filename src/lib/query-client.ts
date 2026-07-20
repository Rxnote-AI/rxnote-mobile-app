import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

export const queryClient = new QueryClient({
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
