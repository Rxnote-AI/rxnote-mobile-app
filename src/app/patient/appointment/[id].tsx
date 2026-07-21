import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoundIconButton } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import type { PatientProfile, PatientVisit } from '@/features/patient/types';
import { usePatientAppointment } from '@/features/patient/use-patient-appointments';
import { usePatientProfiles } from '@/features/patient/use-patient-profiles';
import { usePatientVisits } from '@/features/patient/use-patient-visits';
import { accentShadow, rx } from '@/theme/rx';

/**
 * Appointment detail — the VISIT DETAIL screen in the RxScribe Mobile design
 * (project f5d838c9): who/when card, DATE and TIME tiles, a SEEING row, and
 * "Record now" while the appointment is still upcoming.
 */
export default function AppointmentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const appointmentId = Number(id);

  const { data: appointment, isLoading } = usePatientAppointment(appointmentId || null);
  const { data: profiles } = usePatientProfiles();
  // Past visits for the same person — so you can walk into the appointment
  // knowing what happened last time without leaving this screen.
  const { data: visits } = usePatientVisits(appointment?.profileId);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const pastVisits = useMemo(
    () =>
      [...(visits ?? [])]
        .filter((v) => v.status === 'completed' && v.summary)
        .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())
        .slice(0, 5),
    [visits],
  );

  const profile = (profiles ?? []).find((p) => p.id === appointment?.profileId);
  const when = appointment ? new Date(appointment.scheduledAt) : null;
  const isUpcoming = when ? when.getTime() >= Date.now() : false;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      <View className="mb-[18px] flex-row items-center justify-between px-5 pt-2">
        <RoundIconButton name="chevron-back" size={20} onPress={() => router.back()} />
        <Text weight="extrabold" className="text-[16px] text-rx-ink">
          Visit details
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading || !appointment || !when ? (
          <Text weight="medium" className="mt-10 text-center text-[13.5px] text-rx-muted">
            {isLoading ? 'Loading…' : 'Appointment not found.'}
          </Text>
        ) : (
          <>
            {/* Who + status */}
            <View className="mb-[14px] rounded-[20px] border border-rx-line bg-rx-surface p-4">
              <View className="mb-[14px] flex-row items-center gap-[13px]">
                <View className="h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-rx-accent-tint">
                  <Text weight="bold" className="text-[15px] text-rx-accent">
                    {initialsOf(profile?.name ?? '')}
                  </Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text weight="extrabold" numberOfLines={1} className="text-[17px] text-rx-ink">
                    {profileLabel(profile)}
                  </Text>
                  <Text weight="medium" numberOfLines={1} className="text-[12.5px] text-rx-muted">
                    {appointment.title}
                  </Text>
                </View>
                <StatusBadge upcoming={isUpcoming} />
              </View>

              <View className="flex-row gap-[10px]">
                <InfoTile label="DATE" value={when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                <InfoTile
                  label="TIME"
                  value={when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                />
              </View>
            </View>

            {/* Seeing */}
            <View className="mb-[14px] flex-row items-center gap-3 rounded-[16px] border border-rx-line bg-rx-surface px-4 py-[14px]">
              <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-rx-subtle">
                <Ionicons name="person-outline" size={20} color={rx.muted} />
              </View>
              <View className="flex-1">
                <Text weight="bold" className="text-[11px] tracking-[0.3px] text-rx-muted">
                  SEEING
                </Text>
                <Text weight="bold" className="text-[14.5px] text-rx-ink">
                  {appointment.doctorName || 'Not specified'}
                </Text>
              </View>
            </View>

            {appointment.clinicName ? (
              <View className="mb-[14px] flex-row items-center gap-3 rounded-[16px] border border-rx-line bg-rx-surface px-4 py-[14px]">
                <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-rx-subtle">
                  <Ionicons name="business-outline" size={20} color={rx.muted} />
                </View>
                <View className="flex-1">
                  <Text weight="bold" className="text-[11px] tracking-[0.3px] text-rx-muted">
                    CLINIC
                  </Text>
                  <Text weight="bold" className="text-[14.5px] text-rx-ink">
                    {appointment.clinicName}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Previous visits — collapsed by default, expand for the summary. */}
            {pastVisits.length > 0 ? (
              <View className="mb-[14px]">
                <Text weight="extrabold" className="mb-2 ml-1 text-[11px] tracking-[0.4px] text-rx-label">
                  PREVIOUS VISITS
                </Text>
                <View className="overflow-hidden rounded-[16px] border border-rx-line bg-rx-surface">
                  {pastVisits.map((visit, i) => (
                    <PastVisitRow
                      key={visit.id}
                      visit={visit}
                      first={i === 0}
                      expanded={expandedId === visit.id}
                      onToggle={() => setExpandedId(expandedId === visit.id ? null : visit.id)}
                      onOpen={() => router.push(`/patient/visit/${visit.id}`)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {/* Upcoming: record now */}
            {isUpcoming ? (
              <View className="mt-1 flex-row gap-[11px]">
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/patient/record-session',
                      params: { profileId: String(appointment.profileId) },
                    })
                  }
                  className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-[16px] bg-rx-accent active:opacity-90"
                  style={accentShadow()}
                >
                  <Ionicons name="mic" size={17} color={rx.onAccent} />
                  <Text weight="bold" className="text-[14.5px] text-white">
                    Record now
                  </Text>
                </Pressable>
                <View className="h-[52px] w-14 items-center justify-center rounded-[16px] border-[1.5px] border-rx-line2 bg-rx-surface">
                  <Ionicons name="calendar-outline" size={19} color={rx.muted2} />
                </View>
              </View>
            ) : appointment.patientVisitId ? (
              <Pressable
                onPress={() => router.push(`/patient/visit/${appointment.patientVisitId}`)}
                className="h-[52px] flex-row items-center justify-center gap-2 rounded-[16px] bg-rx-accent active:opacity-90"
                style={accentShadow()}
              >
                <Text weight="bold" className="text-[15px] text-white">
                  View visit summary
                </Text>
                <Ionicons name="arrow-forward" size={16} color={rx.onAccent} />
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** One past visit: tap the row to expand its summary inline, chevron to open it. */
function PastVisitRow({
  visit,
  first,
  expanded,
  onToggle,
  onOpen,
}: {
  visit: PatientVisit;
  first: boolean;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const summary = visit.summary;
  const when = new Date(visit.visitDate);

  return (
    <View className={first ? '' : 'border-t border-rx-hairline'}>
      <Pressable onPress={onToggle} className="flex-row items-center gap-3 px-4 py-[13px] active:opacity-70">
        <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-rx-subtle">
          <Ionicons name="medkit-outline" size={16} color={rx.muted2} />
        </View>
        <View className="min-w-0 flex-1">
          <Text weight="bold" numberOfLines={1} className="text-[14px] text-rx-ink">
            {summary?.title || 'Visit'}
          </Text>
          <Text weight="medium" className="text-[12px] text-rx-muted">
            {when.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={rx.muted} />
      </Pressable>

      {expanded ? (
        <View className="border-t border-rx-hairline px-4 pb-[14px] pt-3">
          {summary?.keyPoints?.length ? (
            <Detail label="What happened" items={summary.keyPoints} />
          ) : null}
          {summary?.nextSteps?.length ? <Detail label="Next steps" items={summary.nextSteps} /> : null}
          {summary?.medications?.length ? (
            <Detail
              label="Medications"
              items={summary.medications.map((m) =>
                [m.name, m.dosage, m.instructions].filter(Boolean).join(' — '),
              )}
            />
          ) : null}
          {summary?.questionsToAsk?.length ? (
            <Detail label="Questions to ask" items={summary.questionsToAsk} />
          ) : null}

          <Pressable onPress={onOpen} className="mt-1 flex-row items-center gap-1.5 active:opacity-70">
            <Text weight="bold" className="text-[13px] text-rx-accent">
              Open full summary
            </Text>
            <Ionicons name="arrow-forward" size={13} color={rx.accent} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Detail({ label, items }: { label: string; items: string[] }) {
  return (
    <View className="mb-2.5">
      <Text weight="extrabold" className="mb-1 text-[11.5px] text-rx-accent">
        {label}
      </Text>
      {items.map((item, i) => (
        <Text key={i} weight="medium" className="mb-0.5 text-[13px] leading-[19px] text-rx-ink3">
          • {item}
        </Text>
      ))}
    </View>
  );
}

function StatusBadge({ upcoming }: { upcoming: boolean }) {
  return (
    <View
      className="rounded-lg px-[9px] py-1"
      style={{ backgroundColor: upcoming ? rx.accentTint : rx.successBg }}
    >
      <Text weight="bold" className="text-[10.5px]" style={{ color: upcoming ? rx.accent : rx.success }}>
        {upcoming ? 'Upcoming' : 'Past'}
      </Text>
    </View>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-[13px] bg-rx-bg px-[13px] py-[11px]">
      <Text weight="bold" className="mb-0.5 text-[10px] tracking-[0.3px] text-rx-muted">
        {label}
      </Text>
      <Text weight="extrabold" className="text-[14px] text-rx-ink">
        {value}
      </Text>
    </View>
  );
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
