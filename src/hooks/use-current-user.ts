import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';

interface AppUser {
  id: number;
  email: string;
  name: string | null;
  medicalSpecialty: string | null;
  defaultTemplateId: number | null;
  summaryGeneration: boolean;
  organizationId: string | null;
}

export function useCurrentUser() {
  const api = useApiClient();

  return useQuery<AppUser>({
    queryKey: ['me'],
    queryFn: () => api<AppUser>('/api/me'),
    staleTime: 5 * 60 * 1000,
  });
}
