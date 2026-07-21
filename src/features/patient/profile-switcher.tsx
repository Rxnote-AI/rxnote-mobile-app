import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { initialsOf } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { rx } from '@/theme/rx';
import type { PatientProfile } from './types';

/** Horizontal row of profile chips (self / family / pets) + an "add" affordance. */
export function ProfileSwitcher({
  profiles,
  activeProfileId,
  onSelect,
}: {
  profiles: PatientProfile[];
  activeProfileId: number | null;
  onSelect: (id: number) => void;
}) {
  const router = useRouter();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
      {profiles.map((p) => {
        const active = p.id === activeProfileId;
        return (
          <Pressable
            key={p.id}
            onPress={() => onSelect(p.id)}
            className="items-center gap-[7px]"
            style={{ width: 64 }}
          >
            <View
              className="h-[52px] w-[52px] items-center justify-center rounded-[16px]"
              style={{
                backgroundColor: active ? rx.ink : rx.subtle,
                borderWidth: active ? 0 : 1.5,
                borderColor: rx.line2,
              }}
            >
              <Text weight="bold" className="text-[14px]" style={{ color: active ? '#fff' : rx.ink2 }}>
                {initialsOf(p.name)}
              </Text>
            </View>
            <Text
              weight="bold"
              numberOfLines={1}
              className="text-[11.5px]"
              style={{ color: active ? rx.ink : rx.muted }}
            >
              {p.profileType === 'self' ? 'You' : p.name}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        onPress={() => router.push('/patient/profiles/new')}
        className="items-center gap-[7px]"
        style={{ width: 64 }}
      >
        <View className="h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-rx-subtle">
          <Ionicons name="add" size={20} color={rx.muted} />
        </View>
        <Text weight="bold" className="text-[11.5px] text-rx-muted">
          New
        </Text>
      </Pressable>
    </ScrollView>
  );
}
