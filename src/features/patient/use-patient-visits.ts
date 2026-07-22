import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';
import { uploadVisitAudioInBackground } from './upload-visit-audio';
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
 * Creates a patient visit from the captured transcript and immediately triggers
 * plain-language summary generation, then returns the visit so the UI can
 * navigate straight to the (polling) summary screen.
 *
 * The audio upload is deliberately deferred to the background and NOT awaited:
 * the summary is generated from the transcript, so it must not wait on a
 * multi-MB S3 upload. Ordering matters — create the visit and kick off the
 * summary FIRST (both are fast), then upload the audio and attach it via PATCH
 * afterwards. This is what keeps "Save note" near-instant and stops a slow or
 * failed upload from ever blocking summary generation.
 */
export function useRecordPatientVisit() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewPatientVisitInput) => {
      // 1. Create the visit with the transcript (fast). Status → "processing".
      const visit = await api<PatientVisit>('/api/patient/visits', {
        method: 'POST',
        body: JSON.stringify({
          profileId: input.profileId,
          transcriptionText: input.transcriptionText,
          language: input.language ?? 'en',
          doctorName: input.doctorName,
          clinicName: input.clinicName,
          visitReason: input.visitReason,
        }),
      });

      // 2. Kick off summary generation immediately — it needs only the transcript.
      await api(`/api/patient/visits/${visit.id}/summary`, { method: 'POST' });

      // 3. Upload the audio in the background and attach it once done. Not
      //    awaited: navigation and the summary must not wait on the upload.
      if (input.audioUri) {
        uploadVisitAudioInBackground(api, input.audioUri, input.profileId, visit.id, () => {
          queryClient.invalidateQueries({ queryKey: ['patient-visit', visit.id] });
        });
      }

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
