import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Native module (`rx-recording`) that keeps mic capture alive while the app is
 * backgrounded / the phone is locked:
 *  - Android: starts a `microphone`-type foreground service (persistent notification)
 *    so the OS keeps the process + mic access alive. Must be started while the app
 *    is foregrounded (i.e. on the Record tap) — Android forbids starting a mic FGS
 *    from the background.
 *  - iOS: configures AVAudioSession (.playAndRecord) + relies on the app's
 *    UIBackgroundModes=["audio"] so capture continues when locked. No service.
 *
 * Optional: absent in Expo Go / if autolinking hasn't picked it up, so callers
 * degrade to foreground-only recording instead of crashing.
 */
const RxRecording = requireOptionalNativeModule('RxRecording');

/** Begin holding the mic in the background. Call right before/at recording start. */
export function startRecordingService(): void {
  RxRecording?.startService();
}

/** Release the background mic hold. Call on stop. */
export function stopRecordingService(): void {
  RxRecording?.stopService();
}

/**
 * Encode a raw s16le PCM file to AAC/.m4a using the OS-native encoder
 * (Android MediaCodec / iOS AVAudioFile). Resolves with the output path, or
 * throws — callers should fall back to uploading the WAV. Returns null if the
 * native module isn't present (Expo Go).
 */
export async function encodePcmToM4a(
  pcmPath: string,
  outPath: string,
  sampleRate: number,
  channels: number,
  bitRate: number,
): Promise<string | null> {
  if (!RxRecording) return null;
  return RxRecording.encodeToM4a(pcmPath, outPath, sampleRate, channels, bitRate);
}
