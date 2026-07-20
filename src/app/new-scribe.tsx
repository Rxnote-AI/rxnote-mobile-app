import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardVisible } from '@/hooks/use-keyboard';

import { Avatar } from '@/components/ui/avatar';
import { Chip } from '@/components/ui/chip';
import { AccentButton, RoundIconButton, Segmented } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import type { Patient } from '@/features/patients/types';
import { useCreatePatient } from '@/features/patients/use-create-patient';
import { usePatients } from '@/features/patients/use-patients';
import { SCRIBE_LANGUAGES } from '@/features/scribe/languages';
import { useTemplates } from '@/features/templates/use-templates';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { patientMeta } from '@/lib/format';
import { filterPatients } from '@/lib/patient-search';
import { rx } from '@/theme/rx';

type Mode = 'existing' | 'new';

function FieldLabel({ children }: { children: string }) {
  return (
    <Text weight="extrabold" className="mb-1.5 text-[11px] tracking-wider text-rx-label">
      {children}
    </Text>
  );
}

function SectionTitle({ children, className }: { children: string; className?: string }) {
  return (
    <Text weight="extrabold" className={`text-[14px] text-rx-ink ${className ?? ''}`}>
      {children}
    </Text>
  );
}

export default function NewScribeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();

  const [mode, setMode] = useState<Mode>('existing');
  const [selected, setSelected] = useState<{ id: number; name: string } | null>(null);
  const [inputValue, setInputValue] = useState(''); // immediate (field + client filter)
  const search = useDebouncedValue(inputValue.trim(), 400); // debounced (server query)

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<string | null>(null);

  const [templateId, setTemplateId] = useState<number | null>(null);
  const [language, setLanguage] = useState<string>('en');
  const [error, setError] = useState<string | null>(null);

  const { data: patients, isLoading: patientsLoading } = usePatients(search);
  const { data: templates, isLoading: templatesLoading } = useTemplates();
  const createPatient = useCreatePatient();

  // Client-side instant filter (mirrors server search) so results feel immediate.
  const filteredPatients = useMemo(
    () => filterPatients(patients?.patients ?? [], inputValue),
    [patients, inputValue],
  );

  // Default-select the first template so the CTA is ready (design shows a preselected chip).
  useEffect(() => {
    if (templateId === null && templates && templates.length > 0) setTemplateId(templates[0].id);
  }, [templates, templateId]);

  const hasSelection = mode === 'existing' ? selected !== null : name.trim().length > 0 && phone.trim().length > 0 && !!sex;
  const canStart = hasSelection && templateId !== null;

  const firstName = (selected?.name ?? name).trim().split(' ')[0];
  const startLabel =
    mode === 'existing'
      ? selected
        ? `Start recording · ${firstName}`
        : 'Select a patient'
      : name.trim()
        ? 'Add & start recording'
        : 'Enter patient details';

  async function onStart() {
    if (!canStart) return;
    setError(null);
    try {
      let patientId = selected?.id;
      let patientName = selected?.name;
      if (mode === 'new') {
        const created = await createPatient.mutateAsync({
          name: name.trim(),
          phone: phone.trim(),
          age: age ? Number(age) : undefined,
          sex: sex ?? undefined,
        });
        patientId = created.id;
        patientName = created.name;
      }
      router.replace({
        pathname: '/scribe-session',
        params: {
          patientId: String(patientId),
          patientName: patientName ?? '',
          templateId: String(templateId),
          language,
        },
      });
    } catch (e) {
      setError((e as Error)?.message ?? 'Could not start the session.');
    }
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      {/* Header */}
      <View className="flex-row items-center gap-[14px] px-5 pb-3 pt-2">
        <RoundIconButton name="chevron-back" size={20} onPress={() => router.back()} />
        <Text weight="extrabold" className="text-[18px] text-rx-ink">
          New visit
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={insets.top + 4}
      >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 24 }}
      >
        <Segmented
          className="mb-[18px]"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: 'existing', label: 'Existing patient' },
            { value: 'new', label: 'New patient' },
          ]}
        />

        {mode === 'existing' ? (
          <>
            <View className="mb-3 flex-row items-center gap-[9px] rounded-[14px] border border-rx-line2 bg-rx-surface px-[14px] py-[11px]">
              <Ionicons name="search" size={17} color="#B7B7B2" />
              <TextInput
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Search patients by name, MRN, phone"
                placeholderTextColor="#B7B7B2"
                autoCapitalize="words"
                className="flex-1 text-[14px] text-rx-ink"
                style={{ fontFamily: 'PlusJakartaSans' }}
              />
            </View>

            {patientsLoading && filteredPatients.length === 0 ? (
              <ActivityIndicator color={rx.accent} className="my-6" />
            ) : (
              <View className="gap-2">
                {filteredPatients.slice(0, 8).map((p: Patient) => {
                  const isSel = selected?.id === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setSelected({ id: p.id, name: p.name })}
                      className={`flex-row items-center gap-3 rounded-[16px] border-[1.5px] bg-rx-surface px-[14px] py-3 ${
                        isSel ? 'border-rx-accent' : 'border-rx-line'
                      }`}
                    >
                      <Avatar name={p.name} />
                      <View className="min-w-0 flex-1">
                        <Text weight="bold" numberOfLines={1} className="text-[14.5px] text-rx-ink">
                          {p.name}
                        </Text>
                        <Text weight="medium" className="text-[12px] text-rx-muted">
                          {patientMeta(p.age, p.sex) || p.medicalRecordNumber || 'Patient'}
                        </Text>
                      </View>
                      <View
                        className={`h-6 w-6 items-center justify-center rounded-full ${
                          isSel ? 'bg-rx-accent' : 'border-[1.5px] border-[#DCDBD6]'
                        }`}
                      >
                        {isSel ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                      </View>
                    </Pressable>
                  );
                })}
                {!patientsLoading && filteredPatients.length === 0 ? (
                  <Text weight="medium" className="mt-2 px-1 text-[13px] text-rx-muted">
                    No matches. Switch to “New patient” to add one.
                  </Text>
                ) : null}
              </View>
            )}
          </>
        ) : (
          <View className="rounded-[18px] border border-rx-line bg-rx-surface p-4">
            <FieldLabel>FULL NAME</FieldLabel>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Arjun Menon"
              placeholderTextColor="#B7B7B2"
              className="mb-4 border-b-[1.5px] border-rx-line pb-[10px] pt-1 text-[16px] text-rx-ink"
              style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}
            />
            <FieldLabel>PHONE NUMBER</FieldLabel>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. 9876543210"
              placeholderTextColor="#B7B7B2"
              keyboardType="phone-pad"
              className="mb-4 border-b-[1.5px] border-rx-line pb-[10px] pt-1 text-[16px] text-rx-ink"
              style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}
            />
            <View className="flex-row gap-[14px]">
              <View className="w-24">
                <FieldLabel>AGE</FieldLabel>
                <TextInput
                  value={age}
                  onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="32"
                  placeholderTextColor="#B7B7B2"
                  className="border-b-[1.5px] border-rx-line pb-[10px] pt-1 text-[16px] text-rx-ink"
                  style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}
                />
              </View>
              <View className="flex-1">
                <FieldLabel>SEX</FieldLabel>
                <View className="flex-row gap-[7px]">
                  {['Male', 'Female', 'Other'].map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setSex(s)}
                      className={`flex-1 items-center rounded-[11px] border-[1.5px] py-[9px] ${
                        sex === s ? 'border-rx-accent bg-rx-accent/[0.08]' : 'border-rx-line bg-rx-surface'
                      }`}
                    >
                      <Text weight="bold" className={`text-[12.5px] ${sex === s ? 'text-rx-accent' : 'text-rx-muted2'}`}>
                        {s}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {hasSelection ? (
          <View className="mt-[22px]">
            <SectionTitle className="mb-1">Visit language</SectionTitle>
            <Text weight="medium" className="mb-[11px] text-[12px] text-rx-muted">
              Set the language for this visit
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {SCRIBE_LANGUAGES.map((l) => (
                <Chip
                  key={l.code}
                  label={l.label}
                  selected={language === l.code}
                  onPress={() => setLanguage(l.code)}
                />
              ))}
            </View>

            <SectionTitle className="mb-[11px] mt-[22px]">Note template</SectionTitle>
            {templatesLoading ? (
              <ActivityIndicator color={rx.accent} className="my-2" />
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {(templates ?? []).map((t) => (
                  <Chip
                    key={t.id}
                    label={t.name}
                    selected={templateId === t.id}
                    onPress={() => setTemplateId(t.id)}
                  />
                ))}
              </View>
            )}
          </View>
        ) : null}

        {error ? (
          <Text weight="medium" className="mt-4 text-[13px] text-rx-accent">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      {/* Sticky CTA */}
      <View
        className="px-5 pt-3"
        style={{ paddingBottom: keyboardVisible ? 12 : Math.max(insets.bottom, 12) + 12 }}
      >
        <AccentButton
          label={startLabel}
          disabled={!canStart || createPatient.isPending}
          onPress={onStart}
          icon={<Ionicons name="mic" size={20} color="#fff" />}
        />
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
