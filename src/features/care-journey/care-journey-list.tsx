import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';

import { Badge } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import type { Visit } from '@/features/patients/types';
import { usePatientVisits } from '@/features/patients/use-patient-visits';
import { relativeDay } from '@/lib/format';
import { rx } from '@/theme/rx';
import { careTypeMeta } from './care-type';
import type { CareJourneyEntry } from './types';
import { useCareJourneys } from './use-care-journeys';
import { useDeleteCareJourney } from './use-delete-care-journey';

function entryDate(e: CareJourneyEntry): Date {
  return new Date(e.recordedAt ?? e.createdAt ?? Date.now());
}
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function formatDateHeader(d: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today)) return 'Today';
  if (dayKey(d) === dayKey(yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}
function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
/** "- point" / "• point" lines → plain bullet text (AI key points are stored this way). */
function summaryPoints(summary: string | null): string[] {
  return (summary ?? '')
    .split('\n')
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

/** Horizontal chip row — which visit (or none) a new Care Journey entry should tag to. */
export function VisitChipRow({
  patientId,
  selectedVisitId,
  onSelect,
  showGeneral = true,
}: {
  patientId: number;
  selectedVisitId: number | null;
  onSelect: (visitId: number | null) => void;
  /** Hide the "General" (untagged) chip — used where a visit is always selected instead. */
  showGeneral?: boolean;
}) {
  const { data: visits } = usePatientVisits(patientId);
  if (!visits || visits.length === 0) return null;

  return (
    <View>
      <Text weight="bold" className="mb-2 text-[9.5px] tracking-wide text-rx-label">
        VIEW BY VISIT
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {showGeneral ? (
          <VisitChip label="General" active={selectedVisitId === null} onPress={() => onSelect(null)} />
        ) : null}
        {visits.map((v: Visit) => (
          <VisitChip
            key={v.id}
            label={`Visit · ${relativeDay(v.dateOfVisit)}`}
            active={selectedVisitId === v.id}
            onPress={() => onSelect(v.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function VisitChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={
        active
          ? 'rounded-full bg-rx-accent px-[13px] py-[7px]'
          : 'rounded-full border border-rx-line bg-rx-surface px-[13px] py-[7px]'
      }
    >
      <Text weight="bold" className={active ? 'text-[12px] text-white' : 'text-[12px] text-rx-muted2'}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Flat (non-scrolling) timeline of a patient's Care Journey entries, grouped by day.
 * Renders as plain content so it can sit inside whichever ScrollView the caller owns
 * (the standalone Care Journey screen, or the Patient Record page's shared scroll body).
 *
 * `filterVisitId` partitions the timeline per visit — `null` shows only untagged
 * ("General") entries, a visit id shows only entries tagged to that visit. This is a
 * deliberate product choice: each visit gets its own slice of the journey rather than
 * one combined feed.
 */
export function CareJourneyEntries({
  patientId,
  filterVisitId,
  onEdit,
  onViewVisit,
}: {
  patientId: number;
  filterVisitId: number | null;
  onEdit: (entry: CareJourneyEntry) => void;
  onViewVisit?: (visitId: number) => void;
}) {
  const toast = useToast();
  const { data: entries, isLoading } = useCareJourneys(patientId);
  const { mutate: deleteEntry } = useDeleteCareJourney();

  const filtered = (entries ?? []).filter((e) => (e.visitId ?? null) === filterVisitId);

  const groups: CareJourneyEntry[][] = [];
  {
    const map = new Map<string, CareJourneyEntry[]>();
    for (const entry of filtered) {
      const key = dayKey(entryDate(entry));
      const bucket = map.get(key);
      if (bucket) bucket.push(entry);
      else map.set(key, [entry]);
    }
    groups.push(...Array.from(map.values()));
  }

  const confirmDelete = (entry: CareJourneyEntry) => {
    Alert.alert('Delete entry?', 'This care journey entry will be removed permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteEntry(
            { id: entry.id, patientId },
            { onSuccess: () => toast.show({ message: 'Entry deleted', kind: 'success' }) },
          ),
      },
    ]);
  };

  if (isLoading) {
    return <ActivityIndicator color={rx.accent} className="mt-8" />;
  }

  if (filtered.length === 0) {
    return (
      <View className="mt-6 items-center px-8">
        <Ionicons name="pulse-outline" size={30} color={rx.faint} />
        <Text weight="bold" className="mt-3 text-center text-[14.5px] text-rx-ink">
          {filterVisitId === null ? 'No entries yet' : 'No entries for this visit yet'}
        </Text>
        <Text weight="medium" className="mt-1 text-center text-[13px] leading-[19px] text-rx-muted">
          {filterVisitId === null
            ? 'Record vitals, medication changes, or observations not tied to a visit.'
            : 'Record an update and it will show up here, tagged to this visit.'}
        </Text>
      </View>
    );
  }

  return (
    <>
      {groups.map((groupEntries) => (
        <View key={dayKey(entryDate(groupEntries[0]))} className="mb-5">
          <View className="mb-2.5 flex-row items-center gap-2">
            <Text weight="extrabold" className="text-[13.5px] text-rx-ink">
              {formatDateHeader(entryDate(groupEntries[0]))}
            </Text>
            <Text weight="semibold" className="text-[11px] text-rx-muted">
              {groupEntries.length} {groupEntries.length === 1 ? 'entry' : 'entries'}
            </Text>
            <View className="h-px flex-1 bg-rx-hairline" />
          </View>
          <View className="gap-[10px]">
            {groupEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onEdit={() => onEdit(entry)}
                onDelete={() => confirmDelete(entry)}
                onViewVisit={onViewVisit}
              />
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

function EntryCard({
  entry,
  onEdit,
  onDelete,
  onViewVisit,
}: {
  entry: CareJourneyEntry;
  onEdit: () => void;
  onDelete: () => void;
  onViewVisit?: (visitId: number) => void;
}) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const meta = careTypeMeta(entry.careType);
  const points = summaryPoints(entry.summary);
  const hasSummary = points.length > 0;
  const transcript = entry.transcriptionText?.trim() ?? '';
  const isLong = transcript.length > 200;
  const displayText = isLong && !expanded ? `${transcript.slice(0, 200)}…` : transcript;

  return (
    <View className="rounded-[16px] border border-rx-line bg-rx-surface px-4 py-[14px]">
      {/* Top row: time + actions */}
      <View className="flex-row items-center justify-between">
        <Text weight="bold" className="text-[13px] text-rx-ink">
          {formatTime(entryDate(entry))}
        </Text>
        <View className="flex-row items-center gap-1">
          <Pressable onPress={onEdit} hitSlop={8} className="h-7 w-7 items-center justify-center rounded-full active:bg-rx-hairline">
            <Ionicons name="pencil-outline" size={15} color={rx.faint} />
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8} className="h-7 w-7 items-center justify-center rounded-full active:bg-rx-hairline">
            <Ionicons name="trash-outline" size={15} color={rx.faint} />
          </Pressable>
        </View>
      </View>

      {/* Badges */}
      <View className="mt-2 flex-row flex-wrap items-center gap-[7px]">
        <View className="flex-row items-center gap-[5px] rounded-lg bg-rx-hairline px-[9px] py-1">
          <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: meta.dotColor }} />
          <Text weight="bold" className="text-[11px] text-rx-muted2">
            {meta.label}
          </Text>
        </View>
        <View className="flex-row items-center gap-[4px] rounded-lg bg-rx-hairline px-[9px] py-1">
          <Ionicons name="person-outline" size={10} color={rx.muted2} />
          <Text weight="bold" className="text-[11px] text-rx-muted2">
            {entry.recordedBy}
          </Text>
        </View>
        {entry.visitId ? (
          onViewVisit ? (
            <Pressable
              onPress={() => onViewVisit(entry.visitId as number)}
              className="flex-row items-center gap-[4px] rounded-lg bg-rx-accent/[0.1] px-[9px] py-1 active:opacity-80"
            >
              <Ionicons name="document-text-outline" size={10} color={rx.accent} />
              <Text weight="bold" className="text-[11px] text-rx-accent">
                View SOAP note
              </Text>
            </Pressable>
          ) : (
            <Badge label="Linked to visit" />
          )
        ) : null}
      </View>

      {/* Content */}
      {hasSummary ? (
        <View className="mt-2.5">
          <View className="mb-1.5 flex-row items-center gap-[5px]">
            <Ionicons name="sparkles-outline" size={11} color={rx.faint} />
            <Text weight="bold" className="text-[10.5px] tracking-wide text-rx-label">
              KEY POINTS
            </Text>
          </View>
          {points.map((point, i) => (
            <View key={i} className="mb-1 flex-row gap-[6px]">
              <Text className="text-[13.5px] leading-[20px] text-rx-faint">-</Text>
              <Text className="flex-1 text-[13.5px] leading-[20px] text-rx-ink2">{point}</Text>
            </View>
          ))}
          {transcript ? (
            <Pressable onPress={() => setShowTranscript((v) => !v)} className="mt-1.5 flex-row items-center gap-1">
              <Ionicons name={showTranscript ? 'chevron-up' : 'chevron-down'} size={12} color={rx.muted} />
              <Text weight="semibold" className="text-[11.5px] text-rx-muted">
                {showTranscript ? 'Hide transcript' : 'Show transcript'}
              </Text>
            </Pressable>
          ) : null}
          {showTranscript && transcript ? (
            <View className="mt-2 rounded-[12px] bg-rx-hairline p-3">
              <Text className="text-[13px] leading-[19px] text-rx-muted2">{transcript}</Text>
            </View>
          ) : null}
        </View>
      ) : transcript ? (
        <View className="mt-2.5">
          <Text className="text-[13.5px] leading-[20px] text-rx-ink2">
            {displayText}
            {isLong ? (
              <Text weight="semibold" className="text-[12px] text-rx-muted" onPress={() => setExpanded((v) => !v)}>
                {'  '}
                {expanded ? 'Show less' : 'Show more'}
              </Text>
            ) : null}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
