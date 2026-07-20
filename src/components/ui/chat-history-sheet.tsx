import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useChatSessions, useDeleteChatSession } from '@/features/chat/use-chat-sessions';
import { relativeDay } from '@/lib/format';
import { rx } from '@/theme/rx';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: number) => void;
  onNew: () => void;
  activeId: number | null;
}

/** Bottom sheet listing the doctor's recent chat threads. */
export function ChatHistorySheet({ visible, onClose, onSelect, onNew, activeId }: Props) {
  const { data, isLoading, refetch } = useChatSessions();
  const del = useDeleteChatSession();
  const sessions = data ?? [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/30" onPress={onClose} />
      <View className="absolute inset-x-0 bottom-0 max-h-[75%] rounded-t-[24px] bg-rx-bg">
        <SafeAreaView edges={['bottom']}>
          <View className="flex-row items-center justify-between border-b border-rx-line px-5 pb-3 pt-4">
            <Text weight="extrabold" className="text-[17px] text-rx-ink">
              Recent chats
            </Text>
            <Pressable
              onPress={onNew}
              className="h-9 flex-row items-center gap-1.5 rounded-full bg-rx-accent px-3.5 active:opacity-90"
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text weight="bold" className="text-[13px] text-white">
                New
              </Text>
            </Pressable>
          </View>

          <ScrollView
            className="px-4"
            contentContainerStyle={{ paddingVertical: 10 }}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <ActivityIndicator color={rx.accent} className="mt-6" />
            ) : sessions.length === 0 ? (
              <Text weight="medium" className="mt-6 text-center text-[13px] text-rx-muted">
                No saved chats yet.
              </Text>
            ) : (
              sessions.map((s) => {
                const active = s.id === activeId;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => onSelect(s.id)}
                    className="mb-2 flex-row items-center gap-3 rounded-[14px] border px-4 py-3 active:opacity-80"
                    style={{
                      borderColor: active ? rx.accent : rx.line,
                      backgroundColor: active ? rx.accentTint : rx.surface,
                    }}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={rx.muted} />
                    <View className="min-w-0 flex-1">
                      <Text weight="bold" numberOfLines={1} className="text-[14px] text-rx-ink">
                        {s.title || 'Untitled chat'}
                      </Text>
                      <Text weight="medium" className="text-[11.5px] text-rx-muted">
                        {relativeDay(s.updatedAt)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => del.mutate(s.id)}
                      hitSlop={8}
                      accessibilityLabel="Delete chat"
                      className="h-8 w-8 items-center justify-center rounded-full active:opacity-60"
                    >
                      <Ionicons name="trash-outline" size={16} color={rx.faint} />
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
