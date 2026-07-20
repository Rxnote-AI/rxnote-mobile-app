import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoundIconButton } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import { Waveform } from '@/components/ui/waveform';
import { SCRIBE_LANGUAGES } from '@/features/scribe/languages';
import { useScribeTranscription } from '@/features/scribe/use-scribe-transcription';
import { useTemplates } from '@/features/templates/use-templates';
import { useApiClient } from '@/lib/api-client';
import { rx } from '@/theme/rx';

function fmt(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

/** Fades its content in on mount — gives new transcript lines a smooth reveal. */
function FadeLine({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [opacity]);
  return <Animated.View style={{ opacity }} className="mb-2">{children}</Animated.View>;
}

export default function ScribeSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    patientId?: string;
    patientName?: string;
    templateId?: string;
    language?: string;
  }>();
  const language = params.language || 'en';
  const langLabel = SCRIBE_LANGUAGES.find((l) => l.code === language)?.label ?? 'English';
  const langShort = language.slice(0, 2).toUpperCase();

  const { data: templates } = useTemplates();
  const templateName = templates?.find((t) => String(t.id) === params.templateId)?.name ?? 'SOAP';
  const patientName = params.patientName || 'Patient';

  const api = useApiClient();
  const getApiKey = useCallback(async () => {
    const res = await api<{ apiKey: string }>(`/api/soniox-token?language=${language}`);
    return res.apiKey;
  }, [api, language]);

  const { transcript, interim, fullTranscript, isRecording, isConnected, error, start, pause, resume, stop } =
    useScribeTranscription({ language, getApiKey });

  const [seconds, setSeconds] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // Auto-start when arriving from the setup screen.
  useEffect(() => {
    start();
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Elapsed timer — advances only while actively recording.
  useEffect(() => {
    if (!isRecording) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  const togglePause = () => {
    if (isRecording) pause();
    else resume();
  };

  const stopAndGenerate = async () => {
    const captured = fullTranscript;
    const audioUri = await stop(); // assembles the WAV file and returns its uri
    router.replace({
      pathname: '/note',
      params: {
        patientId: params.patientId ?? '',
        patientName,
        templateId: params.templateId ?? '',
        template: templateName,
        language,
        transcript: captured,
        audioUri: audioUri ?? '',
      },
    });
  };

  // Split the finalized transcript into sentence-ish lines so it reads line-by-line
  // (like the web) rather than one dense block.
  const lines = transcript
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const hasText = lines.length > 0 || interim.length > 0;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2">
        <RoundIconButton name="chevron-back" size={20} onPress={() => router.back()} />
        <View className="flex-row items-center gap-[7px] rounded-[20px] border border-rx-line bg-rx-surface px-[13px] py-[7px]">
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: isRecording ? rx.accent : rx.muted }}
          />
          <Text weight="bold" className="text-[12px] tracking-wide text-rx-ink">
            {isRecording ? (isConnected ? 'RECORDING' : 'CONNECTING') : 'PAUSED'}
          </Text>
        </View>
        <View className="rounded-[20px] border border-rx-line bg-rx-surface px-3 py-[7px]">
          <Text weight="bold" className="text-[12px] text-rx-ink">
            {langShort}
          </Text>
        </View>
      </View>

      {/* Top 40% — patient + timer + waveform */}
      <View className="items-center justify-center px-5" style={{ flex: 4 }}>
        <Text weight="semibold" className="mb-1.5 text-[12.5px] text-rx-muted">
          Recording visit with
        </Text>
        <Text weight="extrabold" className="mb-1 text-[19px] text-rx-ink">
          {patientName}
        </Text>
        <Text weight="semibold" className="mb-4 text-[12px] text-rx-muted">
          {templateName} · {langLabel}
        </Text>
        <Text className="mb-4 text-[46px] text-rx-ink" style={{ fontFamily: 'SpaceMono-Bold' }}>
          {fmt(seconds)}
        </Text>
        <Waveform active={isRecording} />
      </View>

      {/* Bottom 60% — live transcript */}
      <View
        className="rounded-t-[26px] border-t border-rx-line bg-rx-surface px-[18px] pt-4"
        style={{ flex: 6 }}
      >
        <View className="mb-[10px] flex-row items-center justify-between">
          <Text weight="bold" className="text-[13px] text-rx-ink">
            Live transcript
          </Text>
          <View className="flex-row items-center gap-[5px]">
            <View
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: isConnected ? rx.success : rx.faint }}
            />
            <Text weight="semibold" className="text-[11px] text-rx-muted">
              {langLabel} detected
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
              {interim ? (
                <Text className="text-[14px] leading-[21px] text-rx-muted">{interim}</Text>
              ) : null}
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

        <View
          className="flex-row items-center gap-3 border-t border-rx-hairline pt-[10px]"
          style={{ paddingBottom: Math.max(insets.bottom, 10) + 8 }}
        >
          <Pressable
            onPress={togglePause}
            className="h-[52px] w-[52px] items-center justify-center rounded-full bg-rx-hairline active:opacity-80"
          >
            <Ionicons name={isRecording ? 'pause' : 'play'} size={18} color={rx.ink} />
          </Pressable>
          <Pressable
            onPress={stopAndGenerate}
            style={{
              shadowColor: rx.accent,
              shadowOpacity: 0.3,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 12 },
              elevation: 6,
            }}
            className="h-[52px] flex-1 flex-row items-center justify-center gap-[9px] rounded-[26px] bg-rx-accent active:opacity-90"
          >
            <Ionicons name="stop" size={15} color="#fff" />
            <Text weight="bold" className="text-[15px] text-white">
              Stop &amp; generate note
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
