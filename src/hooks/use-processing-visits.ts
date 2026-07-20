import { create } from 'zustand';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import type { VisitStatus } from '@/features/scribe/use-visit-status';

interface ProcessingVisit {
  visitId: number;
  patientName: string;
  patientId: number;
}

interface ProcessingStore {
  visits: ProcessingVisit[];
  add: (v: ProcessingVisit) => void;
  remove: (visitId: number) => void;
}

export const useProcessingStore = create<ProcessingStore>((set) => ({
  visits: [],
  add: (v) =>
    set((s) => ({
      visits: s.visits.some((x) => x.visitId === v.visitId)
        ? s.visits
        : [...s.visits, v],
    })),
  remove: (visitId) => set((s) => ({ visits: s.visits.filter((x) => x.visitId !== visitId) })),
}));

export function useProcessingVisitStatus(visitId: number | null) {
  const api = useApiClient();
  return useQuery<VisitStatus>({
    queryKey: ['visit-status', visitId],
    queryFn: () => api<VisitStatus>(`/api/process-audio-background?visitId=${visitId}`),
    enabled: !!visitId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      const progress = query.state.data?.progress ?? 0;
      if (progress < 30) return 2000;
      if (progress < 70) return 3000;
      return 4000;
    },
    refetchIntervalInBackground: true,
  });
}
