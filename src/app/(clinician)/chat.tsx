import { Ionicons } from '@expo/vector-icons';
import type { UIMessage } from 'ai';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AttachmentDialog, type AttachmentSource } from '@/components/ui/attachment-dialog';
import { ChatComposer } from '@/components/ui/chat-composer';
import { ChatHistorySheet } from '@/components/ui/chat-history-sheet';
import { Markdown } from '@/components/ui/markdown';
import { Text } from '@/components/ui/text';
import { VoiceOverlay } from '@/components/ui/voice-overlay';
import {
  AttachmentTooLargeError,
  pickCameraAttachment,
  pickDocumentAttachment,
  pickImageAttachment,
  type ChatAttachment,
} from '@/features/chat/attachments';
import { isToolRunning, messageText, useCopilotChat } from '@/features/chat/use-copilot-chat';
import {
  useChatSession,
  useSaveChatSession,
  type StoredChatMessage,
} from '@/features/chat/use-chat-sessions';
import { useVoiceInput } from '@/features/chat/use-voice-input';
import { useApiClient } from '@/lib/api-client';
import { useKeyboardVisible } from '@/hooks/use-keyboard';
import { rx } from '@/theme/rx';

const SUGGESTIONS = [
  'Summarize my most recent patient’s history',
  'Which of my patients have a penicillin allergy?',
  'What did I prescribe at the last visit?',
  'Any patients due for a follow-up this week?',
];

/** How many file parts a user message carries (shown as a small attachment note). */
function fileCount(m: UIMessage): number {
  return m.parts.filter((p) => p.type === 'file').length;
}

