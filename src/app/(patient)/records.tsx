import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { WhoSheet } from '@/app/(patient)/profile';
import { AddRecordSheet } from '@/features/patient/add-record-sheet';
import type { PatientOwnedDocument, PatientProfile, PatientVisit } from '@/features/patient/types';
import { usePatientDocuments } from '@/features/patient/use-patient-documents';
import { usePatientProfiles } from '@/features/patient/use-patient-profiles';
import { usePatientVisits } from '@/features/patient/use-patient-visits';
import { accentShadow, rx } from '@/theme/rx';

type EventKind = 'visit' | 'document';

interface TimelineEvent {
  key: string;
  kind: EventKind;
  title: string;
  at: Date;
  doctor?: string | null;
  preview?: string | null;
  onPress: () => void;
}

/**
 * Records tab — a per-person timeline.
 *
 * Horizontal profile selector (same shape as Add Visit), then every visit and
 * document for that profile on one vertical timeline, newest first. Tapping an
 * entry opens its detail screen.
 */
export default function PatientRecordsScreen() {
  const router = useRouter();
  const { data: profiles } = usePatientProfiles();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [whoOpen, setWhoOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Default to "self" until the user picks someone.
  const activeId = selectedId ?? (profiles ?? []).find((p) => p.profileType === 'self')?.id ?? null;

  const { data: visits, isLoading: visitsLoading, refetch: refetchVisits, isRefetching } =
    usePatientVisits(activeId ?? undefined);
  const { data: documents, isLoading: docsLoading, refetch: refetchDocs } = usePatientDocuments(
    activeId ?? undefined,
  );

  const events = useMemo<TimelineEvent[]>(() => {
    const fromVisits = (visits ?? []).map<TimelineEvent>((v) => ({
      key: `visit-${v.id}`,
      kind: 'visit',
      title: visitTitle(v),
      at: new Date(v.visitDate),
      doctor: v.doctorName,
      preview: previewOf(v),
      onPress: () => router.push(`/patient/visit/${v.id}`),
    }));

    const fromDocs = (documents ?? []).map<TimelineEvent>((d) => ({
      key: `doc-${d.id}`,
      kind: 'document',
      title: documentTitle(d),
      at: new Date(d.documentDate ?? d.createdAt),
      preview: d.summary,
      onPress: () => router.push(`/patient/document/${d.id}`),
    }));

    return [...fromVisits, ...fromDocs]
      .filter((e) => !Number.isNaN(e.at.getTime()))
      .sort((a, b) => b.at.getTime() - a.at.getTime());
  }, [visits, documents, router]);

  const isLoading = visitsLoading || docsLoading;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      <View className="flex-row items-center justify-between px-5 pb-3 pt-3">
        <Text weight="extrabold" className="text-[24px] tracking-tight text-rx-ink">
          Records
        </Text>
        <Pressable
          onPress={() => setAddOpen(true)}
          accessibilityLabel="Add a record"
          className="h-11 w-11 items-center justify-center rounded-full bg-rx-accent active:opacity-85"
          style={accentShadow()}
        >
          <Ionicons name="add" size={24} color={rx.onAccent} />
        </Pressable>
      </View>

      {/* Care-member selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // flexGrow:0 — without it this stretches to fill the column and leaves a
        // large dead gap above the timeline.
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 14, gap: 14 }}
      >
        {(profiles ?? []).map((p) => (
          <PersonChip
            key={p.id}
            profile={p}
            selected={p.id === activeId}
            onPress={() => setSelectedId(p.id)}
          />
        ))}
        <Pressable onPress={() => setWhoOpen(true)} className="w-[60px] items-center gap-1.5">
          <View className="h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-rx-seg">
            <Ionicons name="add" size={20} color={rx.muted} />
          </View>
          <Text weight="semibold" numberOfLines={1} className="text-[12.5px] text-rx-muted">
            Add
          </Text>
        </Pressable>
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetchVisits();
              void refetchDocs();
            }}
            tintColor={rx.accent}
          />
        }
      >
        {isLoading ? (
          <Text weight="medium" className="mt-6 text-center text-[13.5px] text-rx-muted">
            Loading…
          </Text>
        ) : events.length === 0 ? (
          <View className="mt-8 items-center px-6">
            <Text weight="bold" className="text-[15px] text-rx-ink">
              Nothing here yet
            </Text>
            <Text weight="medium" className="mt-1.5 text-center text-[13px] leading-[18px] text-rx-muted">
              Record a visit or upload a document and it&apos;ll appear on this timeline.
            </Text>
          </View>
        ) : (
          events.map((event, i) => (
            <TimelineRow key={event.key} event={event} last={i === events.length - 1} />
          ))
        )}
      </ScrollView>

      <AddRecordSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        profileId={activeId}
      />

      <WhoSheet
        open={whoOpen}
        onClose={() => setWhoOpen(false)}
        onChoose={(kind) => {
          setWhoOpen(false);
          router.push({ pathname: '/patient/profiles/new', params: { kind } });
        }}
      />
    </SafeAreaView>
  );
}

function PersonChip({
  profile,
  selected,
  onPress,
}: {
  profile: PatientProfile;
  selected: boolean;
  onPress: () => void;
}) {
  const isPet = profile.profileType === 'pet';
  return (
    <Pressable onPress={onPress} className="w-[60px] items-center gap-1.5">
      <View
        className="h-[52px] w-[52px] items-center justify-center rounded-[16px]"
        style={{
          backgroundColor: isPet ? rx.successBg : rx.accentTint,
          borderWidth: selected ? 2 : 0,
          borderColor: rx.ink,
        }}
      >
        <Text weight="bold" className="text-[15px]" style={{ color: isPet ? rx.success : rx.accent }}>
          {initialsOf(profile.name)}
        </Text>
      </View>
      <Text
        weight={selected ? 'bold' : 'semibold'}
        numberOfLines={1}
        className={`text-[12.5px] ${selected ? 'text-rx-ink' : 'text-rx-muted'}`}
      >
        {profile.profileType === 'self' ? 'You' : profile.name}
      </Text>
    </Pressable>
  );
}

function TimelineRow({ event, last }: { event: TimelineEvent; last: boolean }) {
  return (
    <Pressable onPress={event.onPress} className="flex-row gap-3 active:opacity-70">
      {/* Rail: icon node + connecting line */}
      <View className="items-center">
        <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-rx-subtle">
          <Ionicons
            name={event.kind === 'visit' ? 'medkit-outline' : 'document-text-outline'}
            size={18}
            color={rx.muted2}
          />
        </View>
        {!last ? <View className="w-px flex-1 bg-rx-line" /> : null}
      </View>

      <View className={`flex-1 ${last ? 'pb-2' : 'pb-6'}`}>
        <Text weight="bold" numberOfLines={2} className="text-[15px] leading-[21px] text-rx-ink">
          {event.title}
        </Text>
        <Text weight="medium" className="mt-0.5 text-[12.5px] text-rx-muted">
          {formatWhen(event.at)}
        </Text>

        {event.doctor ? (
          <View className="mt-1.5 flex-row">
            <View className="flex-row items-center gap-1.5 rounded-lg bg-rx-subtle px-2.5 py-1">
              <Ionicons name="person-outline" size={11} color={rx.muted2} />
              <Text weight="semibold" className="text-[11.5px] text-rx-ink2">
                {event.doctor}
              </Text>
            </View>
          </View>
        ) : null}

        {event.preview ? (
          <Text weight="medium" numberOfLines={2} className="mt-1.5 text-[13px] leading-[19px] text-rx-muted2">
            {event.preview}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const DOC_LABEL: Record<string, string> = {
  lab_result: 'Lab result',
  prescription: 'Prescription',
  imaging: 'Imaging',
  discharge_summary: 'Discharge summary',
  insurance: 'Insurance',
  receipt: 'Receipt',
  photo: 'Photo',
  other: 'Document',
};

/**
 * Uploads land with generated filenames like "92422cc6-…-1245464ee987.jpeg",
 * which is noise on a timeline. Prefer the title, then a type label, and only
 * fall back to the raw filename when it looks human-written.
 */
function documentTitle(d: PatientOwnedDocument): string {
  const title = d.title?.trim();
  if (title) return title;
  const generated = /^[0-9a-f]{8}-[0-9a-f-]{20,}\.[a-z0-9]+$/i.test(d.filename);
  if (generated) return DOC_LABEL[d.documentType] ?? 'Document';
  return d.filename;
}

function visitTitle(v: PatientVisit): string {
  return v.summary?.title?.trim() || v.visitReason?.trim() || 'New visit';
}

function previewOf(v: PatientVisit): string | null {
  const points = v.summary?.keyPoints;
  if (points?.length) return points[0];
  if (v.status === 'processing' || v.status === 'recording') return 'Summarizing…';
  if (v.status === 'failed') return v.errorMessage ?? 'Could not summarize this visit.';
  return null;
}

function formatWhen(d: Date): string {
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString(
    undefined,
    { hour: 'numeric', minute: '2-digit' },
  )}`;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export type { PatientOwnedDocument };
