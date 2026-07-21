import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { usePatientAccount } from '@/features/patient/use-patient-account';
import { usePatientProfiles } from '@/features/patient/use-patient-profiles';
import { useRole } from '@/hooks/use-role';
import type { PatientProfile } from '@/features/patient/types';
import { rx } from '@/theme/rx';

/** Profile tab — mirrors the "PROFILE" screen in the RxScribe Mobile design. */
export default function PatientProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { account } = usePatientAccount();
  const { setPersona, hasPatientAccount } = useRole();
  const { data: profiles, isLoading } = usePatientProfiles();
  const [whoSheetOpen, setWhoSheetOpen] = useState(false);

  const choose = (kind: 'person' | 'pet') => {
    setWhoSheetOpen(false);
    router.push({ pathname: '/patient/profiles/new', params: { kind } });
  };

  return (
    <SafeAreaView className="flex-1 bg-rx-bg" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text weight="extrabold" className="my-[6px] mb-[18px] text-[24px] tracking-tight text-rx-ink">
          Profile
        </Text>

        {/* Account card */}
        <View className="mb-[22px] flex-row items-center gap-[14px] rounded-[20px] border border-rx-line bg-rx-surface p-4">
          <View className="h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-rx-ink">
            <Text weight="bold" className="text-[17px] text-white">
              {initialsOf(account?.displayName ?? '')}
            </Text>
          </View>
          <View className="flex-1">
            <Text weight="extrabold" className="text-[17px] text-rx-ink">
              {account?.displayName ?? '—'}
            </Text>
            <Text weight="medium" className="text-[12.5px] text-rx-muted">
              {account?.email ?? ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={rx.faint} />
        </View>

        {/* People & pets */}
        <SectionLabel>PEOPLE &amp; PETS</SectionLabel>
        <View className="mb-[22px] overflow-hidden rounded-[18px] border border-rx-line bg-rx-surface">
          <Pressable
            onPress={() => router.push('/patient/profiles')}
            className="flex-row items-center gap-3 px-4 py-[15px] active:opacity-70"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-rx-accent-tint">
              <Ionicons name="people-outline" size={17} color={rx.accent} />
            </View>
            <View className="flex-1">
              <Text weight="semibold" className="text-[14.5px] text-rx-ink">
                People &amp; pets
              </Text>
              <Text weight="medium" className="text-[12px] text-rx-muted">
                {isLoading ? 'Loading…' : countLabel(profiles ?? [])}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={rx.faint} />
          </Pressable>
          <Pressable
            onPress={() => setWhoSheetOpen(true)}
            className="flex-row items-center gap-3 border-t border-rx-hairline px-4 py-[14px] active:opacity-70"
          >
            <Text weight="bold" className="text-[14px] text-rx-accent">
              + Add a person or pet
            </Text>
          </Pressable>
        </View>

        {/* Persona switch — only when this login owns both sides. */}
        {hasPatientAccount ? (
        <>
        <SectionLabel>ACCOUNT</SectionLabel>
        <View className="mb-[22px] overflow-hidden rounded-[18px] border border-rx-line bg-rx-surface">
          <Pressable
            onPress={() => {
              setPersona('clinician');
              router.replace('/(clinician)');
            }}
            className="flex-row items-center gap-[13px] border-t border-rx-hairline px-4 py-[15px] active:opacity-70"
          >
            <Ionicons name="swap-horizontal" size={18} color={rx.accent} />
            <View className="flex-1">
              <Text weight="semibold" className="text-[14.5px] text-rx-ink">
                Switch to clinician
              </Text>
              <Text weight="medium" className="text-[12px] text-rx-muted">
                Record encounters and write notes
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={rx.faint} />
          </Pressable>
        </View>
        </>
        ) : null}

        {/* Preferences */}
        <SectionLabel>PREFERENCES</SectionLabel>
        <View className="mb-[22px] overflow-hidden rounded-[18px] border border-rx-line bg-rx-surface">
          <PrefRow label="App language" value="English" />
          <PrefRow label="Notifications" />
          <PrefRow label="Linked doctors" />
        </View>

        <Pressable
          onPress={() => signOut()}
          className="items-center rounded-[16px] border border-rx-line bg-rx-surface p-[15px] active:opacity-70"
        >
          <Text weight="bold" className="text-[14.5px] text-rx-accent">
            Sign out
          </Text>
        </Pressable>
      </ScrollView>

      <WhoSheet open={whoSheetOpen} onClose={() => setWhoSheetOpen(false)} onChoose={choose} />
    </SafeAreaView>
  );
}

