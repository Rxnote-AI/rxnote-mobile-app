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
