import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/chip';
import { AccentButton } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useFormDraftStore } from '@/features/patient/use-form-drafts';
import { rx } from '@/theme/rx';

/** Common specialties, so most people can tap rather than type. */
const SPECIALTIES = [
  'General practice',
  'Paediatrics',
  'Cardiology',
  'Dermatology',
  'Dentistry',
  'Orthopaedics',
  'Gynaecology',
  'ENT',
  'Ophthalmology',
  'Veterinary',
];

const inputClass =
  'h-[52px] rounded-[16px] border-[1.5px] border-rx-line2 bg-rx-surface px-[15px] text-[14.5px] text-rx-ink';

/**
 * "Add a provider" — reached from Add Visit's "Can't find your provider?" when
 * the suggestion list has nothing. Hands the composed name + specialty back via
 * route params; the appointment stores them as doctorName / doctorSpecialty, and
 * the name then becomes a future suggestion from /api/patient/doctors.
 */
export default function NewProviderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const setProvider = useFormDraftStore((st) => st.setProvider);

  const [firstName, setFirstName] = useState(prefill ?? '');
  const [lastName, setLastName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [clinic, setClinic] = useState('');

  const save = () => {
    if (!firstName.trim() && !lastName.trim()) {
      toast.show({ message: "Enter the provider's name.", kind: 'info' });
      return;
    }
    const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
    // back(), not navigate() — keeps the Add Visit screen's date/profile choices.
    setProvider({ name, specialty: specialty.trim(), clinic: clinic.trim() });
    router.back();
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
          Add a provider
        </Text>
        <View className="w-[38px]" />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center pb-6 pt-2.5">
          <View className="h-[88px] w-[88px] items-center justify-center rounded-full bg-rx-seg">
            <Ionicons name="medkit-outline" size={34} color="#ABADB3" />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <FieldLabel>FIRST NAME</FieldLabel>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Meera"
              placeholderTextColor={rx.faint}
              autoCapitalize="words"
              className={`mb-[18px] ${inputClass}`}
            />
          </View>
          <View className="flex-1">
            <FieldLabel>LAST NAME</FieldLabel>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Rao"
              placeholderTextColor={rx.faint}
              autoCapitalize="words"
              className={`mb-[18px] ${inputClass}`}
            />
          </View>
        </View>

        <FieldLabel>SPECIALTY</FieldLabel>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {SPECIALTIES.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={specialty === option}
              onPress={() => setSpecialty(specialty === option ? '' : option)}
            />
          ))}
        </View>
        <TextInput
          value={specialty}
          onChangeText={setSpecialty}
          placeholder="Or type a specialty"
          placeholderTextColor={rx.faint}
          className={`mb-[18px] ${inputClass}`}
        />

        <FieldLabel>CLINIC OR HOSPITAL</FieldLabel>
        <TextInput
          value={clinic}
          onChangeText={setClinic}
          placeholder="Optional"
          placeholderTextColor={rx.faint}
          className={inputClass}
        />
      </ScrollView>

      <View className="px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 30) }}>
        <AccentButton label="Save provider" onPress={save} />
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
