import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';
import type { PatientDocumentType, PatientOwnedDocument } from './types';

export function usePatientDocuments(profileId?: number) {
  const api = useApiClient();
  return useQuery<PatientOwnedDocument[]>({
    queryKey: ['patient-documents', profileId ?? 'all'],
    queryFn: () => {
      const qs = profileId ? `?profileId=${profileId}` : '';
      return api<PatientOwnedDocument[]>(`/api/patient/documents${qs}`);
    },
  });
}

interface UploadUrlResponse {
  documentId: number;
  uploadUrl: string;
  s3Key: string;
  deduplicated: boolean;
  status: string;
}

export interface UploadPatientDocumentInput {
  profileId: number;
  uri: string;
  filename: string;
  mimeType: string;
  documentType?: PatientDocumentType;
}

/** Full upload flow: hash → presigned URL → PUT to S3 → confirm. */
export function useUploadPatientDocument() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UploadPatientDocumentInput) => {
      const base64 = await FileSystem.readAsStringAsync(input.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const sizeBytes = Math.floor((base64.length * 3) / 4);
      const sha256 = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64, {
        encoding: Crypto.CryptoEncoding.HEX,
      });

      const pre = await api<UploadUrlResponse>('/api/patient/documents/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          profileId: input.profileId,
          filename: input.filename,
          mimeType: input.mimeType,
          sizeBytes,
          sha256,
          documentType: input.documentType ?? 'other',
        }),
      });

      if (!pre.deduplicated) {
        const res = await FileSystem.uploadAsync(pre.uploadUrl, input.uri, {
          httpMethod: 'PUT',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: { 'Content-Type': input.mimeType },
        });
        if (res.status < 200 || res.status >= 300) {
          throw new Error(`Upload failed (${res.status})`);
        }
      }

      return api(`/api/patient/documents/${pre.documentId}/confirm`, { method: 'POST' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient-documents'] }),
  });
}

export function useDeletePatientDocument() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/api/patient/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient-documents'] }),
  });
}

/** A document plus a short-lived presigned `viewUrl` for rendering it. */
export interface PatientDocumentDetail extends PatientOwnedDocument {
  viewUrl: string | null;
}

export function usePatientDocument(documentId: number | null) {
  const api = useApiClient();
  return useQuery<PatientDocumentDetail>({
    queryKey: ['patient-document', documentId],
    queryFn: () => api<PatientDocumentDetail>(`/api/patient/documents/${documentId}`),
    enabled: !!documentId,
    // The presigned URL expires, so don't serve a stale one from cache.
    staleTime: 60 * 1000,
  });
}
