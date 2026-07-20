import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';

/** Wire shape stored in `chat_sessions.messages` (matches the web copilot). */
export type StoredChatMessage = { role: 'user' | 'assistant'; content: string };

export interface ChatSessionSummary {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSession extends ChatSessionSummary {
  messages: StoredChatMessage[];
}

const KEY = ['chat-sessions'];

/** Recent threads for the signed-in doctor (latest 50, newest first). */
export function useChatSessions() {
  const api = useApiClient();
  return useQuery({
    queryKey: KEY,
    queryFn: () => api<ChatSessionSummary[]>('/api/chat-sessions'),
  });
}

/** Full transcript of one thread — fetched on demand when a thread is opened. */
export function useChatSession(id: number | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: [...KEY, id],
    enabled: id != null,
    queryFn: () => api<ChatSession>(`/api/chat-sessions/${id}`),
  });
}

/**
 * Create-or-update a thread. Pass `id: null` for the first save of a new thread
 * (POST → returns the new id); pass the id thereafter (PATCH the message list).
 */
export function useSaveChatSession() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number | null; title: string; messages: StoredChatMessage[] }) =>
      input.id
        ? api<ChatSession>(`/api/chat-sessions/${input.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ messages: input.messages }),
          })
        : api<ChatSession>('/api/chat-sessions', {
            method: 'POST',
            body: JSON.stringify({ title: input.title, messages: input.messages }),
          }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteChatSession() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api<{ success: boolean }>(`/api/chat-sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