export default function ChatScreen() {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [attachVisible, setAttachVisible] = useState(false);
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [loadId, setLoadId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const sessionIdRef = useRef<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const keyboardVisible = useKeyboardVisible();

  const api = useApiClient();
  const getSonioxKey = useCallback(async () => {
    const res = await api<{ apiKey: string }>('/api/soniox-token?language=en');
    return res.apiKey;
  }, [api]);
  const voice = useVoiceInput(getSonioxKey);

  const save = useSaveChatSession();

  // Persist the whole thread after each finished turn (POST first, then PATCH).
  const persist = useCallback(
    (all: UIMessage[]) => {
      const stored: StoredChatMessage[] = all
        .map((m) => ({
          role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: messageText(m).trim(),
        }))
        .filter((m) => m.content.length > 0);
      if (stored.length === 0) return;
      const title = stored.find((m) => m.role === 'user')?.content.slice(0, 60) ?? 'New chat';
      save.mutate(
        { id: sessionIdRef.current, title, messages: stored },
        {
          onSuccess: (s) => {
            sessionIdRef.current = s.id;
            setSessionId(s.id);
          },
        },
      );
    },
    [save],
  );

  const { messages, sendMessage, status, stop, setMessages, error } = useCopilotChat({
    onFinish: persist,
  });

  const streaming = status === 'submitted' || status === 'streaming';

  // Load a saved thread when one is picked from the history sheet.
  const { data: loaded } = useChatSession(loadId);
  useEffect(() => {
    if (loadId == null || !loaded || loaded.id !== loadId) return;
    setMessages(
      loaded.messages.map((m, i) => ({
        id: `hist-${loaded.id}-${i}`,
        role: m.role,
        parts: [{ type: 'text' as const, text: m.content }],
      })),
    );
    sessionIdRef.current = loaded.id;
    setSessionId(loaded.id);
    setLoadId(null);
    setHistoryVisible(false);
  }, [loadId, loaded, setMessages]);

  const addAttachment = async (pick: () => Promise<ChatAttachment | null>) => {
    try {
      const att = await pick();
      if (att) setAttachments((a) => [...a, att]);
    } catch (e) {
      Alert.alert(
        'Could not attach',
        e instanceof AttachmentTooLargeError ? e.message : 'Please try another file.',
      );
    }
  };

  const handlePickSource = (source: AttachmentSource) => {
    setAttachVisible(false);
    const pick =
      source === 'camera'
        ? pickCameraAttachment
        : source === 'library'
          ? pickImageAttachment
          : pickDocumentAttachment;
    // Defer so the sheet finishes dismissing before the picker opens (avoids a
    // modal-over-modal race on both platforms).
    setTimeout(() => addAttachment(pick), 250);
  };

  const openVoice = () => {
    setVoiceVisible(true);
    voice.start();
  };

  const finishVoice = async () => {
    const text = await voice.stop();
    setVoiceVisible(false);
    if (text) setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
  };

  const cancelVoice = async () => {
    await voice.stop();
    setVoiceVisible(false);
  };

  const send = () => {
    if (streaming) return;
    const text = input.trim();
    if (!text && attachments.length === 0) return;
    const files = attachments.map((a) => ({
      type: 'file' as const,
      mediaType: a.mediaType,
      url: a.url,
      filename: a.name,
    }));
    setInput('');
    setAttachments([]);
    if (files.length > 0) {
      sendMessage({ text: text || 'Please review the attached file(s).', files });
    } else {
      sendMessage({ text });
    }
  };

  const newChat = () => {
    if (streaming) stop();
    setMessages([]);
    setSessionId(null);
    sessionIdRef.current = null;
    setInput('');
    setAttachments([]);
    setHistoryVisible(false);
  };

  const empty = messages.length === 0;
  const last = messages[messages.length - 1];
  const waitingForReply =
    streaming && (!last || last.role !== 'assistant' || messageText(last).trim().length === 0);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-[#EEEDE9] px-5 pb-[14px] pt-2">
        <View className="min-w-0 flex-1 pr-3">
          <Text weight="extrabold" numberOfLines={1} className="text-[22px] tracking-tight text-rx-ink">
            Ask your records
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setHistoryVisible(true)}
            accessibilityLabel="Chat history"
            className="h-10 w-10 items-center justify-center rounded-full border border-rx-line bg-rx-surface active:opacity-80"
          >
            <Ionicons name="time-outline" size={20} color={rx.ink} />
          </Pressable>
          <Pressable
            onPress={newChat}
            accessibilityLabel="New chat"
            className="h-10 w-10 items-center justify-center rounded-full border border-rx-line bg-rx-surface active:opacity-80"
          >
            <Ionicons name="create-outline" size={19} color={rx.ink} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior="padding" keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 }}
        >
          {empty ? (
            <View>
              <View className="items-center px-2 pb-[26px] pt-[18px]">
                <View className="mb-4 h-14 w-14 items-center justify-center rounded-[18px] bg-rx-accent">
                  <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
                </View>
                <Text weight="extrabold" className="mb-1.5 text-[16px] text-rx-ink">
                  What would you like to know?
                </Text>
                <Text
                  weight="medium"
                  className="max-w-[260px] text-center text-[13px] leading-5 text-rx-muted"
                >
                  Ask about a patient&apos;s history, medications, allergies, or past visit notes.
                </Text>
              </View>
              <View className="gap-[9px]">
                {SUGGESTIONS.map((q) => (
                  <Pressable
                    key={q}
                    onPress={() => sendMessage({ text: q })}
                    className="flex-row items-center gap-[11px] rounded-[14px] border border-rx-line bg-rx-surface px-[15px] py-[13px] active:opacity-80"
                  >
                    <Ionicons name="search" size={16} color="#B7B7B2" />
                    <Text weight="semibold" className="flex-1 text-[13.5px] text-rx-ink">
                      {q}
                    </Text>
                    <Ionicons name="chevron-forward" size={13} color={rx.faint} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            messages.map((m) => {
              const text = messageText(m);
              if (m.role === 'user') {
                const files = fileCount(m);
                return (
                  <View key={m.id} className="mb-3 flex-row justify-end">
                    <View className="max-w-[82%] rounded-[18px] rounded-br-[5px] bg-rx-accent px-[14px] py-[11px]">
                      {files > 0 ? (
                        <View className="mb-1 flex-row items-center gap-1.5">
                          <Ionicons name="attach" size={13} color="#fff" />
                          <Text weight="semibold" className="text-[11.5px] text-white/90">
                            {files} attachment{files > 1 ? 's' : ''}
                          </Text>
                        </View>
                      ) : null}
                      {text ? (
                        <Text weight="medium" className="text-[13.5px] leading-5 text-white">
                          {text}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              }
              // Assistant — skip empty shells (the typing indicator covers those).
              if (!text) return null;
              return (
                <View key={m.id} className="mb-3 flex-row gap-[9px]">
                  <View className="h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-rx-ink">
                    <Ionicons name="sparkles" size={15} color="#fff" />
                  </View>
                  <View className="max-w-[82%] rounded-[18px] rounded-bl-[5px] border border-rx-line bg-rx-surface px-[14px] py-[11px]">
                    <Markdown content={text} />
                  </View>
                </View>
              );
            })
          )}

          {waitingForReply ? (
            <View className="mb-3 flex-row gap-[9px]">
              <View className="h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-rx-ink">
                <Ionicons name="sparkles" size={15} color="#fff" />
              </View>
              <View className="flex-row items-center gap-2 rounded-[18px] rounded-bl-[5px] border border-rx-line bg-rx-surface px-[14px] py-[12px]">
                <Ionicons name="ellipsis-horizontal" size={18} color={rx.muted} />
                <Text weight="medium" className="text-[12.5px] text-rx-muted">
                  {last && isToolRunning(last) ? 'Searching records…' : 'Thinking…'}
                </Text>
              </View>
            </View>
          ) : null}

          {error && !streaming ? (
            <View className="mb-3 flex-row items-center gap-2 rounded-[12px] border border-rx-line bg-rx-surface px-3.5 py-3">
              <Ionicons name="alert-circle-outline" size={16} color={rx.accent} />
              <Text weight="medium" className="flex-1 text-[12.5px] text-rx-muted">
                Something went wrong. Tap send to try again.
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <ChatComposer
          value={input}
          onChangeText={setInput}
          onSend={send}
          onStop={stop}
          onAttach={() => setAttachVisible(true)}
          onVoice={openVoice}
          attachments={attachments}
          onRemoveAttachment={(id) => setAttachments((a) => a.filter((x) => x.id !== id))}
          streaming={streaming}
          bottomPad={keyboardVisible ? 8 : 12}
        />
      </KeyboardAvoidingView>

      <AttachmentDialog
        visible={attachVisible}
        onClose={() => setAttachVisible(false)}
        onPick={handlePickSource}
      />

      <VoiceOverlay
        visible={voiceVisible}
        listening={voice.listening}
        text={voice.text}
        error={voice.error}
        onCancel={cancelVoice}
        onDone={finishVoice}
      />

      <ChatHistorySheet
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        onSelect={(id) => setLoadId(id)}
        onNew={newChat}
        activeId={sessionId}
      />
    </SafeAreaView>
  );
}
