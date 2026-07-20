import { useCallback, useRef, useState } from 'react';
import { NativeModules } from 'react-native';
import LiveAudioStream from '@fugood/react-native-audio-pcm-stream';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

import { startRecordingService, stopRecordingService, encodePcmToM4a } from '../../../modules/rx-recording';

/** The native PCM module only exists in a dev build (not Expo Go). */
const AUDIO_NATIVE_AVAILABLE = !!NativeModules.RNLiveAudioStream;

const SONIOX_WS_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';
const MODEL = 'stt-rt-v5';
const SAMPLE_RATE = 16000;
/** Cap captured audio to ~25 min so the in-memory PCM buffer stays bounded. */
const MAX_PCM_BYTES = SAMPLE_RATE * 2 * 60 * 25;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
/** Self-contained base64 → bytes (avoids relying on a global atob). */
function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array((clean.length * 3) >> 2);
  let bits = 0;
  let bitCount = 0;
  let o = 0;
  for (let i = 0; i < clean.length; i++) {
    bits = (bits << 6) | B64.indexOf(clean[i]);
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      out[o++] = (bits >> bitCount) & 0xff;
    }
  }
  return out.subarray(0, o);
}

/** bytes → base64 (for writing the assembled WAV to disk). */
function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < bytes.length ? B64[b2 & 63] : '=';
  }
  return out;
}

/** Prepend a 44-byte PCM WAV header (s16le) to raw PCM. */
function buildWav(pcm: Uint8Array, sampleRate: number, channels: number, bits: number): Uint8Array {
  const blockAlign = (channels * bits) / 8;
  const byteRate = sampleRate * blockAlign;
  const buf = new ArrayBuffer(44 + pcm.length);
  const v = new DataView(buf);
  const s = (o: number, str: string) => {
    for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i));
  };
  s(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length, true);
  s(8, 'WAVE');
  s(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, byteRate, true);
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, bits, true);
  s(36, 'data');
  v.setUint32(40, pcm.length, true);
  new Uint8Array(buf, 44).set(pcm);
  return new Uint8Array(buf);
}

/** AAC bitrate for the archived m4a — 32 kbps is ample for 16 kHz mono speech. */
const AAC_BITRATE = 32000;

/** Concatenate captured PCM chunks into one buffer. */
function joinPcm(chunks: Uint8Array[], totalBytes: number): Uint8Array {
  const pcm = new Uint8Array(totalBytes);
  let off = 0;
  for (const c of chunks) {
    pcm.set(c, off);
    off += c.length;
  }
  return pcm;
}

