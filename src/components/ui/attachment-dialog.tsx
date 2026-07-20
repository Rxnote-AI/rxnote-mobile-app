import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { rx } from '@/theme/rx';

export type AttachmentSource = 'camera' | 'library' | 'file';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (source: AttachmentSource) => void;
}

const OPTIONS: { source: AttachmentSource; icon: keyof typeof Ionicons.glyphMap; label: string; hint: string }[] = [
  { source: 'camera', icon: 'camera', label: 'Take photo', hint: 'Capture with the camera' },
  { source: 'library', icon: 'images', label: 'Photo library', hint: 'Choose an existing photo' },
  { source: 'file', icon: 'document-text', label: 'Files', hint: 'Attach a PDF or image' },
];

/** Native-style bottom sheet for choosing where to attach a file from. */
export function AttachmentDialog({ visible, onClose, onPick }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/35" onPress={onClose}>
        {/* Stop propagation so taps inside the sheet don't dismiss it. */}
        <Pressable onPress={() => {}} className="px-3">
          <SafeAreaView edges={['bottom']}>
            <View className="mb-2 overflow-hidden rounded-[20px] bg-rx-surface">
              <View className="items-center pb-1.5 pt-2.5">
                <View className="h-1 w-9 rounded-full bg-rx-line2" />
              </View>
              <Text weight="bold" className="px-5 pb-1 pt-1 text-center text-[12.5px] text-rx-muted">
                Add attachment
              </Text>
              {OPTIONS.map((o, i) => (
                <Pressable
                  key={o.source}
                  onPress={() => onPick(o.source)}
                  className="flex-row items-center gap-3.5 px-5 py-[15px] active:bg-rx-subtle"
                  style={{ borderTopWidth: 1, borderTopColor: i === 0 ? rx.line : rx.hairline }}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-rx-subtle">
                    <Ionicons name={o.icon} size={20} color={rx.accent} />
                  </View>
                  <View className="flex-1">
                    <Text weight="bold" className="text-[15px] text-rx-ink">
                      {o.label}
                    </Text>
                    <Text weight="medium" className="text-[12px] text-rx-muted">
                      {o.hint}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={onClose}
              className="mb-1 items-center rounded-[20px] bg-rx-surface py-[15px] active:opacity-80"
            >
              <Text weight="extrabold" className="text-[15px] text-rx-accent">
                Cancel
              </Text>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
