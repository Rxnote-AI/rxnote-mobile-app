import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Badge, RoundIconButton } from '@/components/ui/controls';
import { SoapSections } from '@/components/ui/soap-card';
import { Text } from '@/components/ui/text';
import type { Visit } from '@/features/patients/types';
import { usePatientVisits } from '@/features/patients/use-patient-visits';
import {
  SAMPLE_CHIEF,
  SAMPLE_HISTORY,
  SAMPLE_SOAP,
  SAMPLE_TRANSCRIPT,
  SAMPLE_VITALS,
} from '@/features/scribe/sample-note';
import { noteSummary, parseStoredNote } from '@/features/scribe/soap-to-sections';
import { relativeDay } from '@/lib/format';
import { rx } from '@/theme/rx';

type Tab = 'note' | 'transcript' | 'history';

/** Strip light markdown so a note excerpt reads as plain text. */
function excerpt(note: string | null, max = 150): string {
  if (!note) return '';
  const clean = note
    .replace(/\r\n/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function Vital({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-[14px] border border-rx-line bg-rx-surface px-3 py-[11px]">
      <Text weight="bold" className="text-[10px] text-rx-muted">
        {label}
      </Text>
      <Text weight="extrabold" className="mt-0.5 text-[15px] text-rx-ink">
        {value}
      </Text>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center pb-3"
      style={{ borderBottomWidth: 2.5, borderBottomColor: active ? rx.accent : 'transparent', marginBottom: -1 }}
    >
      <Text
        weight={active ? 'extrabold' : 'semibold'}
        className={active ? 'text-[13.5px] text-rx-ink' : 'text-[13.5px] text-rx-label'}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function PatientDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('note');
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch, isRefetching } = usePatientVisits(id);
  const visits = data ?? [];
  const patientName = name ?? 'Patient';
  const lastVisit = visits[0]?.dateOfVisit ? relativeDay(visits[0].dateOfVisit) : 'today';

  // The selected visit (or the most recent) drives the Note + Transcript tabs; the
  // History tab lists every real visit and lets you open any one of them.
  const active = visits.find((v) => v.id === selectedVisitId) ?? visits[0];
  const activeDate = active?.dateOfVisit ? relativeDay(active.dateOfVisit) : '';
  const activeNoteRaw = active?.soapNoteJson
    ? (typeof active.soapNoteJson === 'string' ? active.soapNoteJson : JSON.stringify(active.soapNoteJson))
    : active?.soapNote ?? null;
  const noteSections = parseStoredNote(activeNoteRaw);
  const hasRealNote = noteSections.length > 0;
  const realTranscript = active?.transcriptionText?.trim() || '';

  const openVisit = (v: Visit) => {
    setSelectedVisitId(v.id);
    setTab('note');
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2">
        <RoundIconButton name="chevron-back" size={20} onPress={() => router.back()} />
        <Text weight="extrabold" className="text-[16px] text-rx-ink">
          Patient record
        </Text>
        <RoundIconButton name="ellipsis-vertical" size={18} />
      </View>

      {/* Patient card */}
      <View className="px-5 pt-[14px]">
        <View className="flex-row items-center gap-[13px] rounded-[20px] border border-rx-line bg-rx-surface p-4">
          <Avatar name={patientName} className="h-[50px] w-[50px] rounded-[15px]" textClassName="text-[16px]" />
          <View className="min-w-0 flex-1">
            <Text weight="extrabold" numberOfLines={1} className="text-[17px] text-rx-ink">
              {patientName}
            </Text>
            <Text weight="medium" className="text-[12.5px] text-rx-muted">
              {visits.length} {visits.length === 1 ? 'note' : 'notes'} · Last visit {lastVisit}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push({ pathname: '/new-scribe', params: { patientId: id, patientName } })}
            style={{ shadowColor: rx.accent, shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } }}
            className="h-11 flex-row items-center gap-[7px] rounded-[14px] bg-rx-accent px-[15px] active:opacity-90"
          >
            <Ionicons name="mic" size={16} color="#fff" />
            <Text weight="bold" className="text-[13.5px] text-white">
              New visit
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <View className="mx-5 mt-4 flex-row border-b border-[#EAE9E5]">
        <TabButton label="Note" active={tab === 'note'} onPress={() => setTab('note')} />
        <TabButton label="Transcript" active={tab === 'transcript'} onPress={() => setTab('transcript')} />
        <TabButton label="History" active={tab === 'history'} onPress={() => setTab('history')} />
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 24) }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={rx.accent} colors={[rx.accent]} />
        }
      >
        {isLoading ? (
          <ActivityIndicator color={rx.accent} className="mt-8" />
        ) : tab === 'note' ? (
          hasRealNote ? (
            <View>
              <View className="mb-3 flex-row items-center justify-between px-0.5">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="pencil" size={13} color="#A2A4AB" />
                  <Text weight="semibold" className="text-[11.5px] text-[#A2A4AB]">
                    Tap any line to review & edit
                  </Text>
                </View>
                {activeDate ? (
                  <Text weight="bold" className="text-[11.5px] text-rx-muted">
                    {activeDate}
                  </Text>
                ) : null}
              </View>
              <SoapSections
                sections={noteSections}
                compact
                visitId={active?.id}
                patientId={Number(id)}
                rawNote={active?.soapNoteJson ?? active?.soapNote}
              />
            </View>
          ) : visits.length > 0 ? (
            <View className="mt-6 items-center px-8">
              <Ionicons name="document-text-outline" size={28} color={rx.faint} />
              <Text weight="semibold" className="mt-3 text-center text-[13.5px] text-rx-muted">
                {active?.processing_status && active.processing_status !== 'completed'
                  ? 'This note is still being generated.'
                  : 'No structured note for this visit.'}
              </Text>
            </View>
          ) : (
            // No visits yet — show the design sample so the record isn't empty.
            <View>
              <View className="mb-3 rounded-[16px] border border-rx-line bg-rx-surface px-4 py-[14px]">
                <Text weight="bold" className="mb-1 text-[11px] tracking-wide text-rx-muted">
                  CHIEF COMPLAINT
                </Text>
                <Text weight="semibold" className="text-[13.5px] leading-[19px] text-rx-ink">
                  {SAMPLE_CHIEF}
                </Text>
              </View>
              <View className="mb-3 flex-row gap-2">
                {SAMPLE_VITALS.map((v) => (
                  <Vital key={v.label} {...v} />
                ))}
              </View>
              <SoapSections sections={SAMPLE_SOAP} compact />
            </View>
          )
        ) : tab === 'transcript' ? (
          realTranscript ? (
            <View className="rounded-[16px] border border-rx-line bg-rx-surface p-4">
              <Text className="text-[13.5px] leading-[21px] text-rx-ink2">{realTranscript}</Text>
            </View>
          ) : visits.length > 0 ? (
            <View className="mt-6 items-center px-8">
              <Ionicons name="mic-off-outline" size={28} color={rx.faint} />
              <Text weight="semibold" className="mt-3 text-center text-[13.5px] text-rx-muted">
                No transcript was saved for this visit.
              </Text>
            </View>
          ) : (
            <View className="rounded-[16px] border border-rx-line bg-rx-surface p-4">
              {SAMPLE_TRANSCRIPT.map((t, i) => (
                <View key={i} className="mb-[13px]">
                  <Text
                    weight="bold"
                    className="mb-0.5 text-[10.5px] tracking-wide"
                    style={{ color: t.isDoc ? rx.accent : rx.muted }}
                  >
                    {t.who}
                  </Text>
                  <Text className="text-[13.5px] leading-5 text-rx-ink2">{t.text}</Text>
                </View>
              ))}
            </View>
          )
        ) : visits.length > 0 ? (
          <View className="gap-[10px]">
            {visits.map((v: Visit) => {
              const isInProgress =
                !!v.processing_status &&
                v.processing_status !== 'completed' &&
                v.processing_status !== 'failed' &&
                !v.soapNote;
              const isFailed = v.processing_status === 'failed';
              return (
                <Pressable
                  key={v.id}
                  onPress={() => openVisit(v)}
                  className="rounded-[16px] border border-rx-line bg-rx-surface px-4 py-[14px] active:opacity-80"
                >
                  <View className="mb-1.5 flex-row items-center justify-between">
                    <Text weight="extrabold" className="text-[13.5px] text-rx-ink">
                      {relativeDay(v.dateOfVisit)}
                    </Text>
                    <View className="flex-row items-center gap-[7px]">
                      <Badge label="SOAP" />
                      {isInProgress ? <Badge label="Generating…" tone="accent" /> : null}
                      {isFailed ? <Badge label="Failed" tone="accent" /> : null}
                      <Ionicons name="chevron-forward" size={13} color={rx.faint} />
                    </View>
                  </View>
                  <Text weight="medium" numberOfLines={2} className="text-[13px] leading-[19px] text-[#5A5C62]">
                    {isInProgress
                      ? 'Note is being generated on the server…'
                      : noteSummary(v.soapNote) || excerpt(v.additionalNotes) || 'No note generated for this visit.'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View className="gap-[10px]">
            {SAMPLE_HISTORY.map((h, i) => (
              <View key={i} className="rounded-[16px] border border-rx-line bg-rx-surface px-4 py-[14px]">
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text weight="extrabold" className="text-[13.5px] text-rx-ink">
                    {h.date}
                  </Text>
                  <View className="flex-row items-center gap-[7px]">
                    <Badge label={h.type} />
                    {h.code ? <Badge label={h.code} tone="accent" /> : null}
                  </View>
                </View>
                <Text weight="medium" className="text-[13px] leading-[19px] text-[#5A5C62]">
                  {h.summary}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
