import * as FileSystem from 'expo-file-system/legacy';

type ApiClient = <T = unknown>(path: string, init?: RequestInit) => Promise<T>;

interface PresignResponse {
  storage: 's3' | 'firebase';
  uploadUrl?: string;
  key?: string;
  storagePath?: string;
}

/**
 * Uploads a recorded audio file the same way the web does: ask the backend for a
 * presigned S3 URL, PUT the file straight to storage, and return the storage `key`
 * (which is what gets stored on `visits.audioFileUrl`). Best-effort — returns null
 * on any failure so note-saving is never blocked by an audio-upload problem.
 */
export async function uploadAudioFile(
  api: ApiClient,
  fileUri: string,
  patientId: number,
): Promise<string | null> {
  try {
    // Derive type from the file the recorder produced (.m4a preferred, .wav fallback).
    const ext = fileUri.split('.').pop()?.toLowerCase() === 'm4a' ? 'm4a' : 'wav';
    const contentType = ext === 'm4a' ? 'audio/mp4' : 'audio/wav';
    const fileName = `recording-${Date.now()}.${ext}`;
    const pre = await api<PresignResponse>('/api/storage/presigned-upload', {
      method: 'POST',
      body: JSON.stringify({ patientId, contentType, fileName }),
    });

    if (pre.storage !== 's3' || !pre.uploadUrl || !pre.key) {
      // Firebase direct-upload isn't wired on mobile yet.
      return null;
    }

    const res = await FileSystem.uploadAsync(pre.uploadUrl, fileUri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': contentType },
    });

    return res.status >= 200 && res.status < 300 ? pre.key : null;
  } catch {
    return null;
  }
}

/**
 * Uploads the visit audio in the BACKGROUND after SOAP generation has already been
 * kicked off, then attaches the storage key to the visit via `PUT /api/visits/:id`.
 *
 * Decoupled from note generation on purpose: mobile always sends the on-device Soniox
 * transcript as `preTranscribedText`, so the server skips its own transcription step
 * and never needs the audio file to start generating the SOAP note. Awaiting a
 * multi-MB upload (a 1-hour visit) before even starting generation was pure dead time.
 *
 * Fire-and-forget: callers should NOT await this. It swallows all errors — the
 * transcript is the source of truth; audio is only kept for playback/re-transcription.
 */
export function uploadVisitAudioInBackground(
  api: ApiClient,
  fileUri: string,
  patientId: number,
  visitId: number,
): void {
  void (async () => {
    try {
      const key = await uploadAudioFile(api, fileUri, patientId);
      if (!key) return;
      await api(`/api/visits/${visitId}`, {
        method: 'PUT',
        body: JSON.stringify({ audioFileUrl: key }),
      });
    } catch {
      // Best-effort: a missing audio file never affects the generated note.
    }
  })();
}
