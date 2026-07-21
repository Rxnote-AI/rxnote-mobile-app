import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoundIconButton } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Waveform } from '@/components/ui/waveform';
import { useScribeTranscription } from '@/features/scribe/use-scribe-transcription';
import { useRecordPatientVisit } from '@/features/patient/use-patient-visits';
import { useApiClient } from '@/lib/api-client';
import { rx } from '@/theme/rx';

function fmt(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function FadeLine({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [opacity]);
  return <Animated.View style={{ opacity }} className="mb-2">{children}</Animated.View>;
}

export default function PatientRecordSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ profileId: string; profileName?: string }>();
  const profileId = Number(params.profileId);
  const profileName = params.profileName || 'this visit';
  const language = 'en';

  const api = useApiClient();
  const getApiKey = useCallback(async () => {
    const res = await api<{ apiKey: string }>(`/api/soniox-token?language=${language}`);
    return res.apiKey;
  }, [api]);

  const { transcript, interim, fullTranscript, isRecording, isConnected, error, start, pause, resume, stop } =
    useScribeTranscription({ language, getApiKey });
  const { mutate: recordVisit, isPending: isSaving } = useRecordPatientVisit();

  const [seconds, setSeconds] = useState(0);
  /** Set once recording stops: the transcript becomes an editable draft the user
      confirms before we save. Also lets someone type a note with no speech. */
  const [draft, setDraft] = useState<string | null>(null);
  /** Free-text the user adds on top of the transcript — symptoms they forgot to
      say aloud, questions, how they felt. Passed to the summariser as context. */
  const [context, setContext] = useState('');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const reviewing = draft !== null;
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const toast = useToast();

  useEffect(() => {
    start();
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  const togglePause = () => {
    if (isRecording) pause();
    else resume();
  };

  /** Stop capture and hand the transcript over for review/editing. */
  const stopAndReview = async () => {
    const captured = fullTranscript;
    const uri = await stop();
    setAudioUri(uri);
    setDraft(captured);
  };

  /** Skip straight to typing — no speech needed. */
  const typeInstead = async () => {
    const uri = await stop();
    setAudioUri(uri);
    setDraft(fullTranscript);
  };

  const saveDraft = () => {
    const text = (draft ?? '').trim();
    const extra = context.trim();
    if (!text && !extra) {
      toast.show({ message: 'Add a few words before saving.', kind: 'info' });
      return;
    }
    // Keep the spoken transcript and the added context distinguishable so the
    // summariser can tell what was said from what was noted afterwards.
    const combined = [text, extra && `Additional notes from the patient:\n${extra}`]
      .filter(Boolean)
      .join('\n\n');

    recordVisit(
      { profileId, transcriptionText: combined, audioUri, language },
      {
        onSuccess: (visit) => {
          router.replace({ pathname: '/patient/visit/[id]', params: { id: String(visit.id) } });
        },
        // Failure surfaces through the global mutation toast; stay put so the
        // typed text isn't lost.
      },
    );
  };

  const lines = transcript
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const hasText = lines.length > 0 || interim.length > 0;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      <View className="flex-row items-center justify-between px-5 pt-2">
        <RoundIconButton name="chevron-back" size={20} onPress={() => router.back()} />
        <View className="flex-row items-center gap-[7px] rounded-[20px] border border-rx-line bg-rx-surface px-[13px] py-[7px]">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: isRecording ? rx.accent : rx.muted }} />
          <Text weight="bold" className="text-[12px] tracking-wide text-rx-ink">
            {reviewing ? 'REVIEW' : isRecording ? (isConnected ? 'RECORDING' : 'CONNECTING') : 'PAUSED'}
          </Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <View className="items-center justify-center px-5" style={{ flex: 4 }}>
        <Text weight="semibold" className="mb-1.5 text-[12.5px] text-rx-muted">
          Recording visit for
        </Text>
        <Text weight="extrabold" className="mb-4 text-[19px] text-rx-ink">
          {profileName}
        </Text>
        <Text className="mb-4 text-[46px] text-rx-ink" style={{ fontFamily: 'SpaceMono-Bold' }}>
          {fmt(seconds)}
        </Text>
        <Waveform active={isRecording} />
      </View>

      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0} style={{ flex: 6 }}>
      <View className="flex-1 rounded-t-[26px] border-t border-rx-line bg-rx-surface px-[18px] pt-4">
        <View className="mb-[10px] flex-row items-center justify-between">
          <Text weight="bold" className="text-[13px] text-rx-ink">
            {reviewing ? 'Your note — edit anything' : 'Live transcript'}
          </Text>
          <View className="flex-row items-center gap-[5px]">
            <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: isConnected ? rx.success : rx.faint }} />
            <Text weight="semibold" className="text-[11px] text-rx-muted">
              English detected
            </Text>
          </View>
        </View>

        {reviewing ? (
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            <TextInput
              value={draft ?? ''}
              onChangeText={setDraft}
              multiline
              autoFocus={!(draft ?? '').trim()}
              placeholder="Type your note here…"
              placeholderTextColor={rx.faint}
              className="text-[14px] leading-[21px] text-rx-ink2"
              style={{ fontFamily: 'PlusJakartaSans', minHeight: 140, textAlignVertical: 'top' }}
            />

            <View className="mt-4 border-t border-rx-hairline pt-3.5">
              <Text weight="extrabold" className="mb-1.5 text-[11px] tracking-[0.4px] text-rx-label">
                ADD CONTEXT (OPTIONAL)
              </Text>
              <TextInput
                value={context}
                onChangeText={setContext}
                multiline
                placeholder="Anything you forgot to mention, or how you've been feeling…"
                placeholderTextColor={rx.faint}
                className="rounded-[14px] border-[1.5px] border-rx-line2 bg-rx-bg px-3 py-2.5 text-[14px] leading-[21px] text-rx-ink2"
                style={{ fontFamily: 'PlusJakartaSans', minHeight: 84, textAlignVertical: 'top' }}
              />
            </View>
          </ScrollView>
        ) : (
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={{ paddingBottom: 12 }}
        >
          {hasText ? (
            <>
              {lines.map((line, i) => (
                <FadeLine key={i}>
                  <Text className="text-[14px] leading-[21px] text-rx-ink2">{line}</Text>
                </FadeLine>
              ))}
              {interim ? <Text className="text-[14px] leading-[21px] text-rx-muted">{interim}</Text> : null}
            </>
          ) : (
            <Text weight="medium" className="text-[13.5px] leading-5 text-rx-muted">
              {isRecording ? 'Listening… start the consultation.' : 'Paused.'}
            </Text>
          )}
          {error ? (
            <Text weight="medium" className="mt-3 text-[12.5px] text-rx-accent">
              {error}
            </Text>
          ) : null}
        </ScrollView>
        )}

        <View
          className="flex-row items-center gap-3 border-t border-rx-hairline pt-[10px]"
          style={{ paddingBottom: Math.max(insets.bottom, 10) + 8 }}
        >
          {reviewing ? null : (
          <Pressable
            onPress={togglePause}
            className="h-[52px] w-[52px] items-center justify-center rounded-full bg-rx-hairline active:opacity-80"
          >
            <Ionicons name={isRecording ? 'pause' : 'play'} size={18} color={rx.ink} />
          </Pressable>
          )}
          {reviewing ? null : (
          <Pressable
            onPress={typeInstead}
            accessibilityLabel="Type the note instead"
            className="h-[52px] w-[52px] items-center justify-center rounded-full bg-rx-hairline active:opacity-80"
          >
            <Ionicons name="create-outline" size={18} color={rx.ink} />
          </Pressable>
          )}
          <Pressable
            onPress={reviewing ? saveDraft : stopAndReview}
            disabled={isSaving}
            style={{
              shadowColor: rx.accent,
              shadowOpacity: 0.3,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 12 },
              elevation: 6,
            }}
            className="h-[52px] flex-1 flex-row items-center justify-center gap-[9px] rounded-[26px] bg-rx-accent active:opacity-90 disabled:opacity-60"
          >
            <Ionicons
              name={isSaving ? 'hourglass-outline' : reviewing ? 'checkmark' : 'stop'}
              size={15}
              color="#fff"
            />
            <Text weight="bold" className="text-[15px] text-white">
              {isSaving ? 'Saving…' : reviewing ? 'Save note' : 'Stop & review'}
            </Text>
          </Pressable>
        </View>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
