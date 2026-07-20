import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '@/lib/api-client';
import type { Visit } from '@/features/patients/types';
import { uploadAudioFile } from './upload-audio';

interface GenerateNoteInput {
  patientId: number;
  transcript: string;
  language: string;
  templateId?: number;
  /** Local WAV file uri captured during recording; uploaded + attached to the visit. */
  audioUri?: string | null;
}

interface GenerateSoapResponse {
  soapNote: Record<string, unknown>;
  metadata?: {
    service?: string;
    generationMode?: string;
    specialty?: string;
    processingTime?: number;
  };
}

export interface GeneratedNote {
  visit: Visit;
  /** The stored note string (JSON) — parse with parseStoredNote for rendering. */
  soapNote: string;
}

/**
 * Turns a finished transcript into a saved clinical note, mirroring the web flow:
 *   1. Upload the recorded audio (presigned S3 PUT) → storage key   [best-effort]
 *   2. POST /api/generate-soap  → structured SOAP JSON
 *   3. POST /api/visits         → persist the visit (transcript + audio + note)
 * The visit's doctorId / org / visibility are assigned server-side from the caller.
 */
export function useGenerateNote() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<GeneratedNote, Error, GenerateNoteInput>({
    mutationFn: async ({ patientId, transcript, language, templateId, audioUri }) => {
      // Upload audio first (best-effort) so the visit can reference it. A failed
      // upload must not block note-saving, so uploadAudioFile returns null on error.
      const audioFileUrl = audioUri ? await uploadAudioFile(api, audioUri, patientId) : null;

      const gen = await api<GenerateSoapResponse>('/api/generate-soap', {
        method: 'POST',
        body: JSON.stringify({
          transcription: transcript,
          patientId,
          language,
          ...(templateId ? { templateId } : {}),
        }),
      });

      // Match the web's stored shape (soapNote text + soapNoteJson object).
      const soapNoteWithMetadata = { ...gen.soapNote, framework: 'soap' };
      const soapNote = JSON.stringify(soapNoteWithMetadata);

      const visit = await api<Visit>('/api/visits', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          transcriptionText: transcript,
          language,
          ...(templateId ? { templateId } : {}),
          ...(audioFileUrl ? { audioFileUrl } : {}),
          soapNote,
          soapNoteJson: soapNoteWithMetadata,
          processing_status: 'completed',
        }),
      });

      return { visit, soapNote };
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['patient-visits', String(vars.patientId)] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}
