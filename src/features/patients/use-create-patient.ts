import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';
import type { Patient } from './types';

export interface NewPatientInput {
  name: string;
  age?: number;
  sex?: string;
  phone?: string;
}

/** Creates a patient (POST /api/patients) and refreshes the patient list. */
export function useCreatePatient() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewPatientInput) =>
      api<Patient>('/api/patients', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patients'] }),
  });
}