/** "Who are you adding?" bottom sheet — Person / Pet, per the design's WHO SHEET. */
export function WhoSheet({
  open,
  onClose,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  onChoose: (kind: 'person' | 'pet') => void;
}) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-[rgba(15,15,17,0.42)]" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-[26px] bg-rx-bg px-5 pb-[34px] pt-[10px]"
        >
          <View className="mx-auto mb-[18px] h-[5px] w-[38px] rounded-[5px] bg-[#DCDBD6]" />
          <Text weight="extrabold" className="mb-4 text-[17px] text-rx-ink">
            Who are you adding?
          </Text>

          <SheetOption
            icon="person-outline"
            title="Person"
            sub="A child or someone in your care"
            onPress={() => onChoose('person')}
          />
          <View className="h-[10px]" />
          <SheetOption
            icon="paw-outline"
            title="Pet"
            sub="An animal whose health you manage"
            onPress={() => onChoose('pet')}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SheetOption({
  icon,
  title,
  sub,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-[13px] rounded-[16px] border-[1.5px] border-rx-line bg-rx-surface px-4 py-[14px] active:opacity-80"
    >
      <Ionicons name={icon} size={22} color={rx.ink} />
      <View className="flex-1">
        <Text weight="bold" className="text-[14.5px] text-rx-ink">
          {title}
        </Text>
        <Text weight="medium" className="text-[12px] text-rx-muted">
          {sub}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={rx.faint} />
    </Pressable>
  );
}

function ProfileRow({ profile }: { profile: PatientProfile }) {
  const isPet = profile.profileType === 'pet';
  return (
    <Row>
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: isPet ? rx.successBg : rx.accentTint }}
      >
        <Text weight="bold" className="text-[12px]" style={{ color: isPet ? rx.success : rx.accent }}>
          {initialsOf(profile.name)}
        </Text>
      </View>
      <View className="flex-1">
        <Text weight="bold" className="text-[14.5px] text-rx-ink">
          {profile.name}
        </Text>
        <Text weight="medium" className="text-[12px] text-rx-muted">
          {subtitleOf(profile)}
        </Text>
      </View>
    </Row>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-3 border-t border-rx-hairline px-4 py-[14px]">{children}</View>
  );
}

function PrefRow({ label, value }: { label: string; value?: string }) {
  return (
    <View className="flex-row items-center gap-[13px] border-t border-rx-hairline px-4 py-[15px]">
      <Text weight="semibold" className="flex-1 text-[14.5px] text-rx-ink">
        {label}
      </Text>
      {value ? (
        <Text weight="bold" className="text-[13.5px] text-rx-muted">
          {value}
        </Text>
      ) : null}
      <Ionicons name="chevron-forward" size={14} color={rx.faint} />
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text weight="extrabold" className="mx-1 mb-2 text-[11.5px] tracking-[0.5px] text-rx-label">
      {children}
    </Text>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function subtitleOf(p: PatientProfile): string {
  if (p.profileType === 'self') return 'You';
  if (p.profileType === 'pet') return p.species ? `Pet · ${p.species}` : 'Pet';
  return p.relationship ?? capitalize(p.profileType);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "You + 3 people · 2 pets" — a glanceable summary instead of the full list. */
function countLabel(profiles: PatientProfile[]): string {
  const pets = profiles.filter((p) => p.profileType === 'pet').length;
  const people = profiles.filter((p) => p.profileType !== 'pet' && p.profileType !== 'self').length;
  const parts: string[] = ['You'];
  if (people > 0) parts.push(`${people} ${people === 1 ? 'person' : 'people'}`);
  if (pets > 0) parts.push(`${pets} ${pets === 1 ? 'pet' : 'pets'}`);
  return parts.join(' · ');
}
