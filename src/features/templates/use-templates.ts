import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';

export interface Template {
  id: number;
  name: string;
  description: string | null;
  category: string;
  isSystem: boolean;
}

/** Templates available to the clinician (system + own + org). */
export function useTemplates() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await api<Template[] | { templates: Template[] }>('/api/templates');
      return Array.isArray(res) ? res : (res?.templates ?? []);
    },
  });
}
