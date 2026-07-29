import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/chip';
import { RoundIconButton } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Waveform } from '@/components/ui/waveform';
import { CareTypePicker } from '@/features/care-journey/care-type-picker';
import { useCreateCareJourney } from '@/features/care-journey/use-create-care-journey';
import { SCRIBE_LANGUAGES } from '@/features/scribe/languages';
import { useScribeTranscription } from '@/features/scribe/use-scribe-transcription';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useApiClient } from '@/lib/api-client';
import { rx } from '@/theme/rx';

/** Mix-and-match cap — Soniox `language_hints` stays accurate with a handful of hints. */
const MAX_LANGUAGES = 3;

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

export default function CareJourneyRecordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ patientId: string; patientName?: string; visitId?: string }>();
  const patientId = Number(params.patientId);
  const patientName = params.patientName || 'this patient';
  const visitId = params.visitId ? Number(params.visitId) : null;

  const toast = useToast();
  const { user: clerkUser } = useUser();
  const { data: me } = useCurrentUser();

  // Spoken languages for this recording — up to 3, mixed/code-switched speech (Soniox hints).
  const [languages, setLanguages] = useState<string[]>(['en']);
  const [langSheetOpen, setLangSheetOpen] = useState(false);
  const primaryLanguage = languages[0];

  const api = useApiClient();
  const getApiKey = useCallback(async () => {
    const res = await api<{ apiKey: string }>(`/api/soniox-token?language=${primaryLanguage}`);
    return res.apiKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const {
    transcript,
    interim,
    fullTranscript,
    isRecording,
    isConnected,
    error,
    start,
    pause,
    resume,
    stop,
    reconnectSocket,
  } = useScribeTranscription({ language: primaryLanguage, languages, getApiKey });
  const { mutate: createEntry, isPending: isSaving } = useCreateCareJourney();

  const [seconds, setSeconds] = useState(0);
  const [draft, setDraft] = useState<string | null>(null);
  const [careType, setCareType] = useState('general');
  const [recordedBy, setRecordedBy] = useState('');
  const reviewing = draft !== null;
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // Default "Recorded by" to the signed-in clinician once their name loads — still editable.
  useEffect(() => {
    if (recordedBy) return;
    const fallback = me?.name || clerkUser?.fullName || '';
    if (fallback) setRecordedBy(fallback);
  }, [me?.name, clerkUser?.fullName, recordedBy]);

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

  // Language hints are only sent when the Soniox socket opens, so a mid-session change
  // has to force a reconnect — the mic itself is untouched, play/pause state stays as-is,
  // and the transcript captured so far stays put.
  const languagesKey = languages.join(',');
  const prevLanguagesKey = useRef(languagesKey);
  useEffect(() => {
    if (prevLanguagesKey.current === languagesKey) return;
    prevLanguagesKey.current = languagesKey;
    if (!reviewing) reconnectSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languagesKey]);

  const togglePause = () => {
    if (isRecording) pause();
    else resume();
  };

  const toggleLanguage = (code: string) => {
    setLanguages((prev) => {
      if (prev.includes(code)) {
        if (prev.length === 1) return prev; // keep at least one selected
        return prev.filter((c) => c !== code);
      }
      if (prev.length >= MAX_LANGUAGES) {
        toast.show({ message: `Mix up to ${MAX_LANGUAGES} languages at a time.`, kind: 'info' });
        return prev;
      }
      return [...prev, code];
    });
  };

  const stopAndReview = async () => {
    const captured = fullTranscript;
    await stop();
    setDraft(captured);
  };

  const typeInstead = async () => {
    await stop();
    setDraft(fullTranscript);
  };

  const saveDraft = () => {
    const text = (draft ?? '').trim();
    if (!text) {
      toast.show({ message: 'Add a few words before saving.', kind: 'info' });
      return;
    }
    if (!recordedBy.trim()) {
      toast.show({ message: "Add who's recording this entry.", kind: 'info' });
      return;
    }
    createEntry(
      {
        patientId,
        visitId,
        recordedBy: recordedBy.trim(),
        transcriptionText: text,
        careType,
        language: languagesKey,
      },
      {
        onSuccess: () => {
          toast.show({ message: 'Entry saved', kind: 'success' });
          router.back();
        },
      },
    );
  };

  const lines = transcript
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const hasText = lines.length > 0 || interim.length > 0;

  const languageLabels = languages
    .map((code) => SCRIBE_LANGUAGES.find((l) => l.code === code)?.label ?? code)
    .join(' + ');
  const languageBadge = languages.map((code) => code.toUpperCase()).join('+');

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
        {reviewing ? (
          <View style={{ width: 38 }} />
        ) : (
          <Pressable
            onPress={() => setLangSheetOpen(true)}
            accessibilityLabel="Change spoken language"
            className="h-[38px] flex-row items-center gap-[5px] rounded-full border border-rx-line bg-rx-surface px-[11px] active:opacity-80"
          >
            <Ionicons name="globe-outline" size={15} color={rx.ink} />
            <Text weight="bold" className="text-[11.5px] text-rx-ink">
              {languageBadge}
            </Text>
          </Pressable>
        )}
      </View>

      {reviewing ? null : (
        <View className="items-center justify-center px-5" style={{ flex: 3 }}>
          <Text weight="semibold" className="mb-1.5 text-[12.5px] text-rx-muted">
            Care journey entry for
          </Text>
          <Text weight="extrabold" className="mb-4 text-[19px] text-rx-ink">
            {patientName}
          </Text>
          <Text className="mb-4 text-[46px] text-rx-ink" style={{ fontFamily: 'SpaceMono-Bold' }}>
            {fmt(seconds)}
          </Text>
          <Waveform active={isRecording} />
        </View>
      )}

      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0} style={{ flex: reviewing ? 1 : 7 }}>
      <View className="flex-1 rounded-t-[26px] border-t border-rx-line bg-rx-surface px-[18px] pt-4">
        {reviewing ? (
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            <Text weight="bold" className="mb-1.5 text-[11px] tracking-wide text-rx-label">
              CARE TYPE
            </Text>
            <CareTypePicker value={careType} onChange={setCareType} />

            <Text weight="bold" className="mb-1.5 mt-4 text-[11px] tracking-wide text-rx-label">
              RECORDED BY
            </Text>
            <TextInput
              value={recordedBy}
              onChangeText={setRecordedBy}
              placeholder="Name"
              placeholderTextColor={rx.faint}
              className="rounded-[14px] border border-rx-line2 bg-rx-bg px-[14px] py-[11px] text-[14px] text-rx-ink"
              style={{ fontFamily: 'PlusJakartaSans' }}
            />

            <Text weight="bold" className="mb-1.5 mt-4 text-[11px] tracking-wide text-rx-label">
              ENTRY — EDIT ANYTHING
            </Text>
            <TextInput
              value={draft ?? ''}
              onChangeText={setDraft}
              multiline
              autoFocus={!(draft ?? '').trim()}
              placeholder="Type the entry here…"
              placeholderTextColor={rx.faint}
              className="text-[14px] leading-[21px] text-rx-ink2"
              style={{ fontFamily: 'PlusJakartaSans', minHeight: 140, textAlignVertical: 'top' }}
            />
          </ScrollView>
        ) : (
        <>
        <View className="mb-[10px] flex-row items-center justify-between">
          <Text weight="bold" className="text-[13px] text-rx-ink">
            Live transcript
          </Text>
          <View className="flex-row items-center gap-[5px]">
            <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: isConnected ? rx.success : rx.faint }} />
            <Text weight="semibold" className="text-[11px] text-rx-muted" numberOfLines={1}>
              {languageLabels}
            </Text>
          </View>
        </View>
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
              {isRecording ? 'Listening… describe the update.' : 'Paused.'}
            </Text>
          )}
          {error ? (
            <Text weight="medium" className="mt-3 text-[12.5px] text-rx-accent">
              {error}
            </Text>
          ) : null}
        </ScrollView>
        </>
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
            accessibilityLabel="Type the entry instead"
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
              {isSaving ? 'Saving…' : reviewing ? 'Save entry' : 'Stop & review'}
            </Text>
          </Pressable>
        </View>
      </View>
      </KeyboardAvoidingView>

      <Modal visible={langSheetOpen} transparent animationType="slide" onRequestClose={() => setLangSheetOpen(false)}>
        <Pressable className="flex-1 justify-end bg-[rgba(15,15,17,0.42)]" onPress={() => setLangSheetOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="rounded-t-[26px] bg-rx-bg px-5 pt-[10px]"
            style={{ paddingBottom: Math.max(insets.bottom, 20) + 14 }}
          >
            <View className="mx-auto mb-[16px] h-[5px] w-[38px] rounded-[5px] bg-[#DCDBD6]" />
            <Text weight="extrabold" className="mb-1 text-[17px] text-rx-ink">
              Spoken language
            </Text>
            <Text weight="medium" className="mb-4 text-[12.5px] text-rx-muted">
              Mix up to {MAX_LANGUAGES} — Soniox transcribes and translates each to English.
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {SCRIBE_LANGUAGES.map((l) => (
                <Chip
                  key={l.code}
                  label={l.label}
                  selected={languages.includes(l.code)}
                  onPress={() => toggleLanguage(l.code)}
                />
              ))}
            </View>
            <Pressable
              onPress={() => setLangSheetOpen(false)}
              className="mt-5 h-11 items-center justify-center rounded-full bg-rx-accent active:opacity-90"
            >
              <Text weight="bold" className="text-[14px] text-white">
                Done
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