/** Write raw s16le PCM to disk (no header) as the AAC encoder's input. */
async function writeRawPcm(pcm: Uint8Array): Promise<string> {
  const uri = `${FileSystem.cacheDirectory}visit-${Date.now()}.pcm`;
  await FileSystem.writeAsStringAsync(uri, bytesToBase64(pcm), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

/** Assemble captured PCM chunks into a WAV file on disk; returns its uri. */
async function writeWavFile(chunks: Uint8Array[], totalBytes: number): Promise<string | null> {
  if (totalBytes === 0) return null;
  const pcm = new Uint8Array(totalBytes);
  let off = 0;
  for (const c of chunks) {
    pcm.set(c, off);
    off += c.length;
  }
  const wav = buildWav(pcm, SAMPLE_RATE, 1, 16);
  const uri = `${FileSystem.cacheDirectory}visit-${Date.now()}.wav`;
  await FileSystem.writeAsStringAsync(uri, bytesToBase64(wav), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

interface SonioxToken {
  text?: string;
  is_final?: boolean;
  translation_status?: 'none' | 'original' | 'translation';
  speaker?: string;
}
interface SonioxMessage {
  tokens?: SonioxToken[];
  finished?: boolean;
  error_code?: number;
  error_message?: string;
}

export interface ScribeTranscriptionConfig {
  language: string;
  getApiKey: () => Promise<string>;
}

export function useScribeTranscription({ language, getApiKey }: ScribeTranscriptionConfig) {
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const finalRef = useRef('');
  const recordingRef = useRef(false);
  const listenerAttached = useRef(false);
  const pcmChunksRef = useRef<Uint8Array[]>([]);
  const pcmBytesRef = useRef(0);
  const audioUriRef = useRef<string | null>(null);
  // The native mic (AudioRecord) is started exactly once per session. Re-initing a
  // live recorder races its read thread and aborts natively, so pause/resume must
  // never touch it — only the socket is torn down / rebuilt.
  const micStartedRef = useRef(false);

  const handleMessage = useCallback((raw: string) => {
    let msg: SonioxMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.error_message) {
      setError(msg.error_message);
      return;
    }
    if (!msg.tokens) return;

    let interimBuf = '';
    for (const t of msg.tokens) {
      if (!t.text) continue;
      const status = t.translation_status;
      // Keep the English note: translated tokens, or untranslated 'none' tokens.
      const isEnglish = status === 'translation' || status === 'none' || status === undefined;
      if (!isEnglish) continue;
      if (t.is_final) {
        finalRef.current += t.text;
        setTranscript(finalRef.current);
      } else {
        interimBuf += t.text;
      }
    }
    setInterim(interimBuf);
  }, []);

  // Open (or reopen) the Soniox socket. Deliberately independent of the mic so a
  // socket that idled out during a pause can be rebuilt on resume WITHOUT
  // re-initialising the native AudioRecord (which races its read thread and aborts).
  const openSocket = useCallback(
    (apiKey: string) => {
      const translate = language !== 'en' && !language.startsWith('en');
      const ws = new WebSocket(SONIOX_WS_URL);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => {
        setIsConnected(true);
        ws.send(
          JSON.stringify({
            api_key: apiKey,
            model: MODEL,
            audio_format: 's16le',
            sample_rate: SAMPLE_RATE,
            num_channels: 1,
            language_hints: [language],
            enable_endpoint_detection: true,
            enable_speaker_diarization: true,
            context: {
              general: [
                { key: 'domain', value: 'Healthcare' },
                { key: 'topic', value: 'Medical consultation' },
              ],
            },
            ...(translate ? { translation: { type: 'one_way', target_language: 'en' } } : {}),
          }),
        );
      };
      ws.onmessage = (e) => handleMessage(String(e.data));
      ws.onerror = () => setError('Transcription connection error.');
      ws.onclose = () => setIsConnected(false);
    },
    [language, handleMessage],
  );

  const start = useCallback(async () => {
    // Guard against double-start: one live socket at a time.
    // Pausing keeps the session alive, so start() only runs for a fresh session.
    if (wsRef.current) return;
    setError(null);
    if (!AUDIO_NATIVE_AVAILABLE) {
      setError(
        'Live recording needs the dev build (not available in Expo Go). Build it on your device: npx expo run:android',
      );
      return;
    }
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError('Microphone permission is required to record.');
        return;
      }

      const apiKey = await getApiKey();
      openSocket(apiKey);

      // Initialise + start the native mic ONCE per session. Pause/resume never
      // re-run this; re-initing a live AudioRecord is what crashed the app.
      if (!micStartedRef.current) {
        LiveAudioStream.init({
          sampleRate: SAMPLE_RATE,
          channels: 1,
          bitsPerSample: 16,
          audioSource: 6, // Android VOICE_RECOGNITION; ignored on iOS
          bufferSize: 4096,
          wavFile: '',
        });

        if (!listenerAttached.current) {
          listenerAttached.current = true;
          LiveAudioStream.on('data', (b64: string) => {
            if (!recordingRef.current) return;
            const bytes = base64ToBytes(b64);
            const socket = wsRef.current;
            if (socket && socket.readyState === WebSocket.OPEN) socket.send(bytes);
            // Also retain the PCM so we can save a WAV audio file on stop (bounded).
            if (pcmBytesRef.current < MAX_PCM_BYTES) {
              pcmChunksRef.current.push(bytes);
              pcmBytesRef.current += bytes.length;
            }
          });
        }

        // Start the mic FGS (Android) / activate the background audio session (iOS)
        // WHILE the app is foregrounded, so capture survives lock/background.
        startRecordingService();
        LiveAudioStream.start();
        micStartedRef.current = true;
      }

      recordingRef.current = true;
      setIsRecording(true);
    } catch (e) {
      setError((e as Error)?.message ?? 'Could not start recording.');
      setIsRecording(false);
      recordingRef.current = false;
    }
  }, [getApiKey, openSocket]);

  // Pause: keep the socket + mic session alive, just stop forwarding/capturing audio.
  const pause = useCallback(() => {
    recordingRef.current = false;
    setIsRecording(false);
    setInterim('');
  }, []);

  // Resume: re-enable capture. The mic never stopped, so at most we reopen the
  // Soniox socket if it idled out during the pause — never re-init the mic.
  const resume = useCallback(async () => {
    recordingRef.current = true;
    setIsRecording(true);
    const ws = wsRef.current;
    if (!ws || ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
      wsRef.current = null;
      try {
        const apiKey = await getApiKey();
        openSocket(apiKey);
      } catch (e) {
        setError((e as Error)?.message ?? 'Could not reconnect transcription.');
      }
    }
  }, [getApiKey, openSocket]);

  const stop = useCallback(async () => {
    recordingRef.current = false;
    try {
      await LiveAudioStream.stop();
    } catch {
      // ignore
    }
    micStartedRef.current = false;
    stopRecordingService();
    const ws = wsRef.current;
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(new Uint8Array(0)); // end-of-stream
      } catch {
        // ignore
      }
      try {
        ws.close();
      } catch {
        // ignore
      }
    }
    wsRef.current = null;
    // Assemble the captured audio (once). Prefer a compact AAC/.m4a (~8× smaller
    // than WAV → far faster upload) via the native encoder; fall back to WAV if the
    // encoder is unavailable (Expo Go) or fails.
    if (!audioUriRef.current && pcmBytesRef.current > 0) {
      try {
        const pcm = joinPcm(pcmChunksRef.current, pcmBytesRef.current);
        const pcmPath = await writeRawPcm(pcm);
        const m4aPath = `${FileSystem.cacheDirectory}visit-${Date.now()}.m4a`;
        try {
          const encoded = await encodePcmToM4a(pcmPath, m4aPath, SAMPLE_RATE, 1, AAC_BITRATE);
          if (encoded) audioUriRef.current = encoded;
        } catch {
          // encoder failed — fall through to WAV below
        }
        if (!audioUriRef.current) {
          audioUriRef.current = await writeWavFile(pcmChunksRef.current, pcmBytesRef.current);
        }
        FileSystem.deleteAsync(pcmPath, { idempotent: true }).catch(() => {});
      } catch {
        audioUriRef.current = null;
      }
      pcmChunksRef.current = [];
    }
    setIsRecording(false);
    setIsConnected(false);
    setInterim('');
    return audioUriRef.current;
  }, []);

  return {
    transcript,
    interim,
    isRecording,
    isConnected,
    error,
    fullTranscript: (transcript + (interim ? ` ${interim}` : '')).trim(),
    start,
    pause,
    resume,
    stop,
  };
}
