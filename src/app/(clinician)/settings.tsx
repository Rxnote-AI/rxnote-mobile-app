import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';

import { Avatar, initialsOf } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { useRole } from '@/hooks/use-role';
import { rx } from '@/theme/rx';

type IconName = keyof typeof Ionicons.glyphMap;

const CLINICAL: { icon: IconName; label: string; value: string }[] = [
  { icon: 'language-outline', label: 'App language', value: 'English' },
  { icon: 'document-text-outline', label: 'Default note template', value: 'SOAP' },
  { icon: 'medkit-outline', label: 'Specialty', value: 'General' },
  { icon: 'mic-outline', label: 'Default transcription language', value: 'English' },
];

const ACCOUNT = ['Security & HIPAA', 'Team & clinic', 'Help & support'];

function SectionLabel({ children }: { children: string }) {
  return (
    <Text weight="extrabold" className="mx-1 mb-2 text-[11.5px] tracking-widest text-rx-label">
      {children}
    </Text>
  );
}

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const { setPersona, hasPatientAccount } = useRole();
  const { user } = useUser();

  const name = user?.fullName || (user?.firstName ? `Dr. ${user.firstName}` : 'Clinician');
  const subtitle = user?.primaryEmailAddress?.emailAddress ?? 'General Practice';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 }}
      >
        <Text weight="extrabold" className="mb-[18px] mt-1.5 text-[24px] tracking-tight text-rx-ink">
          Settings
        </Text>

        {/* Profile */}
        <Pressable className="mb-[22px] flex-row items-center gap-[14px] rounded-[20px] border border-rx-line bg-rx-surface p-4 active:opacity-90">
          <Avatar
            variant="dark"
            initials={initialsOf(name)}
            className="h-[52px] w-[52px] rounded-[16px]"
            textClassName="text-[17px]"
          />
          <View className="min-w-0 flex-1">
            <Text weight="extrabold" numberOfLines={1} className="text-[17px] text-rx-ink">
              {name}
            </Text>
            <Text weight="medium" numberOfLines={1} className="text-[12.5px] text-rx-muted">
              {subtitle}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={rx.faint} />
        </Pressable>

        {/* Persona switch — only shown when this same login actually owns BOTH
            sides (publicMetadata.hasPatientAccount is set by the server when the
            patient account is created). A clinician with no patient account sees
            nothing here, rather than a switch into an empty app. */}
        {hasPatientAccount ? (
        <View className="mb-[22px] overflow-hidden rounded-[18px] border border-rx-line bg-rx-surface">
          <Pressable
            onPress={() => {
              setPersona('patient');
              router.replace('/(patient)');
            }}
            className="flex-row items-center gap-[13px] px-4 py-[15px] active:bg-rx-hairline/60"
          >
            <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-rx-accent-tint">
              <Ionicons name="swap-horizontal" size={16} color={rx.accent} />
            </View>
            <View className="flex-1">
              <Text weight="semibold" className="text-[14.5px] text-rx-ink">
                Switch to my health
              </Text>
              <Text weight="medium" className="text-[12px] text-rx-muted">
                Your own records, visits and documents
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={13} color={rx.faint} />
          </Pressable>
        </View>
        ) : null}

        {/* Clinical */}
        <SectionLabel>CLINICAL</SectionLabel>
        <View className="mb-[22px] overflow-hidden rounded-[18px] border border-rx-line bg-rx-surface">
          {CLINICAL.map((row, i) => (
            <Pressable
              key={row.label}
              className={`flex-row items-center gap-[13px] px-4 py-[15px] active:bg-rx-hairline/60 ${i > 0 ? 'border-t border-rx-hairline' : ''}`}
            >
              <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-rx-accent-tint">
                <Ionicons name={row.icon} size={16} color={rx.accent} />
              </View>
              <Text weight="semibold" className="flex-1 text-[14.5px] text-rx-ink">
                {row.label}
              </Text>
              <Text weight="bold" className="text-[13.5px] text-rx-muted">
                {row.value}
              </Text>
              <Ionicons name="chevron-forward" size={13} color={rx.faint} />
            </Pressable>
          ))}
        </View>

        {/* Account */}
        <SectionLabel>ACCOUNT</SectionLabel>
        <View className="mb-5 overflow-hidden rounded-[18px] border border-rx-line bg-rx-surface">
          {ACCOUNT.map((label, i) => (
            <Pressable
              key={label}
              className={`flex-row items-center px-4 py-[15px] active:bg-rx-hairline/60 ${i > 0 ? 'border-t border-rx-hairline' : ''}`}
            >
              <Text weight="semibold" className="flex-1 text-[14.5px] text-rx-ink">
                {label}
              </Text>
              <Ionicons name="chevron-forward" size={13} color={rx.faint} />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => signOut()}
          className="items-center rounded-[16px] border border-rx-line bg-rx-surface p-[15px] active:opacity-80"
        >
          <Text weight="bold" className="text-[14.5px] text-rx-accent">
            Sign out
          </Text>
        </Pressable>

        <Text weight="medium" className="mt-[14px] text-center text-[11.5px] text-rx-faint">
          RxNote · version 1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
