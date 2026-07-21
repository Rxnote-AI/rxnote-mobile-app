import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { AccentButton } from '@/components/ui/controls';
import { useActiveProfile } from '@/features/patient/use-active-profile';
import { ProfileSwitcher } from '@/features/patient/profile-switcher';
import { accentShadow, rx } from '@/theme/rx';

export default function PatientRecordScreen() {
  const router = useRouter();
  const { profiles, activeProfile, activeProfileId, selectProfile } = useActiveProfile();

  const startRecording = () => {
    if (!activeProfileId || !activeProfile) return;
    router.push({
      pathname: '/patient/record-session',
      params: { profileId: String(activeProfileId), profileName: activeProfile.name },
    });
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      <View className="flex-1 px-5 pt-4">
        <Text weight="extrabold" className="mb-1 text-[24px] tracking-tight text-rx-ink">
          Record your visit
        </Text>
        <Text weight="medium" className="mb-5 text-[13.5px] text-rx-muted">
          We&apos;ll transcribe it and give you an easy-to-read summary.
        </Text>

        <Text weight="bold" className="mb-2.5 text-[14px] text-rx-ink">
          Who is this visit for?
        </Text>
        <ProfileSwitcher profiles={profiles} activeProfileId={activeProfileId} onSelect={selectProfile} />

        <View className="flex-1 items-center justify-center">
          <View
            style={accentShadow()}
            className="h-[120px] w-[120px] items-center justify-center rounded-full bg-rx-accent"
          >
            <Ionicons name="mic" size={44} color="#fff" />
          </View>
        </View>

        <AccentButton
          label={activeProfile ? `Start recording · ${activeProfile.name.split(' ')[0]}` : 'Select a profile'}
          disabled={!activeProfileId}
          onPress={startRecording}
          icon={<Ionicons name="mic" size={17} color="#fff" />}
          className="mb-6"
        />
      </View>
    </SafeAreaView>
  );
}
