import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import type { PatientAppointment, PatientProfile, PatientVisit } from '@/features/patient/types';
import { usePatientAccount } from '@/features/patient/use-patient-account';
import { usePatientAppointments } from '@/features/patient/use-patient-appointments';
import { usePatientProfiles } from '@/features/patient/use-patient-profiles';
import { usePatientVisits } from '@/features/patient/use-patient-visits';
import { accentShadow, rx } from '@/theme/rx';

/**
 * Care tab — a screen-for-screen port of the CARE (dashboard) screen in the
 * RxScribe Mobile design (project f5d838c9): greeting + bell, the accent
 * "Start a new visit" card, upcoming visits, then recent notes.
 */
export default function PatientCareScreen() {
  const router = useRouter();
  const { account } = usePatientAccount();
  const { data: profiles } = usePatientProfiles();
  const {
    data: appointments,
    isLoading: apptsLoading,
    refetch: refetchAppts,
    isRefetching,
  } = usePatientAppointments();
  const { data: visits, refetch: refetchVisits } = usePatientVisits();

  const profileById = useMemo(() => {
    const map = new Map<number, PatientProfile>();
    for (const p of profiles ?? []) map.set(p.id, p);
    return map;
  }, [profiles]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return (appointments ?? [])
      .filter((a) => new Date(a.scheduledAt).getTime() >= now && a.status !== 'cancelled')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [appointments]);

  const recent = useMemo(
    () =>
      [...(visits ?? [])]
        .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())
        .slice(0, 8),
    [visits],
  );

  const refresh = () => {
    void refetchAppts();
    void refetchVisits();
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refresh} tintColor={rx.accent} />}
      >
        {/* Greeting + bell */}
        <View className="mb-5 flex-row items-center justify-between">
          <View>
            <Text weight="medium" className="text-[13px] text-rx-muted">
              {greeting()}
            </Text>
            <Text weight="extrabold" className="text-[24px] tracking-tight text-rx-ink">
              {firstNameOf(account?.displayName)}
            </Text>
          </View>
        </View>

        {/* Primary CTA */}
        <Pressable
          onPress={() => router.push('/patient/appointment/new')}
          className="mb-5 flex-row items-center justify-between rounded-[26px] bg-rx-accent p-[22px] active:opacity-90"
          style={accentShadow()}
        >
          <View className="flex-1 pr-3">
            <Text weight="bold" className="mb-1 text-[18px] text-white">
              Start a new visit
            </Text>
            <Text weight="medium" className="text-[13px] leading-[17px] text-white/85">
              Add an appointment for you or someone you care for
            </Text>
          </View>
          <View className="h-[58px] w-[58px] items-center justify-center rounded-full bg-white/20">
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </View>
        </Pressable>

        {/* Upcoming */}
        {upcoming.length > 0 ? (
          <>
            <Text weight="bold" className="mb-3 text-[16px] text-rx-ink">
              Upcoming visits
            </Text>
            <View className="mb-6 gap-[9px]">
              {upcoming.map((appt) => (
                <UpcomingCard
                  key={appt.id}
                  appointment={appt}
                  profile={profileById.get(appt.profileId)}
                  onPress={() => router.push(`/patient/appointment/${appt.id}`)}
                />
              ))}
            </View>
          </>
        ) : null}

        {/* Recent notes */}
        <View className="mb-3 flex-row items-baseline justify-between">
          <Text weight="bold" className="text-[16px] text-rx-ink">
            Recent notes
          </Text>
          <Pressable onPress={() => router.push('/(patient)/records')}>
            <Text weight="semibold" className="text-[12.5px] text-rx-muted">
              See all
            </Text>
          </Pressable>
        </View>

        {recent.length === 0 ? (
          <View className="items-center rounded-[18px] border border-rx-line bg-rx-surface px-6 py-8">
            <Text weight="bold" className="text-[14.5px] text-rx-ink">
              {apptsLoading ? 'Loading…' : 'No visits yet'}
            </Text>
            {!apptsLoading ? (
              <Text weight="medium" className="mt-1.5 text-center text-[12.5px] leading-[17px] text-rx-muted">
                Record a visit and its summary will appear here.
              </Text>
            ) : null}
          </View>
        ) : (
          <View className="overflow-hidden rounded-[18px] border border-rx-line bg-rx-surface">
            {recent.map((visit, i) => (
              <RecentRow
                key={visit.id}
                visit={visit}
                profile={profileById.get(visit.profileId)}
                first={i === 0}
                onPress={() => router.push(`/patient/visit/${visit.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function UpcomingCard({
  appointment,
  profile,
  onPress,
}: {
  appointment: PatientAppointment;
  profile?: PatientProfile;
  onPress: () => void;
}) {
  const when = new Date(appointment.scheduledAt);
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-[13px] rounded-[18px] border border-rx-line bg-rx-surface px-4 py-[14px] active:opacity-85"
    >
      <View className="h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-rx-accent-tint">
        <Text weight="extrabold" className="text-[10px] leading-none text-rx-accent">
          {when.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}
        </Text>
        <Text weight="extrabold" className="text-[15px] leading-[17px] text-rx-accent">
          {when.getDate()}
        </Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text weight="bold" numberOfLines={1} className="text-[14.5px] text-rx-ink">
          {profileLabel(profile)}
        </Text>
        <Text weight="medium" numberOfLines={1} className="text-[12px] text-rx-muted">
          {[appointment.doctorName, timeOf(when)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={rx.faint} />
    </Pressable>
  );
}

function RecentRow({
  visit,
  profile,
  first,
  onPress,
}: {
  visit: PatientVisit;
  profile?: PatientProfile;
  first: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 px-4 py-[14px] active:opacity-80 ${first ? '' : 'border-t border-rx-hairline'}`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-rx-accent-tint">
        <Text weight="bold" className="text-[13px] text-rx-accent">
          {initialsOf(profile?.name ?? '')}
        </Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text weight="bold" numberOfLines={1} className="text-[14.5px] text-rx-ink">
          {profileLabel(profile)}
        </Text>
        <Text weight="medium" numberOfLines={1} className="text-[12px] text-rx-muted">
          {[visit.summary?.title, relativeWhen(visit.visitDate)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {visit.sharedWithDoctor ? (
        <View className="rounded-lg bg-rx-success-bg px-[9px] py-1">
          <Text weight="bold" className="text-[10.5px] text-rx-success">
            Shared
          </Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={14} color={rx.faint} />
    </Pressable>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function firstNameOf(displayName?: string): string {
  if (!displayName) return 'there';
  return displayName.trim().split(/\s+/)[0] || 'there';
}

function profileLabel(profile?: PatientProfile): string {
  if (!profile) return 'Visit';
  return profile.profileType === 'self' ? 'You' : profile.name;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function timeOf(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function relativeWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
