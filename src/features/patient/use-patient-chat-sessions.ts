import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';

export type StoredPatientChatMessage = { role: 'user' | 'assistant'; content: string };

export interface PatientChatSessionSummary {
  id: number;
  profileId: number | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientChatSession extends PatientChatSessionSummary {
  messages: StoredPatientChatMessage[];
}

const KEY = ['patient-chat-sessions'];

export function useSavePatientChatSession() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number | null; profileId: number; title: string; messages: StoredPatientChatMessage[] }) =>
      input.id
        ? api<PatientChatSession>(`/api/patient/chat/sessions/${input.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ messages: input.messages }),
          })
        : api<PatientChatSession>('/api/patient/chat/sessions', {
            method: 'POST',
            body: JSON.stringify({ profileId: input.profileId, title: input.title, messages: input.messages }),
          }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
