import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoundIconButton } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import { rx } from '@/theme/rx';

type Persona = 'clinician' | 'patient';

/**
 * Persona picker shown before the sign-up form.
 *
 * Sign-IN never asks — the role lives on the account and `src/app/index.tsx`
 * resolves it after auth. Sign-UP has to ask, because the role must be stamped
 * at creation time (there's no reliable way to infer it later) and the two
 * paths diverge afterwards: clinicians get org/specialty onboarding, patients
 * get the `patient_accounts` + "self" profile bootstrap.
 */
export default function ChooseRoleScreen() {
  const router = useRouter();

  const choose = (role: Persona) =>
    router.push({ pathname: '/(auth)/sign-up', params: { role } });

  return (
    <SafeAreaView className="flex-1 bg-rx-bg">
      <View className="flex-row items-center gap-[14px] px-5 pt-2">
        <RoundIconButton name="chevron-back" size={20} onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8">
          <Text weight="extrabold" className="text-[30px] tracking-tight text-rx-ink">
            How will you use RxNote?
          </Text>
          <Text weight="medium" className="mt-1 text-[14px] leading-5 text-rx-muted">
            This just sets where you start — you can switch between the two any time from
            Settings.
          </Text>
        </View>

        <RoleCard
          icon="medkit-outline"
          title="I'm a clinician"
          blurb="Record patient encounters and generate SOAP notes, ICD-10 codes and summaries."
          onPress={() => choose('clinician')}
        />

        <View className="h-3" />

        <RoleCard
          icon="person-outline"
          title="I'm a patient"
          blurb="Keep your own visit records, get plain-language summaries and prep for appointments."
          onPress={() => choose('patient')}
        />

        <View className="mt-8 flex-row items-center justify-center gap-1.5">
          <Text weight="medium" className="text-[13.5px] text-rx-muted">
            Already have an account?
          </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable>
              <Text weight="bold" className="text-[13.5px] text-rx-accent">
                Sign in
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RoleCard({
  icon,
  title,
  blurb,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  blurb: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-4 rounded-[20px] border border-rx-line bg-rx-surface p-5 active:opacity-80"
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-rx-accent-tint">
        <Ionicons name={icon} size={22} color={rx.accent} />
      </View>
      <View className="flex-1">
        <Text weight="bold" className="text-[16px] text-rx-ink">
          {title}
        </Text>
        <Text weight="medium" className="mt-1 text-[13px] leading-[18px] text-rx-muted">
          {blurb}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={rx.muted} />
    </Pressable>
  );
}
