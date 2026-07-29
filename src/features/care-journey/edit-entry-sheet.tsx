import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { accentShadow, rx } from '@/theme/rx';
import { CareTypePicker } from './care-type-picker';
import type { CareJourneyEntry } from './types';
import { useUpdateCareJourney } from './use-update-care-journey';

/** Bottom sheet for editing an entry's care type, recorded-by, and AI summary key points. */
export function EditEntrySheet({
  entry,
  patientId,
  onClose,
}: {
  entry: CareJourneyEntry | null;
  patientId: number;
  onClose: () => void;
}) {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { mutate: update, isPending } = useUpdateCareJourney();
  const [careType, setCareType] = useState('general');
  const [recordedBy, setRecordedBy] = useState('');
  const [summary, setSummary] = useState('');

  // Reset the draft whenever a new entry is opened for editing.
  const openedId = entry?.id;
  const [loadedId, setLoadedId] = useState<number | null>(null);
  if (entry && openedId !== loadedId) {
    setCareType(entry.careType || 'general');
    setRecordedBy(entry.recordedBy);
    setSummary(entry.summary ?? '');
    setLoadedId(openedId ?? null);
  }

  const handleSave = () => {
    if (!entry) return;
    update(
      { id: entry.id, patientId, updates: { careType, recordedBy: recordedBy.trim(), summary } },
      {
        onSuccess: () => {
          toast.show({ message: 'Entry updated', kind: 'success' });
          onClose();
        },
      },
    );
  };

  return (
    <Modal visible={!!entry} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable className="flex-1 justify-end bg-[rgba(15,15,17,0.42)]" onPress={onClose}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="rounded-t-[26px] bg-rx-bg pt-[10px]"
            style={{ maxHeight: '88%' }}
          >
            <View className="mx-auto mb-[16px] h-[5px] w-[38px] rounded-[5px] bg-[#DCDBD6]" />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: Math.max(insets.bottom, 20) + 14,
              }}
            >
              <Text weight="extrabold" className="mb-4 text-[17px] text-rx-ink">
                Edit entry
              </Text>

              <Text weight="bold" className="mb-1.5 text-[11px] tracking-wide text-rx-label">
                CARE TYPE
              </Text>
              <CareTypePicker value={careType} onChange={setCareType} />

              <Text weight="bold" className="mb-1.5 mt-4 text-[11px] tracking-wide text-rx-label">
                RECORDED BY
              </Text>
              <TextInput
                value={recordedBy}
                onChangeText={setRecordedBy}
                placeholder="Name"
                placeholderTextColor={rx.faint}
                className="rounded-[14px] border border-rx-line2 bg-rx-surface px-[14px] py-[11px] text-[14px] text-rx-ink"
                style={{ fontFamily: 'PlusJakartaSans' }}
              />

              <Text weight="bold" className="mb-1.5 mt-4 text-[11px] tracking-wide text-rx-label">
                KEY POINTS
              </Text>
              <TextInput
                value={summary}
                onChangeText={setSummary}
                multiline
                placeholder="One point per line…"
                placeholderTextColor={rx.faint}
                className="rounded-[14px] border border-rx-line2 bg-rx-surface px-[14px] py-[11px] text-[14px] leading-[20px] text-rx-ink"
                style={{ fontFamily: 'PlusJakartaSans', minHeight: 110, textAlignVertical: 'top' }}
              />

              <View className="mt-5 flex-row gap-3">
                <Pressable
                  onPress={onClose}
                  className="h-11 flex-1 items-center justify-center rounded-full border border-rx-line bg-rx-surface active:opacity-80"
                >
                  <Text weight="bold" className="text-[14px] text-rx-ink">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={isPending}
                  style={accentShadow()}
                  className="h-11 flex-1 items-center justify-center rounded-full bg-rx-accent active:opacity-90 disabled:opacity-60"
                >
                  {isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text weight="bold" className="text-[14px] text-white">
                      Save
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
