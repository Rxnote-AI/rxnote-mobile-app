import LiveAudioStream from '@fugood/react-native-audio-pcm-stream';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import { useCallback, useRef, useState } from 'react';
import { NativeModules } from 'react-native';

/**
 * Live speech-to-text for the chat composer. Reuses the same Soniox realtime
 * protocol as the scribe recorder ([[mobile-recording-flow]]) but strips everything
 * the note flow needs and voice-to-text does not: no PCM retention, no audio file,
 * no foreground service. Just: open socket → stream mic PCM → surface the transcript.
 */

const AUDIO_NATIVE_AVAILABLE = !!NativeModules.RNLiveAudioStream;
const SONIOX_WS_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';
const MODEL = 'stt-rt-v5';
const SAMPLE_RATE = 16000;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
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

interface SonioxToken {
  text?: string;
  is_final?: boolean;
}
interface SonioxMessage {
  tokens?: SonioxToken[];
  error_message?: string;
}

export function useVoiceInput(getApiKey: () => Promise<string>) {
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const finalRef = useRef('');
  const interimRef = useRef('');
  const recordingRef = useRef(false);
  const listenerAttached = useRef(false);
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
      if (t.is_final) {
        finalRef.current += t.text;
        setTranscript(finalRef.current);
      } else {
        interimBuf += t.text;
      }
    }
    interimRef.current = interimBuf;
    setInterim(interimBuf);
  }, []);

  const start = useCallback(async () => {
    if (wsRef.current) return;
    setError(null);
    setTranscript('');
    setInterim('');
    finalRef.current = '';
    interimRef.current = '';

    if (!AUDIO_NATIVE_AVAILABLE) {
      setError('Voice input needs the dev/standalone build (not Expo Go).');
      return;
    }
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError('Microphone permission is required.');
        return;
      }

      const apiKey = await getApiKey();
      const ws = new WebSocket(SONIOX_WS_URL);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            api_key: apiKey,
            model: MODEL,
            audio_format: 's16le',
            sample_rate: SAMPLE_RATE,
            num_channels: 1,
            language_hints: ['en'],
            enable_endpoint_detection: true,
          }),
        );
      };
      ws.onmessage = (e) => handleMessage(String(e.data));
      ws.onerror = () => setError('Voice connection error.');

      // Mic starts once per hook instance (re-initing a live AudioRecord aborts natively).
      if (!micStartedRef.current) {
        LiveAudioStream.init({
          sampleRate: SAMPLE_RATE,
          channels: 1,
          bitsPerSample: 16,
          audioSource: 6,
          bufferSize: 4096,
          wavFile: '',
        });
        if (!listenerAttached.current) {
          listenerAttached.current = true;
          LiveAudioStream.on('data', (b64: string) => {
            if (!recordingRef.current) return;
            const socket = wsRef.current;
            if (socket && socket.readyState === WebSocket.OPEN) socket.send(base64ToBytes(b64));
          });
        }
        LiveAudioStream.start();
        micStartedRef.current = true;
      }

      recordingRef.current = true;
      setListening(true);
    } catch (e) {
      setError((e as Error)?.message ?? 'Could not start voice input.');
      setListening(false);
      recordingRef.current = false;
    }
  }, [getApiKey, handleMessage]);

  /** Stop listening and return the final transcript text (final + trailing interim). */
  const stop = useCallback(async (): Promise<string> => {
    recordingRef.current = false;
    try {
      await LiveAudioStream.stop();
    } catch {
      // ignore
    }
    micStartedRef.current = false;
    const ws = wsRef.current;
    if (ws) {
      try {
        ws.close();
      } catch {
        // ignore
      }
    }
    wsRef.current = null;
    setListening(false);
    const text = `${finalRef.current} ${interimRef.current}`.replace(/\s+/g, ' ').trim();
    setInterim('');
    return text;
  }, []);

  return {
    transcript,
    interim,
    listening,
    error,
    text: `${transcript} ${interim}`.replace(/\s+/g, ' ').trim(),
    start,
    stop,
  };
}
