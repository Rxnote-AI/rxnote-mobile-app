import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoundIconButton } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import { initialsOf } from '@/components/ui/avatar';
import { useDeletePatientProfile, usePatientProfiles } from '@/features/patient/use-patient-profiles';
import { rx } from '@/theme/rx';
import type { PatientProfile } from '@/features/patient/types';

const TYPE_LABEL: Record<PatientProfile['profileType'], string> = {
  self: 'You',
  spouse: 'Spouse',
  child: 'Child',
  parent: 'Parent',
  sibling: 'Sibling',
  pet: 'Pet',
  other: 'Other',
};

export default function PatientProfilesScreen() {
  const router = useRouter();
  const { data: profiles } = usePatientProfiles();
  const { mutate: deleteProfile } = useDeletePatientProfile();

  const confirmDelete = (p: PatientProfile) => {
    Alert.alert(`Remove ${p.name}?`, 'Their visit history stays on your account, but they’ll be hidden going forward.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteProfile(p.id) },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      <View className="flex-row items-center justify-between px-5 pb-2 pt-2">
        <RoundIconButton name="chevron-back" size={20} onPress={() => router.back()} />
        <Text weight="extrabold" className="text-[16px] text-rx-ink">
          Family & pets
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 }}>
        <View className="overflow-hidden rounded-[18px] border border-rx-line bg-rx-surface">
          {(profiles ?? []).map((p, i) => (
            <View
              key={p.id}
              className="flex-row items-center gap-3 px-4 py-[14px]"
              style={i > 0 ? { borderTopWidth: 1, borderTopColor: rx.hairline } : undefined}
            >
              <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-rx-accent-tint">
                <Text weight="bold" className="text-[13px] text-rx-accent">
                  {initialsOf(p.name)}
                </Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text weight="bold" className="text-[14.5px] text-rx-ink">
                  {p.name}
                </Text>
                <Text weight="medium" className="text-[12px] text-rx-muted">
                  {TYPE_LABEL[p.profileType]}
                  {p.species ? ` · ${p.species}` : ''}
                </Text>
              </View>
              {p.profileType !== 'self' ? (
                <Pressable onPress={() => confirmDelete(p)} hitSlop={8} className="p-1 active:opacity-70">
                  <Ionicons name="trash-outline" size={18} color={rx.muted} />
                </Pressable>
              ) : null}
            </View>
          ))}
          <Pressable
            onPress={() => router.push('/patient/profiles/new')}
            className="flex-row items-center gap-3 border-t border-rx-hairline px-4 py-[14px] active:opacity-80"
          >
            <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-rx-subtle">
              <Ionicons name="add" size={18} color={rx.muted} />
            </View>
            <Text weight="bold" className="text-[14px] text-rx-accent">
              Add a person or pet
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
