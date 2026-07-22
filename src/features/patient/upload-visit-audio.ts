import * as FileSystem from 'expo-file-system/legacy';

type ApiClient = <T = unknown>(path: string, init?: RequestInit) => Promise<T>;

interface PresignResponse {
  storage: 's3';
  uploadUrl: string;
  key: string;
}

/**
 * Uploads a patient's recorded visit audio: presigned S3 URL → direct PUT →
 * returns the storage key (stored on `patient_visits.audioFileUrl`).
 * Best-effort — returns null on any failure so saving the visit is never blocked.
 */
export async function uploadPatientVisitAudio(
  api: ApiClient,
  fileUri: string,
  profileId: number,
): Promise<string | null> {
  try {
    const ext = fileUri.split('.').pop()?.toLowerCase() === 'm4a' ? 'm4a' : 'wav';
    const contentType = ext === 'm4a' ? 'audio/mp4' : 'audio/wav';
    const fileName = `recording-${Date.now()}.${ext}`;

    const pre = await api<PresignResponse>('/api/patient/visits/upload-url', {
      method: 'POST',
      body: JSON.stringify({ profileId, contentType, fileName }),
    });
    if (!pre.uploadUrl || !pre.key) return null;

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
 * Uploads the visit audio in the BACKGROUND after the visit already exists, then
 * attaches the storage key to the visit via PATCH.
 *
 * This is intentionally decoupled from visit creation and summary generation:
 * the plain-language summary is derived from the transcript (already captured
 * client-side), so it must never wait on a slow S3 upload. The recording can be
 * several MB; uploading it inline used to block the user on a "Saving…" spinner
 * and — worse — pushed the follow-up `POST /visits` / summary calls behind a
 * long upload, so a failed or slow upload meant no summary at all.
 *
 * Fire-and-forget: callers should NOT await this. It swallows all errors (the
 * transcript is the source of truth; audio is only kept for re-transcription).
 * `onDone` runs after a successful attach so the caller can refresh caches.
 */
export function uploadVisitAudioInBackground(
  api: ApiClient,
  fileUri: string,
  profileId: number,
  visitId: number,
  onDone?: (key: string) => void,
): void {
  void (async () => {
    try {
      const key = await uploadPatientVisitAudio(api, fileUri, profileId);
      if (!key) return;
      await api(`/api/patient/visits/${visitId}`, {
        method: 'PATCH',
        body: JSON.stringify({ audioFileUrl: key }),
      });
      onDone?.(key);
    } catch {
      // Best-effort: a missing audio file never affects the summary.
    }
  })();
}
