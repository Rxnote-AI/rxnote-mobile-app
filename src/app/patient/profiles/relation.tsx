import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import type { PatientProfileType } from '@/features/patient/types';
import { useFormDraftStore } from '@/features/patient/use-form-drafts';
import { rx } from '@/theme/rx';

/**
 * Full-page relation picker — the RELATION PICKER screen in the RxScribe Mobile
 * design (project f5d838c9). Returns the choice to /patient/profiles/new via a
 * route param rather than a callback, so the back-stack stays intact.
 */
interface RelationOption {
  label: string;
  profileType: PatientProfileType;
}

const OPTIONS: RelationOption[] = [
  { label: 'Child', profileType: 'child' },
  { label: 'Spouse', profileType: 'spouse' },
  { label: 'Partner', profileType: 'spouse' },
  { label: 'Parent', profileType: 'parent' },
  { label: 'Grandparent', profileType: 'parent' },
  { label: 'Sibling', profileType: 'sibling' },
  { label: 'Grandchild', profileType: 'other' },
  { label: 'Friend', profileType: 'other' },
  { label: 'Someone I care for', profileType: 'other' },
  { label: 'Other', profileType: 'other' },
];

export default function RelationPickerScreen() {
  const router = useRouter();
  const { selected } = useLocalSearchParams<{ selected?: string }>();
  const setRelation = useFormDraftStore((st) => st.setRelation);

  const choose = (option: RelationOption) => {
    // back(), not navigate() — returning preserves the form's typed state.
    setRelation({ label: option.label, profileType: option.profileType });
    router.back();
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
        <Pressable onPress={() => router.back()} className="h-[38px] w-[38px] items-center justify-center">
          <Ionicons name="close" size={22} color={rx.ink} />
        </Pressable>
        <Text weight="extrabold" className="text-[16px] text-rx-ink">
          Relation
        </Text>
        <View className="w-[38px]" />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text weight="extrabold" className="mb-2 text-[11px] tracking-[0.5px] text-rx-label">
          OPTIONS
        </Text>
        {OPTIONS.map((option) => {
          const isSelected = selected === option.label;
          return (
            <Pressable
              key={option.label}
              onPress={() => choose(option)}
              className="flex-row items-center justify-between border-t border-rx-line px-0.5 py-[15px] active:opacity-70"
            >
              <Text weight="semibold" className="text-[14.5px] text-rx-ink">
                {option.label}
              </Text>
              {isSelected ? (
                <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-rx-accent">
                  <Ionicons name="checkmark" size={14} color={rx.onAccent} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
