import { useChat } from '@ai-sdk/react';
import { useAuth } from '@clerk/clerk-expo';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { useMemo } from 'react';

import { env } from '@/lib/env';

const PATIENT_CHAT_URL = `${env.apiBaseUrl}/en/api/patient/chat`;

export { messageText, isToolRunning } from '@/features/chat/use-copilot-chat';

/**
 * "Ask your records" chat. Unscoped by default: the route hands the model every
 * profile on the account and it works out (or asks) who a question is about.
 * Same transport pattern as the clinician copilot — expo/fetch for streaming
 * response bodies, a fresh Clerk JWT injected per request.
 */
export function usePatientChat(opts: {
  /** Omit to let the agent answer across every profile and disambiguate itself. */
  profileId?: number;
  onFinish?: (messages: UIMessage[]) => void;
  onError?: (error: Error) => void;
}) {
  const { getToken } = useAuth();
  const { profileId } = opts;

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: PATIENT_CHAT_URL,
        fetch: expoFetch as unknown as typeof globalThis.fetch,
        // Omitted when undefined — the route then loads every profile's context.
        body: profileId ? { profileId } : {},
        headers: async (): Promise<Record<string, string>> => {
          const token = await getToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [getToken, profileId],
  );

  return useChat<UIMessage>({
    transport,
    onFinish: ({ messages, isError }) => {
      if (!isError) opts.onFinish?.(messages);
    },
    onError: (error) => opts.onError?.(error),
  });
}
