import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {KeyboardAvoidingView, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { WhoSheet } from '@/app/(patient)/profile';
import { Text } from '@/components/ui/text';
import type { PatientProfile } from '@/features/patient/types';
import { useActiveProfile } from '@/features/patient/use-active-profile';
import { useCreatePatientAppointment } from '@/features/patient/use-patient-appointments';
import { useFormDraftStore } from '@/features/patient/use-form-drafts';
import { usePatientDoctors } from '@/features/patient/use-patient-doctors';
import { rx } from '@/theme/rx';

/**
 * "Add visit" — a screen-for-screen port of the ADD VISIT screen in the
 * RxScribe Mobile design (project f5d838c9): profile chips + "New", a
 * date/time row, and an optional "who are you seeing" search.
 */
export default function NewAppointmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profiles, activeProfileId, selectProfile } = useActiveProfile();
  const { mutate: createAppointment, isPending } = useCreatePatientAppointment();

  // Handed back by /patient/provider/new via the draft store — using route params
  // would remount this screen and lose the chosen profile/date.
  const providerDraft = useFormDraftStore((st) => st.provider);
  const clearProvider = useFormDraftStore((st) => st.clearProvider);

  const [date, setDate] = useState<Date>(() => nextHalfHour());
  const [seeing, setSeeing] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [clinic, setClinic] = useState('');
  /** Suppresses the suggestion list once a name has been picked from it. */
  const [pickedName, setPickedName] = useState('');

  // Apply (and consume) a pending provider choice on return.
  useEffect(() => {
    if (!providerDraft) return;
    setSeeing(providerDraft.name);
    setPickedName(providerDraft.name);
    setSpecialty(providerDraft.specialty);
    setClinic(providerDraft.clinic);
    clearProvider();
  }, [providerDraft, clearProvider]);
  const { data: doctorSuggestions } = usePatientDoctors(seeing);
  const suggestions = doctorSuggestions ?? [];
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);

  const canSave = !!activeProfileId && !isPending;

  const profileLabel = () => {
    const p = (profiles ?? []).find((x) => x.id === activeProfileId);
    if (!p) return 'Your visit';
    return p.profileType === 'self' ? 'You' : p.name;
  };

  const save = () => {
    if (!activeProfileId) return;
    const doctorName = seeing.trim();
    createAppointment(
      {
        profileId: activeProfileId,
        title: doctorName ? `Visit with ${doctorName}` : 'Visit',
        scheduledAt: date.toISOString(),
        doctorName: doctorName || undefined,
        doctorSpecialty: specialty.trim() || undefined,
        clinicName: clinic.trim() || undefined,
      },
      {
        onSuccess: () =>
          router.replace({
            pathname: '/patient/visit-added',
            params: {
              who: profileLabel(),
              when: `${formatDate(date)} at ${formatTime(date)}`,
              profileId: String(activeProfileId),
            },
          }),
        // Failures surface through the global mutation toast.
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
          Add visit
        </Text>
        <View className="w-[38px]" />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <Question>Whose visit is this?</Question>
        {/* One horizontal line, not a wrapping grid — keeps the row height fixed
            however many people and pets are on the account. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={{ gap: 10, paddingRight: 4 }}
          className="mb-[26px]"
        >
          {(profiles ?? []).map((p) => (
            <ProfileChip
              key={p.id}
              profile={p}
              selected={p.id === activeProfileId}
              onPress={() => selectProfile(p.id)}
            />
          ))}
          <Pressable onPress={() => setWhoOpen(true)} className="w-[60px] items-center gap-[7px]">
            <View className="h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-rx-subtle">
              <Ionicons name="add" size={20} color={rx.muted} />
            </View>
            <Text weight="bold" className="text-[12.5px] text-rx-muted">
              New
            </Text>
          </Pressable>
        </ScrollView>

        <Question>When is your appointment?</Question>
        <View className="mb-[26px] flex-row gap-[10px]">
          <PickerField label={formatDate(date)} onPress={() => setDateOpen(true)} />
          <PickerField label={formatTime(date)} onPress={() => setTimeOpen(true)} />
        </View>

        <View className="mb-3 flex-row items-baseline gap-1.5">
          <Text weight="extrabold" className="text-[15px] text-rx-ink">
            Who are you seeing?
          </Text>
          <Text weight="semibold" className="text-[12.5px] text-rx-faint">
            Optional
          </Text>
        </View>
        <View className="h-[52px] flex-row items-center gap-[9px] rounded-[16px] border-[1.5px] border-rx-line2 bg-rx-surface px-[15px]">
          <TextInput
            value={seeing}
            onChangeText={setSeeing}
            placeholder="Search by name"
            placeholderTextColor={rx.muted}
            className="flex-1 text-[14.5px] text-rx-ink"
            style={{ fontFamily: 'PlusJakartaSans' }}
          />
          <Ionicons name="search" size={16} color="#B7B7B2" />
        </View>

        {/* Shown when the suggestion list can't help — either nothing is stored
            yet, or what they typed matches nothing. Lets them record the provider
            properly (first name, last name, specialty) instead of guessing. */}
        {suggestions.length === 0 ? (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/patient/provider/new', params: { prefill: seeing.trim() } })
            }
            className="mt-2.5 flex-row items-center gap-2.5 active:opacity-70"
          >
            <Ionicons name="add-circle-outline" size={16} color={rx.accent} />
            <Text weight="bold" className="text-[13px] text-rx-accent">
              Can&apos;t find your provider? Add them
            </Text>
          </Pressable>
        ) : null}

        {/* Specialty captured from the provider screen. */}
        {specialty ? (
          <View className="mt-2.5 flex-row items-center gap-2">
            <Ionicons name="medkit-outline" size={14} color={rx.muted} />
            <Text weight="medium" className="text-[12.5px] text-rx-muted">
              {[specialty, clinic].filter(Boolean).join(' · ')}
            </Text>
          </View>
        ) : null}

        {/* Suggestions from the care circle + past visits. Free text still wins,
            so a doctor who isn't listed can simply be typed in. */}
        {suggestions.length > 0 && seeing.trim() !== pickedName ? (
          <View className="mt-2 overflow-hidden rounded-[16px] border border-rx-line bg-rx-surface">
            {suggestions.slice(0, 5).map((doctor, i) => (
              <Pressable
                key={`${doctor.name}-${doctor.source}`}
                onPress={() => {
                  setSeeing(doctor.name);
                  setPickedName(doctor.name);
                }}
                className={`flex-row items-center gap-3 px-4 py-[13px] active:opacity-70 ${i > 0 ? 'border-t border-rx-hairline' : ''}`}
              >
                <Ionicons
                  name={doctor.source === 'care_circle' ? 'people-outline' : 'time-outline'}
                  size={16}
                  color={rx.muted}
                />
                <View className="min-w-0 flex-1">
                  <Text weight="semibold" numberOfLines={1} className="text-[14px] text-rx-ink">
                    {doctor.name}
                  </Text>
                  {doctor.clinicName ? (
                    <Text weight="medium" numberOfLines={1} className="text-[11.5px] text-rx-muted">
                      {doctor.clinicName}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Submit — ink, not accent, per the design. Bottom padding tracks the
          device inset (Android gesture nav / iOS home indicator) so the button is
          never clipped; 30px floor keeps the design's spacing on inset-less devices. */}
      <View className="px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 30) }}>
        <Pressable
          onPress={save}
          disabled={!canSave}
          className="h-[54px] items-center justify-center rounded-[27px] bg-rx-ink active:opacity-85"
          style={{ opacity: canSave ? 1 : 0.45 }}
        >
          <Text weight="bold" className="text-[15px] text-white">
            {isPending ? 'Adding…' : 'Add visit'}
          </Text>
        </Pressable>
      </View>

      <OptionSheet
        open={dateOpen}
        title="Pick a date"
        options={upcomingDates(date)}
        onClose={() => setDateOpen(false)}
        onSelect={(d) => {
          setDate(d);
          setDateOpen(false);
        }}
        render={formatDate}
      />
      <OptionSheet
        open={timeOpen}
        title="Pick a time"
        options={daySlots(date)}
        onClose={() => setTimeOpen(false)}
        onSelect={(d) => {
          setDate(d);
          setTimeOpen(false);
        }}
        render={formatTime}
      />
      <WhoSheet
        open={whoOpen}
        onClose={() => setWhoOpen(false)}
        onChoose={(kind) => {
          setWhoOpen(false);
          router.push({ pathname: '/patient/profiles/new', params: { kind } });
        }}
      />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Question({ children }: { children: React.ReactNode }) {
  return (
    <Text weight="extrabold" className="mb-3 text-[15px] text-rx-ink">
      {children}
    </Text>
  );
}

function ProfileChip({
  profile,
  selected,
  onPress,
}: {
  profile: PatientProfile;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="w-[60px] items-center gap-[7px]">
      <View
        className="h-[52px] w-[52px] items-center justify-center rounded-[16px]"
        style={{
          backgroundColor: selected ? rx.accentTint : rx.subtle,
          borderWidth: selected ? 2 : 0,
          borderColor: rx.accent,
        }}
      >
        <Text weight="bold" className="text-[15px]" style={{ color: selected ? rx.accent : rx.ink }}>
          {initialsOf(profile.name)}
        </Text>
      </View>
      <Text weight="bold" numberOfLines={1} className="text-[12.5px] text-rx-ink2">
        {profile.profileType === 'self' ? 'You' : profile.name}
      </Text>
    </Pressable>
  );
}

function PickerField({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="h-[52px] flex-1 flex-row items-center justify-between rounded-[16px] border-[1.5px] border-rx-line2 bg-rx-surface px-[15px] active:opacity-80"
    >
      <Text weight="semibold" className="text-[14.5px] text-rx-ink">
        {label}
      </Text>
      <Ionicons name="chevron-down" size={14} color={rx.muted} />
    </Pressable>
  );
}

/** Lightweight bottom-sheet list — avoids pulling in a native date-picker dependency. */
function OptionSheet({
  open,
  title,
  options,
  onClose,
  onSelect,
  render,
}: {
  open: boolean;
  title: string;
  options: Date[];
  onClose: () => void;
  onSelect: (value: Date) => void;
  render: (value: Date) => string;
}) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-[rgba(15,15,17,0.42)]" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="max-h-[60%] rounded-t-[26px] bg-rx-bg px-5 pb-[34px] pt-[10px]"
        >
          <View className="mx-auto mb-[18px] h-[5px] w-[38px] rounded-[5px] bg-[#DCDBD6]" />
          <Text weight="extrabold" className="mb-3 text-[17px] text-rx-ink">
            {title}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((value) => (
              <Pressable
                key={value.toISOString()}
                onPress={() => onSelect(value)}
                className="border-t border-rx-line px-0.5 py-[15px] active:opacity-70"
              >
                <Text weight="semibold" className="text-[14.5px] text-rx-ink">
                  {render(value)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function nextHalfHour(): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() > 30 ? 60 : 30);
  return d;
}

/** Next 60 days, each keeping the currently-selected time of day. */
function upcomingDates(from: Date): Date[] {
  const start = new Date();
  start.setHours(from.getHours(), from.getMinutes(), 0, 0);
  return Array.from({ length: 60 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** 15-minute slots from 07:00 to 20:00 on the currently-selected day. */
function daySlots(base: Date): Date[] {
  const slots: Date[] = [];
  for (let minutes = 7 * 60; minutes <= 20 * 60; minutes += 15) {
    const d = new Date(base);
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    slots.push(d);
  }
  return slots;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}
