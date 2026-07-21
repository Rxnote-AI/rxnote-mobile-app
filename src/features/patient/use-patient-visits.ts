import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';
import { uploadPatientVisitAudio } from './upload-visit-audio';
import type { PatientVisit } from './types';

export function usePatientVisits(profileId?: number) {
  const api = useApiClient();
  return useQuery<PatientVisit[]>({
    queryKey: ['patient-visits', profileId ?? 'all'],
    queryFn: () => {
      const qs = profileId ? `?profileId=${profileId}` : '';
      return api<PatientVisit[]>(`/api/patient/visits${qs}`);
    },
  });
}

/**
 * Polls a single visit until AI summary generation reaches a terminal state.
 * Mirrors the clinician `useVisitStatus` polling shape.
 */
export function usePatientVisit(visitId: number | null) {
  const api = useApiClient();
  return useQuery<PatientVisit>({
    queryKey: ['patient-visit', visitId],
    queryFn: () => api<PatientVisit>(`/api/patient/visits/${visitId}`),
    enabled: !!visitId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'completed' || status === 'failed' ? false : 2500;
    },
  });
}

export interface NewPatientVisitInput {
  profileId: number;
  transcriptionText: string;
  audioUri?: string | null;
  language?: string;
  doctorName?: string;
  clinicName?: string;
  visitReason?: string;
}

/**
 * Creates a patient visit (uploading audio first, best-effort) and immediately
 * triggers plain-language summary generation. Returns the created visit.
 */
export function useRecordPatientVisit() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewPatientVisitInput) => {
      const audioFileUrl = input.audioUri
        ? await uploadPatientVisitAudio(api, input.audioUri, input.profileId)
        : null;

      const visit = await api<PatientVisit>('/api/patient/visits', {
        method: 'POST',
        body: JSON.stringify({
          profileId: input.profileId,
          transcriptionText: input.transcriptionText,
          audioFileUrl,
          language: input.language ?? 'en',
          doctorName: input.doctorName,
          clinicName: input.clinicName,
          visitReason: input.visitReason,
        }),
      });

      await api(`/api/patient/visits/${visit.id}/summary`, { method: 'POST' });
      return visit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-visits'] });
    },
  });
}

export function useShareVisitWithDoctor() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visitId: number) =>
      api<PatientVisit>(`/api/patient/visits/${visitId}`, {
        method: 'PATCH',
        body: JSON.stringify({ sharedWithDoctor: true }),
      }),
    onSuccess: (visit) => {
      queryClient.setQueryData(['patient-visit', visit.id], visit);
      queryClient.invalidateQueries({ queryKey: ['patient-visits'] });
    },
  });
}
