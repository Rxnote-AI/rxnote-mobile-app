import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/chip';
import { AccentButton } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import type { PatientProfileType } from '@/features/patient/types';
import { useFormDraftStore } from '@/features/patient/use-form-drafts';
import { useCreatePatientProfile } from '@/features/patient/use-patient-profiles';
import { useSelectedProfileStore } from '@/features/patient/use-selected-profile';
import { rx } from '@/theme/rx';

/** Species options from the design's ADD PET screen. */
const SPECIES = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Fish', 'Other'];
const PET_SEX = ['Male', 'Female'];
const PERSON_SEX = ['Female', 'Male', 'Other'];

const inputClass =
  'h-[52px] rounded-[16px] border-[1.5px] border-rx-line2 bg-rx-surface px-[15px] text-[14.5px] text-rx-ink';

/**
 * Add a dependent / Add a pet — ports the ADD DEPENDENT and ADD PET screens from
 * the RxScribe Mobile design (project f5d838c9). Every field is a selector
 * (chips, or the full-page relation picker) except name and date of birth.
 *
 * Photo upload is intentionally omitted for now — the design's avatar is shown
 * as a placeholder only.
 */
export default function AddPatientProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { mutate: createProfile, isPending } = useCreatePatientProfile();
  const setSelectedProfile = useSelectedProfileStore((s) => s.setProfileId);

  // `kind` is pre-selected by the "Who are you adding?" sheet. The relation comes
  // back through the draft store (not route params) so returning from the picker
  // does not remount this screen and wipe what's already typed.
  const { kind: kindParam } = useLocalSearchParams<{ kind?: string }>();
  const relationDraft = useFormDraftStore((st) => st.relation);
  const clearRelation = useFormDraftStore((st) => st.clearRelation);

  const [kind, setKind] = useState<'person' | 'pet'>(kindParam === 'pet' ? 'pet' : 'person');
  const [profileType, setProfileType] = useState<PatientProfileType>('child');
  const [relation, setRelation] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState('');
  const [species, setSpecies] = useState('');

  // Apply (and consume) a pending relation choice on return from the picker.
  useEffect(() => {
    if (!relationDraft) return;
    setRelation(relationDraft.label);
    setProfileType(relationDraft.profileType);
    clearRelation();
  }, [relationDraft, clearRelation]);

  const isPet = kind === 'pet';

  /**
   * Validation is checked on press, not by disabling the button — a dead button
   * with no explanation reads as "saving is broken". Tell them what's missing.
   */
  const save = () => {
    if (!name.trim()) {
      toast.show({ message: isPet ? "Your pet needs a name." : 'Please enter their name.', kind: 'info' });
      return;
    }
    if (!isPet && !relation.trim()) {
      toast.show({ message: 'Choose how they’re related to you.', kind: 'info' });
      return;
    }
    createProfile(
      {
        profileType: isPet ? 'pet' : profileType,
        name: name.trim(),
        relationship: isPet ? undefined : relation.trim() || undefined,
        dateOfBirth: dob.trim() || undefined,
        sex: sex.trim() || undefined,
        species: isPet ? species.trim() || undefined : undefined,
      },
      {
        onSuccess: (profile) => {
          setSelectedProfile(profile.id);
          toast.show({ message: `${profile.name} added.`, kind: 'success' });
          router.back();
        },
        // Failures surface through the global mutation-cache toast in query-client.ts.
      },
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      {/* behavior="padding" on both platforms — Android's edge-to-edge mode makes
          adjustResize inert, so the default does nothing there. */}
      <KeyboardAvoidingView className="flex-1" behavior="padding" keyboardVerticalOffset={0}>
      <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
        <Pressable onPress={() => router.back()} className="h-[38px] w-[38px] items-center justify-center">
          <Ionicons name="close" size={22} color={rx.ink} />
        </Pressable>
        <Text weight="extrabold" className="text-[16px] text-rx-ink">
          {isPet ? 'Add a pet' : 'Add a dependent'}
        </Text>
        <View className="w-[38px]" />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar placeholder — upload deferred */}
        <View className="items-center pb-6 pt-2.5">
          <View className="h-[88px] w-[88px] items-center justify-center rounded-full bg-rx-seg">
            <Ionicons name={isPet ? 'paw-outline' : 'person-outline'} size={34} color="#ABADB3" />
          </View>
        </View>

        <View className="mb-6 flex-row gap-2">
          <Chip
            label="Person"
            selected={!isPet}
            onPress={() => setKind('person')}
            className="flex-1 items-center"
          />
          <Chip label="Pet" selected={isPet} onPress={() => setKind('pet')} className="flex-1 items-center" />
        </View>

        <FieldLabel>NAME</FieldLabel>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={isPet ? "Pet's name" : 'Full name'}
          placeholderTextColor={rx.faint}
          autoCapitalize="words"
          className={`mb-[18px] ${inputClass}`}
        />

        {isPet ? (
          <>
            <FieldLabel>SPECIES</FieldLabel>
            <View className="mb-[18px] flex-row flex-wrap gap-2">
              {SPECIES.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={species === option}
                  onPress={() => setSpecies(option)}
                />
              ))}
            </View>
          </>
        ) : (
          <>
            <FieldLabel>THEIR RELATION TO YOU</FieldLabel>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/patient/profiles/relation', params: { selected: relation } })
              }
              className="mb-[18px] h-[52px] flex-row items-center justify-between rounded-[16px] border-[1.5px] border-rx-line2 bg-rx-surface px-[15px] active:opacity-80"
            >
              <Text weight="semibold" className={`text-[14.5px] ${relation ? 'text-rx-ink' : 'text-rx-muted'}`}>
                {relation || 'Choose a relation'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={rx.muted} />
            </Pressable>
          </>
        )}

        <FieldLabel>DATE OF BIRTH</FieldLabel>
        <TextInput
          value={dob}
          onChangeText={(text) => setDob(formatDobInput(text))}
          placeholder="MM/DD/YYYY"
          placeholderTextColor={rx.faint}
          keyboardType="number-pad"
          maxLength={10}
          className={inputClass}
        />
        <Text weight="medium" className="mb-[18px] mt-1.5 text-[12px] text-rx-faint">
          Not sure? Your best guess is fine.
        </Text>

        <FieldLabel>SEX</FieldLabel>
        <View className="flex-row flex-wrap gap-[7px]">
          {(isPet ? PET_SEX : PERSON_SEX).map((option) => (
            <Chip key={option} label={option} selected={sex === option} onPress={() => setSex(option)} />
          ))}
        </View>
      </ScrollView>

      <View className="px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 30) }}>
        <AccentButton
          label={isPet ? 'Add pet' : 'Save dependent'}
          disabled={isPending}
          onPress={save}
        />
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text weight="extrabold" className="mb-1.5 text-[11px] tracking-[0.4px] text-rx-label">
      {children}
    </Text>
  );
}

/** Auto-inserts the slashes so MM/DD/YYYY is easy to type on a number pad. */
function formatDobInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
