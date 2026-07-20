import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';

export type ProcessingStatus =
  | 'pending'
  | 'processing'
  | 'transcribing'
  | 'generating-soap'
  | 'completed'
  | 'failed';

export interface VisitStatus {
  visitId: number;
  status: ProcessingStatus;
  progress: number;
  currentStep?: string;
  errorMessage?: string;
  hasTranscription: boolean;
  hasSoapNote: boolean;
  transcription?: string | null;
  soapNote?: string | null;
  soapNoteJson?: unknown;
  audioFileUrl?: string | null;
}

/**
 * Polls the server for background processing progress.
 * Stops polling once the visit reaches a terminal state (completed/failed).
 */
export function useVisitStatus(visitId: number | null) {
  const api = useApiClient();

  return useQuery<VisitStatus>({
    queryKey: ['visit-status', visitId],
    queryFn: () =>
      api<VisitStatus>(`/api/process-audio-background?visitId=${visitId}`),
    enabled: !!visitId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      // Poll faster initially, slow down as processing continues
      const progress = query.state.data?.progress ?? 0;
      if (progress < 30) return 2000;
      if (progress < 70) return 3000;
      return 4000;
    },
    refetchIntervalInBackground: true,
  });
}
