import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { accentShadow, rx } from '@/theme/rx';

/**
 * "Visit added" confirmation — the VISIT ADDED screen in the RxScribe Mobile
 * design (project f5d838c9). Offers to record straight away or defer.
 */
export default function VisitAddedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { who, when, profileId } = useLocalSearchParams<{
    who?: string;
    when?: string;
    profileId?: string;
  }>();

  const summary = [who, when].filter(Boolean).join(' · ');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      <View className="flex-1 items-center justify-center px-[30px]">
        <View className="mb-[22px] h-[72px] w-[72px] items-center justify-center rounded-full bg-rx-success-bg">
          <Ionicons name="checkmark" size={34} color={rx.success} />
        </View>

        <Text weight="extrabold" className="mb-2 text-[20px] text-rx-ink">
          Visit added
        </Text>
        <Text weight="medium" className="text-center text-[14px] leading-[21px] text-rx-muted">
          {summary || 'Your visit is saved. Record it whenever you’re ready.'}
        </Text>
      </View>

      <View className="px-[30px] pt-3" style={{ paddingBottom: Math.max(insets.bottom, 30) }}>
        <Pressable
          onPress={() =>
            router.replace({
              pathname: '/patient/record-session',
              params: profileId ? { profileId } : {},
            })
          }
          className="mb-[11px] h-[54px] flex-row items-center justify-center gap-[9px] rounded-[27px] bg-rx-accent active:opacity-90"
          style={accentShadow()}
        >
          <Ionicons name="mic" size={18} color={rx.onAccent} />
          <Text weight="bold" className="text-[15px] text-white">
            Record this visit now
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/(patient)')}
          className="h-[54px] items-center justify-center rounded-[27px] border-[1.5px] border-rx-line2 bg-rx-surface active:opacity-80"
        >
          <Text weight="bold" className="text-[14.5px] text-rx-muted2">
            I&apos;ll record it later
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
