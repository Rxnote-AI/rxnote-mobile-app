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
