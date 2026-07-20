import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Confetti } from '@/components/ui/confetti';
import { AccentButton, RoundIconButton } from '@/components/ui/controls';
import { SoapSections } from '@/components/ui/soap-card';
import { Text } from '@/components/ui/text';
import { SCRIBE_LANGUAGES } from '@/features/scribe/languages';
import { useKeyboardVisible } from '@/hooks/use-keyboard';
import { parseStoredNote } from '@/features/scribe/soap-to-sections';
import { useBackgroundSave, type SaveStep } from '@/features/scribe/use-background-save';
import { useVisitStatus, type ProcessingStatus } from '@/features/scribe/use-visit-status';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useProcessingStore } from '@/hooks/use-processing-visits';
import { rx } from '@/theme/rx';

const STATUS_LABELS: Record<ProcessingStatus, string> = {
  pending: 'Saving transcript…',
  processing: 'Starting processing…',
  transcribing: 'Processing audio…',
  'generating-soap': 'Generating clinical note…',
  completed: 'Note ready',
  failed: 'Processing failed',
};

// Client-side phases (before the server reports real progress) so the bar keeps
// moving through save → upload → processing instead of freezing at one value.
const CLIENT_STEP_LABELS: Record<SaveStep, string> = {
  saving: 'Saving transcript…',
  uploading: 'Uploading audio…',
  processing: 'Starting processing…',
};
const CLIENT_STEP_PROGRESS: Record<SaveStep, number> = {
  saving: 8,
  uploading: 22,
  processing: 40,
};

function ProgressBar({ progress }: { progress: number }) {
  return (
    <View className="mt-4 h-[6px] w-full overflow-hidden rounded-full bg-rx-hairline">
      <View
        className="h-full rounded-full bg-rx-accent"
        style={{ width: `${Math.max(progress, 5)}%` }}
      />
    </View>
  );
}

