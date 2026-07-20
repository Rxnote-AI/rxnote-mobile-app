import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import type { ChatAttachment } from '@/features/chat/attachments';
import { Text } from '@/components/ui/text';
import { rx } from '@/theme/rx';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  onAttach: () => void;
  onVoice: () => void;
  attachments: ChatAttachment[];
  onRemoveAttachment: (id: string) => void;
  streaming: boolean;
  bottomPad: number;
}

function AttachmentChip({ item, onRemove }: { item: ChatAttachment; onRemove: () => void }) {
  const isImage = item.mediaType.startsWith('image/');
  return (
    <View className="relative mr-2">
      {isImage && item.previewUri ? (
        <Image source={{ uri: item.previewUri }} style={{ width: 52, height: 52, borderRadius: 12 }} />
      ) : (
        <View className="h-[52px] w-[120px] flex-row items-center gap-2 rounded-xl border border-rx-line bg-rx-bg px-2.5">
          <Ionicons name="document-text" size={18} color={rx.accent} />
          <Text weight="semibold" numberOfLines={2} className="flex-1 text-[10.5px] text-rx-ink">
            {item.name}
          </Text>
        </View>
      )}
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        className="absolute -right-1.5 -top-1.5 h-[18px] w-[18px] items-center justify-center rounded-full bg-rx-ink"
      >
        <Ionicons name="close" size={12} color="#fff" />
      </Pressable>
    </View>
  );
}

/** Chat composer matching the reference design: one rounded card holding an attach
 *  button, a growing multiline input, and a send/stop button. */
export function ChatComposer({
  value,
  onChangeText,
  onSend,
  onStop,
  onAttach,
  onVoice,
  attachments,
  onRemoveAttachment,
  streaming,
  bottomPad,
}: Props) {
  const canSend = value.trim().length > 0 || attachments.length > 0;

  return (
    <View className="px-4 pt-2" style={{ paddingBottom: bottomPad }}>
      <View className="rounded-[24px] border border-rx-line bg-rx-surface px-3 pb-2.5 pt-3">
        {attachments.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-2.5"
            contentContainerStyle={{ paddingRight: 4 }}
          >
            {attachments.map((a) => (
              <AttachmentChip key={a.id} item={a} onRemove={() => onRemoveAttachment(a.id)} />
            ))}
          </ScrollView>
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Ask about a patient…"
          placeholderTextColor="#B7B7B2"
          multiline
          className="px-1.5 text-[15px] leading-[21px] text-rx-ink"
          style={{ fontFamily: 'PlusJakartaSans', minHeight: 24, maxHeight: 120 }}
        />

        <View className="mt-1.5 flex-row items-center justify-between">
          <Pressable
            onPress={onAttach}
            hitSlop={6}
            accessibilityLabel="Add attachment"
            className="h-9 w-9 items-center justify-center rounded-full border border-rx-line active:opacity-70"
          >
            <Ionicons name="add" size={22} color={rx.ink} />
          </Pressable>

          <View className="flex-row items-center gap-2">
            {streaming ? (
              <Pressable
                onPress={onStop}
                accessibilityLabel="Stop"
                className="h-9 w-9 items-center justify-center rounded-full bg-rx-ink active:opacity-80"
              >
                <Ionicons name="stop" size={16} color="#fff" />
              </Pressable>
            ) : (
              <>
                <Pressable
                  onPress={onVoice}
                  accessibilityLabel="Voice input"
                  hitSlop={6}
                  className="h-9 w-9 items-center justify-center rounded-full active:opacity-60"
                >
                  <Ionicons name="mic-outline" size={22} color={rx.muted2} />
                </Pressable>
                <Pressable
                  onPress={onSend}
                  disabled={!canSend}
                  accessibilityLabel="Send"
                  className="h-9 w-9 items-center justify-center rounded-full active:opacity-80"
                  style={{ backgroundColor: canSend ? rx.accent : '#E4E3DF' }}
                >
                  <Ionicons name="arrow-up" size={20} color={canSend ? '#fff' : '#B7B7B2'} />
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
