import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';

export interface PatientDoctorSuggestion {
  name: string;
  source: 'care_circle' | 'past_visit';
  clinicName?: string | null;
  email?: string | null;
}

/**
 * Doctors already connected to this patient account (care circle + past visits).
 * Autocomplete only — the field stays free-text so a new doctor can always be named.
 */
export function usePatientDoctors(query = '') {
  const api = useApiClient();
  return useQuery<PatientDoctorSuggestion[]>({
    queryKey: ['patient-doctors'],
    queryFn: () => api<PatientDoctorSuggestion[]>('/api/patient/doctors'),
    staleTime: 5 * 60 * 1000,
    select: (all) => {
      const q = query.trim().toLowerCase();
      return q ? all.filter((d) => d.name.toLowerCase().includes(q)) : all;
    },
  });
}
