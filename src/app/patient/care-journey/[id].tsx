import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { RoundIconButton } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import { CareJourneyEntries, VisitChipRow } from '@/features/care-journey/care-journey-list';
import { EditEntrySheet } from '@/features/care-journey/edit-entry-sheet';
import type { CareJourneyEntry } from '@/features/care-journey/types';
import { useCareJourneys } from '@/features/care-journey/use-care-journeys';
import { rx } from '@/theme/rx';

export default function PatientCareJourneyScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const patientId = Number(id);
  const patientName = name ?? 'Patient';

  const { data: entries, refetch, isRefetching } = useCareJourneys(patientId);

  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [editing, setEditing] = useState<CareJourneyEntry | null>(null);

  // Header stat mirrors whichever slice (General / a specific visit) is currently shown.
  const visibleCount = (entries ?? []).filter((e) => (e.visitId ?? null) === selectedVisitId).length;

  const openRecord = () => {
    router.push({
      pathname: '/patient/care-journey/record',
      params: {
        patientId: String(patientId),
        patientName,
        visitId: selectedVisitId ? String(selectedVisitId) : '',
      },
    });
  };

  const viewVisitNote = (visitId: number) => {
    router.push({
      pathname: '/patient/[id]',
      params: { id: String(patientId), name: patientName, visitId: String(visitId) },
    });
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2">
        <RoundIconButton name="chevron-back" size={20} onPress={() => router.back()} />
        <Text weight="extrabold" className="text-[16px] text-rx-ink">
          Care Journey
        </Text>
        <View style={{ width: 38 }} />
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
              {visibleCount} {visibleCount === 1 ? 'entry' : 'entries'} · {selectedVisitId === null ? 'General' : 'this visit'}
            </Text>
          </View>
          <Pressable
            onPress={openRecord}
            style={{ shadowColor: rx.accent, shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } }}
            className="h-11 flex-row items-center gap-[7px] rounded-[14px] bg-rx-accent px-[15px] active:opacity-90"
          >
            <Ionicons name="mic" size={16} color="#fff" />
            <Text weight="bold" className="text-[13.5px] text-white">
              Record
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Visit context — which visit new entries are tagged to */}
      <View className="mt-3 px-5">
        <VisitChipRow patientId={patientId} selectedVisitId={selectedVisitId} onSelect={setSelectedVisitId} />
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 24) }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={rx.accent} colors={[rx.accent]} />
        }
      >
        <CareJourneyEntries
          patientId={patientId}
          filterVisitId={selectedVisitId}
          onEdit={setEditing}
          onViewVisit={viewVisitNote}
        />
      </ScrollView>

      <EditEntrySheet entry={editing} patientId={patientId} onClose={() => setEditing(null)} />
    </SafeAreaView>
  );
}
