import { useChat } from '@ai-sdk/react';
import { useAuth } from '@clerk/clerk-expo';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { useMemo } from 'react';

import { env } from '@/lib/env';

/** Same Patient Copilot endpoint the web dashboard uses (locale-prefixed). */
const COPILOT_URL = `${env.apiBaseUrl}/en/api/copilot`;

/** Flatten the text parts of a UIMessage into a single plain string. */
export function messageText(message: UIMessage): string {
  return message.parts.map((p) => (p.type === 'text' ? p.text : '')).join('');
}

/** True while the assistant is running a server-side tool (records/web search). */
export function isToolRunning(message: UIMessage): boolean {
  return message.parts.some(
    (p) => p.type.startsWith('tool-') || p.type === 'dynamic-tool',
  );
}

/**
 * Drives the "Ask your records" chat against the real Patient Copilot streaming
 * endpoint. RN's global fetch can't read a streaming response body, so we hand the
 * transport `expo/fetch`, and inject a fresh Clerk JWT per request (the copilot route
 * authenticates via `Authorization: Bearer`, same as the rest of the mobile API).
 */
export function useCopilotChat(opts: {
  onFinish?: (messages: UIMessage[]) => void;
  onError?: (error: Error) => void;
}) {
  const { getToken } = useAuth();

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: COPILOT_URL,
        fetch: expoFetch as unknown as typeof globalThis.fetch,
        headers: async (): Promise<Record<string, string>> => {
          const token = await getToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [getToken],
  );

  return useChat<UIMessage>({
    transport,
    onFinish: ({ messages, isError }) => {
      if (!isError) opts.onFinish?.(messages);
    },
    onError: (error) => opts.onError?.(error),
  });
}