export default function NoteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const params = useLocalSearchParams<{
    patientId?: string;
    patientName?: string;
    templateId?: string;
    template?: string;
    language?: string;
    transcript?: string;
    audioUri?: string;
    visitId?: string;
  }>();

  const patientId = Number(params.patientId);
  const patientName = params.patientName || 'Patient';
  const templateName = params.template || 'SOAP';
  const language = params.language || 'en';
  const langLabel = SCRIBE_LANGUAGES.find((l) => l.code === language)?.label ?? 'English';
  const transcript = (params.transcript || '').trim();
  const audioUri = params.audioUri || null;

  const { data: currentUser } = useCurrentUser();
  const { mutate: saveBackground, data: saveResult, error: saveError, isPending: isSaving } = useBackgroundSave();
  const addProcessing = useProcessingStore((s) => s.add);

  const [visitId, setVisitId] = useState<number | null>(
    params.visitId ? Number(params.visitId) : null,
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [clientStep, setClientStep] = useState<SaveStep | null>(null);

  useEffect(() => {
    if (saveResult?.visitId) {
      setVisitId(saveResult.visitId);
      addProcessing({ visitId: saveResult.visitId, patientName, patientId });
    }
  }, [saveResult?.visitId]);

  const { data: status, error: statusError } = useVisitStatus(visitId);

  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const started = useRef(false);
  const shownProgressRef = useRef(0);

  useEffect(() => {
    if (started.current) return;
    if (!transcript || !patientId) return;
    if (params.visitId) {
      started.current = true;
      return;
    }
    if (!currentUser?.id) return;
    started.current = true;
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);
    saveBackground({
      patientId,
      patientName,
      doctorId: currentUser.id,
      transcript,
      language,
      templateId: params.templateId ? Number(params.templateId) : undefined,
      audioUri,
      onVisitCreated: (id) => setVisitId(id),
      onStep: setClientStep,
    });
  }, [currentUser?.id, patientId, transcript, language, params.templateId, audioUri, params.visitId, saveBackground]);

  const retry = () => {
    if (!currentUser?.id || !transcript || !patientId) return;
    setVisitId(null);
    setDismissed(false);
    started.current = false;
    saveBackground({
      patientId,
      patientName,
      doctorId: currentUser.id,
      transcript,
      language,
      templateId: params.templateId ? Number(params.templateId) : undefined,
      audioUri,
      onVisitCreated: (id) => setVisitId(id),
      onStep: setClientStep,
    });
  };

  const sections = useMemo(
    () => parseStoredNote(status?.soapNote ?? null),
    [status?.soapNote],
  );

  const isProcessing =
    isSaving ||
    (!!visitId &&
      status?.status !== 'completed' &&
      status?.status !== 'failed');

  const hasFailed = status?.status === 'failed' || !!saveError;
  const errorMessage =
    status?.errorMessage || saveError?.message || statusError?.message || '';

  const goHome = () => router.replace('/(clinician)');
  const goToPatient = () =>
    router.replace({
      pathname: '/patient/[id]',
      params: { id: String(patientId), name: patientName },
    });

  // Dismissible processing — user taps "Dismiss" to go home, processing continues in background
  if (isProcessing && !dismissed) {
    // Once the server reports a real (non-pending) status, let it drive the bar;
    // until then use the client-side step. Clamp monotonically so it never jumps back,
    // and cap below 100 until the note is actually ready.
    const serverActive = !!status && status.status !== 'pending';
    const step = clientStep ?? 'saving';
    const rawProgress = serverActive ? status!.progress ?? 40 : CLIENT_STEP_PROGRESS[step];
    const progress = Math.min(99, Math.max(shownProgressRef.current, rawProgress));
    shownProgressRef.current = progress;
    const progressLabel = serverActive ? STATUS_LABELS[status!.status] : CLIENT_STEP_LABELS[step];

    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
        <Confetti visible={showConfetti} />

        {/* Header with dismiss */}
        <View className="flex-row items-center justify-between px-5 pt-2">
          <View className="h-[38px] w-[38px]" />
          <Text weight="extrabold" className="text-[16px] text-rx-ink">
            Generating Note
          </Text>
          <Pressable onPress={() => { setDismissed(true); goHome(); }} className="active:opacity-70">
            <Text weight="bold" className="text-[13px] text-rx-accent">
              Dismiss
            </Text>
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center px-10">
          {/* Animated rings */}
          <View className="mb-6 h-[100px] w-[100px] items-center justify-center rounded-full border-[3px] border-rx-accent/20">
            <View className="h-[72px] w-[72px] items-center justify-center rounded-full border-[3px] border-rx-accent/40">
              <View className="h-[48px] w-[48px] items-center justify-center rounded-full bg-rx-accent">
                <Ionicons name="document-text" size={22} color="#fff" />
              </View>
            </View>
          </View>

          <Text weight="extrabold" className="mb-2 text-center text-[20px] text-rx-ink">
            {progressLabel}
          </Text>
          <Text weight="medium" className="text-center text-[14px] text-rx-muted">
            {patientName} · {templateName}
          </Text>
          <View className="mt-4 w-full max-w-[240px]">
            <ProgressBar progress={progress} />
            <Text weight="bold" className="mt-2 text-center text-[13px] text-rx-accent">
              {progress}%
            </Text>
          </View>
          <View className="mt-8 flex-row items-center gap-2 rounded-[14px] bg-rx-surface px-4 py-3">
            <Ionicons name="cloud-done-outline" size={16} color={rx.muted} />
            <Text weight="medium" className="text-[12.5px] text-rx-muted">
              You can dismiss — processing continues on the server
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-2 pt-2">
        <RoundIconButton name="chevron-back" size={20} onPress={() => router.replace('/(clinician)')} />
        <Text weight="extrabold" className="text-[16px] text-rx-ink">
          {templateName} Note
        </Text>
        <View className="h-[38px] w-[38px]" />
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}
      >
        {/* Patient card */}
        <View className="mb-[14px] rounded-[20px] border border-rx-line bg-rx-surface p-4">
          <View className="flex-row items-center gap-3">
            <Avatar name={patientName} className="h-[46px] w-[46px] rounded-[14px]" textClassName="text-[15px]" />
            <View className="flex-1">
              <Text weight="extrabold" numberOfLines={1} className="text-[16px] text-rx-ink">
                {patientName}
              </Text>
              <Text weight="medium" className="text-[12.5px] text-rx-muted">
                {templateName} · {langLabel}
              </Text>
            </View>
            {status?.status === 'completed' ? (
              <View className="flex-row items-center gap-[5px] rounded-[20px] bg-rx-success-bg px-[11px] py-1.5">
                <Ionicons name="checkmark" size={12} color={rx.success} />
                <Text weight="bold" className="text-[11.5px] text-rx-success">
                  Saved
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {!transcript ? (
          <View className="mt-10 items-center px-6">
            <Ionicons name="document-text-outline" size={30} color={rx.faint} />
            <Text weight="semibold" className="mt-3 text-center text-[14px] text-rx-muted">
              Nothing was transcribed for this visit.
            </Text>
          </View>
        ) : hasFailed ? (
          <View>
            <View className="flex-row items-start gap-2.5 rounded-[16px] border border-rx-line bg-rx-surface px-4 py-[14px]">
              <Ionicons name="alert-circle" size={18} color={rx.accent} />
              <Text weight="medium" className="flex-1 text-[13px] leading-5 text-rx-ink2">
                {errorMessage || 'Something went wrong generating the note.'}
              </Text>
            </View>
            <Pressable
              onPress={retry}
              className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-[14px] border border-rx-line bg-rx-surface active:opacity-80"
            >
              <Ionicons name="refresh" size={16} color={rx.ink} />
              <Text weight="bold" className="text-[14px] text-rx-ink">
                Try again
              </Text>
            </Pressable>
          </View>
        ) : sections.length > 0 ? (
          <>
            <SoapSections sections={sections} />

            {/* Collapsible source transcript */}
            <Pressable
              onPress={() => setTranscriptOpen((o) => !o)}
              className="mt-3 flex-row items-center justify-between rounded-[16px] border border-rx-line bg-rx-surface px-4 py-[13px] active:opacity-80"
            >
              <Text weight="bold" className="text-[13px] text-rx-ink">
                Source transcript
              </Text>
              <Ionicons
                name={transcriptOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={rx.muted}
              />
            </Pressable>
            {transcriptOpen ? (
              <View className="mt-2 rounded-[16px] border border-rx-line bg-rx-surface px-4 py-[14px]">
                <Text className="text-[13px] leading-5 text-rx-ink3">{transcript}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <View className="rounded-[16px] border border-rx-line bg-rx-surface px-4 py-[14px]">
            <Text weight="medium" className="text-[13px] leading-5 text-rx-muted">
              The note was saved but contained no structured content.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View
        className="flex-row gap-[11px] px-5 pt-3"
        style={{ paddingBottom: keyboardVisible ? 12 : Math.max(insets.bottom, 12) + 12 }}
      >
        <AccentButton
          className="flex-1 rounded-[16px]"
          label={status?.status === 'completed' ? 'Done' : 'Back to patient'}
          onPress={goToPatient}
          iconRight={<Ionicons name="arrow-forward" size={16} color="#fff" />}
        />
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
