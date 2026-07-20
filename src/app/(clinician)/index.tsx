import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/controls';
import { ProcessingCard } from '@/components/ui/processing-card';
import { Text } from '@/components/ui/text';
import type { Patient } from '@/features/patients/types';
import { usePatients } from '@/features/patients/use-patients';
import { useProcessingStore, useProcessingVisitStatus } from '@/hooks/use-processing-visits';
import { greeting, patientMeta, relativeDay } from '@/lib/format';
import { accentShadow, rx } from '@/theme/rx';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Most-recent-visit first, then alphabetical (mirrors the web patients list). */
function byRecentVisit(a: Patient, b: Patient): number {
  if (a.lastVisit && b.lastVisit) {
    return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
  }
  if (a.lastVisit) return -1;
  if (b.lastVisit) return 1;
  return a.name.localeCompare(b.name);
}

function StatCard({
  value,
  unit,
  label,
  onPress,
}: {
  value: string;
  unit?: string;
  label: string;
  onPress?: () => void;
}) {
  const Container = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      className="flex-1 rounded-2xl border border-rx-line bg-rx-surface px-[14px] py-3 active:opacity-80"
    >
      <View className="flex-row items-start justify-between">
        <Text weight="extrabold" className="text-[20px] tracking-tight text-rx-ink">
          {value}
          {unit ? (
            <Text weight="semibold" className="text-[12px] text-rx-ink">
              {unit}
            </Text>
          ) : null}
        </Text>
        {onPress ? <Ionicons name="chevron-forward" size={14} color={rx.faint} /> : null}
      </View>
      <Text weight="medium" className="mt-0.5 text-[11.5px] text-rx-muted">
        {label}
      </Text>
    </Container>
  );
}

function ProcessingVisitRow({ visitId, patientName, patientId }: { visitId: number; patientName: string; patientId: number }) {
  const router = useRouter();
  const { data } = useProcessingVisitStatus(visitId);
  const remove = useProcessingStore((s) => s.remove);
  const status = (data?.status ?? 'processing') as import('@/components/ui/processing-card').ProcessingCardStatus;
  const progress = data?.progress ?? 10;

  if (status === 'completed') {
    setTimeout(() => remove(visitId), 5000);
  }

  return (
    <ProcessingCard
      patientName={patientName}
      status={status}
      progress={progress}
      onPress={() =>
        router.push({ pathname: '/patient/[id]', params: { id: String(patientId), name: patientName } })
      }
    />
  );
}

function RecentRow({ patient, onPress }: { patient: Patient; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-t border-rx-hairline px-4 py-[14px] active:bg-rx-hairline/60"
    >
      <Avatar name={patient.name} />
      <View className="min-w-0 flex-1">
        <Text weight="bold" numberOfLines={1} className="text-[14.5px] text-rx-ink">
          {patient.name}
        </Text>
        <Text weight="medium" className="text-[12px] text-rx-muted">
          {patientMeta(patient.age, patient.sex) || 'Patient'} · {relativeDay(patient.lastVisit)}
        </Text>
      </View>
      {patient.medicalRecordNumber ? <Badge label={patient.medicalRecordNumber} /> : null}
      <Ionicons name="chevron-forward" size={14} color={rx.faint} />
    </Pressable>
  );
}

function ProcessingSection() {
  const visits = useProcessingStore((s) => s.visits);
  if (visits.length === 0) return null;
  return (
    <View className="mb-[18px]">
      <Text weight="bold" className="mb-2.5 text-[16px] text-rx-ink">
        Processing
      </Text>
      <View className="gap-[8px]">
        {visits.map((v) => (
          <ProcessingVisitRow
            key={v.visitId}
            visitId={v.visitId}
            patientName={v.patientName}
            patientId={v.patientId}
          />
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  // Single query powers the greeting list AND the stats — no per-patient fan-out.
  const { data, isLoading, refetch, isRefetching } = usePatients();

  const allPatients = useMemo(() => [...(data?.patients ?? [])].sort(byRecentVisit), [data]);
  const recent = useMemo(() => {
    const cutoff = Date.now() - WEEK_MS;
    return allPatients.filter((p) => p.lastVisit && new Date(p.lastVisit).getTime() >= cutoff);
  }, [allPatients]);

  const totalPatients = data?.pagination?.total ?? allPatients.length;
  const showingRecent = recent.length > 0;
  const list = (showingRecent ? recent : allPatients).slice(0, 8);

  const displayName = user?.firstName ? `Dr. ${user.firstName}` : (user?.fullName ?? 'Doctor');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={rx.accent} colors={[rx.accent]} />
        }
      >
        {/* Greeting */}
        <View className="mb-5 flex-row items-center justify-between">
          <View>
            <Text weight="medium" className="text-[13px] text-rx-muted">
              {greeting()}
            </Text>
            <Text weight="extrabold" className="text-[24px] tracking-tight text-rx-ink">
              {displayName}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Notifications"
            className="h-11 w-11 items-center justify-center rounded-full border border-rx-line bg-rx-surface active:opacity-80"
          >
            <Ionicons name="notifications-outline" size={22} color={rx.ink} />
          </Pressable>
        </View>

        {/* Start a new visit */}
        <Pressable
          onPress={() => router.push('/new-scribe')}
          style={accentShadow()}
          className="mb-[14px] flex-row items-center justify-between rounded-[26px] bg-rx-accent p-[22px] active:opacity-95"
        >
          <View className="flex-1 pr-3">
            <Text weight="bold" className="mb-1 text-[18px] text-white">
              Start a new visit
            </Text>
            <Text weight="medium" className="text-[13px] leading-[18px] text-white/85">
              Pick a patient and record — the note writes itself
            </Text>
          </View>
          <View className="h-[58px] w-[58px] items-center justify-center rounded-full bg-white/20">
            <Ionicons name="mic" size={26} color="#fff" />
          </View>
        </Pressable>

        {/* Stats — both derived from the single patients query, so they load instantly. */}
        <View className="mb-[26px] flex-row gap-[10px]">
          <StatCard
            value={isLoading ? '—' : String(totalPatients)}
            label="patients"
            onPress={() => router.push('/patients')}
          />
          <StatCard value={isLoading ? '—' : String(recent.length)} unit="h" label="saved this week" />
        </View>

        {/* Live processing visits */}
        <ProcessingSection />

        {/* Recent Visits (Last 7 days) — mirrors the web dashboard */}
        <View className="mb-3 flex-row items-center justify-between">
          <Text weight="bold" className="text-[16px] text-rx-ink">
            {showingRecent ? 'Recent Visits' : 'Patients'}
          </Text>
          <Pressable onPress={() => router.push('/patients')} className="active:opacity-70">
            <Text weight="bold" className="text-[12.5px] text-rx-accent">
              See all
            </Text>
          </Pressable>
        </View>

        <View className="overflow-hidden rounded-[18px] border border-rx-line bg-rx-surface">
          {isLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator color={rx.accent} />
            </View>
          ) : list.length === 0 ? (
            <View className="px-4 py-8">
              <Text weight="medium" className="text-center text-[13px] text-rx-muted">
                No patients yet. Start a visit to create your first note.
              </Text>
            </View>
          ) : (
            list.map((p) => (
              <RecentRow
                key={p.id}
                patient={p}
                onPress={() =>
                  router.push({ pathname: '/patient/[id]', params: { id: String(p.id), name: p.name } })
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
