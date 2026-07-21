import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, useApiClient } from '@/lib/api-client';
import type { PatientAccount } from './types';

/**
 * Ensures the signed-in Clerk patient user has a `patient_accounts` row,
 * creating one (and its "self" profile) on first use. Mirrors the web's
 * sync-user pattern but for the patient persona.
 */
export function usePatientAccount() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  const query = useQuery<PatientAccount>({
    queryKey: ['patient-account'],
    queryFn: () => api<PatientAccount>('/api/patient/account'),
    retry: (failureCount, error) => (error instanceof ApiError && error.status === 404 ? false : failureCount < 2),
  });

  const ensure = useMutation({
    mutationFn: () => api<PatientAccount>('/api/patient/account', { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: (account) => {
      queryClient.setQueryData(['patient-account'], account);
      queryClient.invalidateQueries({ queryKey: ['patient-profiles'] });
    },
  });

  const notFound = query.error instanceof ApiError && query.error.status === 404;

  useEffect(() => {
    if (notFound && !ensure.isPending && !ensure.isSuccess) {
      ensure.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notFound]);

  return {
    account: query.data ?? ensure.data ?? null,
    isLoading: query.isLoading || ensure.isPending,
    error: notFound ? null : query.error,
  };
}
