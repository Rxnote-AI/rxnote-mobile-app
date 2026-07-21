import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';
import type { PatientProfile, PatientProfileType } from './types';

export function usePatientProfiles(enabled = true) {
  const api = useApiClient();
  return useQuery<PatientProfile[]>({
    queryKey: ['patient-profiles'],
    queryFn: () => api<PatientProfile[]>('/api/patient/profiles'),
    enabled,
  });
}

export interface NewPatientProfileInput {
  profileType: PatientProfileType;
  name: string;
  relationship?: string;
  dateOfBirth?: string;
  sex?: string;
  species?: string;
}

export function useCreatePatientProfile() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewPatientProfileInput) =>
      api<PatientProfile>('/api/patient/profiles', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient-profiles'] }),
  });
}

export function useDeletePatientProfile() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/api/patient/profiles/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient-profiles'] }),
  });
}
