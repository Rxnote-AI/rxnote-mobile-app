import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import { useProcessingStore } from '@/hooks/use-processing-visits';
import { uploadAudioFile } from './upload-audio';

export type SaveStep = 'saving' | 'uploading' | 'processing';

interface BackgroundSaveInput {
  patientId: number;
  patientName: string;
  doctorId: number;
  transcript: string;
  language: string;
  templateId?: number;
  specialty?: string;
  audioUri?: string | null;
  /** Fired the moment the visit row exists (step 1) so the UI can start polling
   *  real server progress immediately, instead of waiting for the whole mutation. */
  onVisitCreated?: (visitId: number) => void;
  /** Fired as each client-side step begins so the progress screen can advance. */
  onStep?: (step: SaveStep) => void;
}

interface SaveTranscriptResponse {
  success: boolean;
  visitId: number;
  message: string;
  transcriptLength: number;
}

interface ProcessAudioResponse {
  success: boolean;
  visitId: number;
  message: string;
  processingStatus: string;
  estimatedTime: string;
}

export interface BackgroundSaveResult {
  visitId: number;
  processingStatus: string;
}

/**
 * Production-ready save that hands off to the server's Inngest pipeline:
 *   1. POST /api/save-transcript → creates the visit row immediately (status: pending)
 *   2. Upload audio to S3 (best-effort, non-blocking for the visit row)
 *   3. POST /api/process-audio-background → triggers Inngest SOAP generation
 *
 * If the app is killed after step 1, the visit + transcript are already persisted.
 * If killed after step 3, server completes SOAP generation in the background.
 */
export function useBackgroundSave() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<BackgroundSaveResult, Error, BackgroundSaveInput>({
    mutationFn: async ({ patientId, patientName, doctorId, transcript, language, templateId, specialty, audioUri, onVisitCreated, onStep }) => {
      // Step 1: Save transcript immediately — this creates a visit row in DB.
      // Even if everything else fails, the transcript is preserved.
      onStep?.('saving');
      const saved = await api<SaveTranscriptResponse>('/api/save-transcript', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          doctorId,
          transcript,
          language,
        }),
      });

      const visitId = saved.visitId;

      // Register the processing visit the moment the row exists — from inside the
      // mutation (a global store + a promise that keeps running) so it shows on the
      // homepage instantly and survives the user dismissing the note screen mid-save,
      // even before the (slow) audio upload below finishes.
      useProcessingStore.getState().add({ visitId, patientName, patientId });
      // Surface the id NOW so the note screen starts polling real progress during
      // the upload + processing, instead of showing a frozen 5%.
      onVisitCreated?.(visitId);

      // Step 2: Upload audio to S3 (best-effort — never blocks processing).
      let audioFileUrl: string | null = null;
      if (audioUri) {
        onStep?.('uploading');
        audioFileUrl = await uploadAudioFile(api, audioUri, patientId);
      }

      // Step 3: Kick off background processing (Inngest pipeline).
      // Server handles SOAP generation, summary, ICD-10 coding even if app closes.
      onStep?.('processing');
      const processed = await api<ProcessAudioResponse>('/api/process-audio-background', {
        method: 'POST',
        body: JSON.stringify({
          visitId,
          patientId,
          doctorId,
          audioFileUrl: audioFileUrl || `mobile-recording-${visitId}`,
          language,
          templateId,
          specialty,
          preTranscribedText: transcript,
          translateToEnglish: language !== 'en',
        }),
      });

      // Invalidate from inside the mutation (not onSuccess) so the homepage's
      // patients / Recent Visits list refreshes even if the note screen was
      // dismissed before the mutation settled (observer callbacks wouldn't fire).
      queryClient.invalidateQueries({ queryKey: ['patient-visits', String(patientId)] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      return {
        visitId: processed.visitId,
        processingStatus: processed.processingStatus,
      };
    },
  });
}
