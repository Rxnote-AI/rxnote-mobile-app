import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { useToast } from '@/components/ui/toast';
import { CareJourneyEntries, VisitChipRow } from '@/features/care-journey/care-journey-list';
import { EditEntrySheet } from '@/features/care-journey/edit-entry-sheet';
import type { CareJourneyEntry } from '@/features/care-journey/types';
import type { Visit } from '@/features/patients/types';
import { useDeletePatient } from '@/features/patients/use-delete-patient';
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

type Tab = 'visits' | 'note' | 'transcript' | 'care-journey';

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

/** Header "⋮" menu — currently just "Delete patient", built to grow with more options later. */
function PatientOptionsSheet({
  open,
  onClose,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-[rgba(15,15,17,0.42)]" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-[26px] bg-rx-bg px-5 pb-[34px] pt-[10px]"
        >
          <View className="mx-auto mb-[18px] h-[5px] w-[38px] rounded-[5px] bg-[#DCDBD6]" />
          <Pressable
            onPress={() => {
              onClose();
              onDelete();
            }}
            className="flex-row items-center gap-[13px] rounded-[16px] border-[1.5px] border-rx-line bg-rx-surface px-4 py-[14px] active:opacity-80"
          >
            <View className="h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-rx-accent/[0.1]">
              <Ionicons name="trash-outline" size={18} color={rx.accent} />
            </View>
            <View className="flex-1">
              <Text weight="bold" className="text-[14.5px] text-rx-accent">
                Delete patient
              </Text>
              <Text weight="medium" className="text-[12px] text-rx-muted">
                Permanently remove this patient and their records
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
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
  const { id, name, visitId } = useLocalSearchParams<{ id: string; name?: string; visitId?: string }>();
  const router = useRouter();
  // Arriving with a visitId (e.g. "View SOAP note" from Care Journey) jumps straight to
  // that visit's note; otherwise land on the visit list first, per the Patient Record flow.
  const [tab, setTab] = useState<Tab>(visitId ? 'note' : 'visits');
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(visitId ? Number(visitId) : null);
  const [cjVisitId, setCjVisitId] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<CareJourneyEntry | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data, isLoading, refetch, isRefetching } = usePatientVisits(id);
  const { mutate: deletePatient, isPending: isDeleting } = useDeletePatient();
  const visits = data ?? [];
  const patientName = name ?? 'Patient';
  const lastVisit = visits[0]?.dateOfVisit ? relativeDay(visits[0].dateOfVisit) : 'today';

  const confirmDeletePatient = () => {
    Alert.alert(
      `Delete ${patientName}?`,
      'This permanently removes their records, visits, and care journey entries. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            deletePatient(Number(id), {
              onSuccess: () => {
                toast.show({ message: 'Patient deleted', kind: 'success' });
                router.replace('/patients');
              },
            }),
        },
      ],
    );
  };

  // The selected visit (or the most recent) drives the Note + Transcript tabs; the
  // Visits tab lists every real visit and lets you open any one of them.
  const active = visits.find((v) => v.id === selectedVisitId) ?? visits[0];
  const activeDate = active?.dateOfVisit ? relativeDay(active.dateOfVisit) : '';
  const activeNoteRaw = active?.soapNoteJson
    ? (typeof active.soapNoteJson === 'string' ? active.soapNoteJson : JSON.stringify(active.soapNoteJson))
    : active?.soapNote ?? null;
  const noteSections = parseStoredNote(activeNoteRaw);
  const hasRealNote = noteSections.length > 0;
  const realTranscript = active?.transcriptionText?.trim() || '';

  // The Care Journey tab has no "General" chip here (unlike the standalone Care
  // Journey screen) — a visit is always the active filter, so default to the most
  // recent one as soon as visits load. Only fires while nothing's been picked yet.
  useEffect(() => {
    if (cjVisitId === null && visits.length > 0) {
      setCjVisitId(visits[0].id);
    }
  }, [visits, cjVisitId]);

  const openVisit = (v: Visit) => {
    setSelectedVisitId(v.id);
    setTab('note');
  };

  const addCareJourneyForVisit = (v: Visit) => {
    router.push({
      pathname: '/patient/care-journey/record',
      params: { patientId: id, patientName, visitId: String(v.id) },
    });
  };

  const openRecordEntry = () => {
    router.push({
      pathname: '/patient/care-journey/record',
      params: { patientId: id, patientName, visitId: cjVisitId ? String(cjVisitId) : '' },
    });
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2">
        <RoundIconButton name="chevron-back" size={20} onPress={() => router.back()} />
        <Text weight="extrabold" className="text-[16px] text-rx-ink">
          Patient record
        </Text>
        <RoundIconButton name="ellipsis-vertical" size={18} onPress={() => setOptionsOpen(true)} />
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
        <TabButton label="Visits" active={tab === 'visits'} onPress={() => setTab('visits')} />
        <TabButton label="Note" active={tab === 'note'} onPress={() => setTab('note')} />
        <TabButton label="Transcript" active={tab === 'transcript'} onPress={() => setTab('transcript')} />
        <TabButton label="Journey" active={tab === 'care-journey'} onPress={() => setTab('care-journey')} />
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
        ) : tab === 'visits' ? (
          visits.length > 0 ? (
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
                      <View className="flex-row items-center gap-[9px]">
                        {isInProgress ? <Badge label="Generating…" tone="accent" /> : null}
                        {isFailed ? <Badge label="Failed" tone="accent" /> : null}
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            addCareJourneyForVisit(v);
                          }}
                          hitSlop={8}
                          accessibilityLabel="Add care journey entry for this visit"
                          className="h-7 w-7 items-center justify-center rounded-full bg-rx-accent/[0.1] active:opacity-80"
                        >
                          <Ionicons name="mic-outline" size={13} color={rx.accent} />
                        </Pressable>
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
          )
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
        ) : (
          <View>
            <View className="mb-4 flex-row items-center justify-between">
              <Text weight="extrabold" className="text-[15px] text-rx-ink">
                Care Journey
              </Text>
              <Pressable
                onPress={openRecordEntry}
                style={{ shadowColor: rx.accent, shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }}
                className="h-9 flex-row items-center gap-[6px] rounded-full bg-rx-accent px-[13px] active:opacity-90"
              >
                <Ionicons name="mic" size={13} color="#fff" />
                <Text weight="bold" className="text-[12.5px] text-white">
                  Record
                </Text>
              </Pressable>
            </View>

            <VisitChipRow
              patientId={Number(id)}
              selectedVisitId={cjVisitId}
              onSelect={setCjVisitId}
              showGeneral={false}
            />

            <View className="mt-4">
              <CareJourneyEntries
                patientId={Number(id)}
                filterVisitId={cjVisitId}
                onEdit={setEditingEntry}
                onViewVisit={(vid) => {
                  setSelectedVisitId(vid);
                  setTab('note');
                }}
              />
            </View>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      <EditEntrySheet entry={editingEntry} patientId={Number(id)} onClose={() => setEditingEntry(null)} />

      <PatientOptionsSheet
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        onDelete={confirmDeletePatient}
      />

      {isDeleting ? (
        <View className="absolute inset-0 items-center justify-center bg-[rgba(15,15,17,0.25)]">
          <ActivityIndicator color={rx.accent} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
