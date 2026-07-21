import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';
import type { PatientAppointment } from './types';

export function usePatientAppointments(profileId?: number) {
  const api = useApiClient();
  return useQuery<PatientAppointment[]>({
    queryKey: ['patient-appointments', profileId ?? 'all'],
    queryFn: () => {
      const qs = profileId ? `?profileId=${profileId}` : '';
      return api<PatientAppointment[]>(`/api/patient/appointments${qs}`);
    },
  });
}

export interface NewPatientAppointmentInput {
  profileId: number;
  title: string;
  scheduledAt: string; // ISO
  doctorName?: string;
  doctorSpecialty?: string;
  clinicName?: string;
  clinicAddress?: string;
  purpose?: string;
}

export function useCreatePatientAppointment() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewPatientAppointmentInput) =>
      api<PatientAppointment>('/api/patient/appointments', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient-appointments'] }),
  });
}

/** Single appointment, for the appointment-detail screen. */
export function usePatientAppointment(appointmentId: number | null) {
  const api = useApiClient();
  return useQuery<PatientAppointment>({
    queryKey: ['patient-appointment', appointmentId],
    queryFn: () => api<PatientAppointment>(`/api/patient/appointments/${appointmentId}`),
    enabled: !!appointmentId,
  });
}
