import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoundIconButton, AccentButton } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import { ShareSheet } from '@/features/patient/share-sheet';
import { usePatientVisit, useShareVisitWithDoctor } from '@/features/patient/use-patient-visits';
import { relativeDay } from '@/lib/format';
import { rx } from '@/theme/rx';

function SummaryCard({ title, body }: { title: string; body: string }) {
  return (
    <View className="mb-[11px] rounded-[18px] border border-rx-line bg-rx-surface px-4 py-[15px]">
      <Text weight="extrabold" className="mb-1.5 text-[13px] text-rx-accent">
        {title}
      </Text>
      <Text className="text-[13.5px] leading-[21px] text-rx-ink3">{body}</Text>
    </View>
  );
}

export default function PatientVisitDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const visitId = Number(id);

  const { data: visit } = usePatientVisit(visitId || null);
  const { mutate: share, isPending: isSharing } = useShareVisitWithDoctor();
  const [shareOpen, setShareOpen] = useState(false);

  const isGenerating = !visit || visit.status === 'recording' || visit.status === 'processing';
  const hasFailed = visit?.status === 'failed';
  const summary = visit?.summary;

  const cards: Array<{ title: string; body: string }> = [];
  if (summary) {
    if (summary.keyPoints?.length) cards.push({ title: 'What happened', body: summary.keyPoints.join('\n\n') });
    if (summary.diagnoses?.length) cards.push({ title: 'Conditions discussed', body: summary.diagnoses.join('\n\n') });
    if (summary.nextSteps?.length) cards.push({ title: 'Next steps', body: summary.nextSteps.join('\n\n') });
    if (summary.medications?.length)
      cards.push({
        title: 'Medications',
        body: summary.medications
          .map((m) => [m.name, m.dosage, m.instructions].filter(Boolean).join(' — '))
          .join('\n\n'),
      });
    if (summary.questionsToAsk?.length)
      cards.push({ title: 'Questions for next time', body: summary.questionsToAsk.join('\n\n') });
  }

  // Plain-text rendering of the summary for the OS share sheet.
  const shareText = [
    summary?.title || visit?.visitReason || 'Visit summary',
    relativeDay(visit?.visitDate),
    '',
    ...cards.map((c) => `${c.title}\n${c.body}`),
  ]
    .filter(Boolean)
    .join('\n');

  if (isGenerating) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
        <View className="flex-1 items-center justify-center px-10">
          <View className="mb-6 h-14 w-14 items-center justify-center rounded-full border-4 border-rx-line" style={{ borderTopColor: rx.accent }} />
          <Text weight="extrabold" className="mb-2 text-center text-[18px] text-rx-ink">
            Summarizing your visit
          </Text>
          <Text weight="medium" className="text-center text-[13.5px] leading-5 text-rx-muted">
            Turning the conversation into a clear summary you can share.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      <View className="flex-row items-center justify-between px-5 pt-2 pb-2">
        <RoundIconButton name="chevron-back" size={20} onPress={() => router.replace('/(patient)/records')} />
        <Text weight="extrabold" className="text-[16px] text-rx-ink">
          Visit summary
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 130 }}>
        <View className="mb-[14px] rounded-[20px] border border-rx-line bg-rx-surface p-4">
          <Text weight="medium" className="mb-0.5 text-[12.5px] text-rx-muted">
            {relativeDay(visit?.visitDate)}
            {visit?.doctorName ? ` · ${visit.doctorName}` : ''}
          </Text>
          <Text weight="extrabold" className="text-[16px] text-rx-ink">
            {summary?.title || visit?.visitReason || 'Visit'}
          </Text>
        </View>

        {hasFailed ? (
          <View className="flex-row items-start gap-2.5 rounded-[16px] border border-rx-line bg-rx-surface px-4 py-[14px]">
            <Ionicons name="alert-circle" size={18} color={rx.accent} />
            <Text weight="medium" className="flex-1 text-[13px] leading-5 text-rx-ink2">
              {visit?.errorMessage || 'Something went wrong summarizing this visit.'}
            </Text>
          </View>
        ) : cards.length > 0 ? (
          cards.map((c, i) => <SummaryCard key={i} title={c.title} body={c.body} />)
        ) : (
          <View className="rounded-[16px] border border-rx-line bg-rx-surface px-4 py-[14px]">
            <Text weight="medium" className="text-[13px] leading-5 text-rx-muted">
              No summary content yet.
            </Text>
          </View>
        )}
      </ScrollView>

      {!hasFailed && cards.length > 0 ? (
        <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-3">
          <AccentButton
            label={visit?.sharedWithDoctor ? 'Shared with your doctor' : 'Share with your doctor'}
            disabled={visit?.sharedWithDoctor || isSharing}
            onPress={() => setShareOpen(true)}
            iconRight={<Ionicons name="arrow-forward" size={16} color="#fff" />}
          />
        </View>
      ) : null}

      <ShareSheet
        open={shareOpen}
        sending={isSharing}
        shareText={shareText}
        onClose={() => setShareOpen(false)}
        onSendDirect={() => {
          if (visitId) share(visitId, { onSuccess: () => setShareOpen(false) });
        }}
      />
    </SafeAreaView>
  );
}
