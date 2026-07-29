/** Mirrors the web `careJourneys` table (see MedicalRxNote/shared/schema.ts). */
export const careTypes = ['general', 'medication', 'vitals', 'procedure', 'observation'] as const;
export type CareType = (typeof careTypes)[number];

/** Shape returned by GET /api/care-journeys?patientId=. */
export interface CareJourneyEntry {
  id: number;
  patientId: number;
  visitId: number | null;
  doctorId: number;
  recordedBy: string;
  transcriptionText: string | null;
  transcriptionMetadata: unknown;
  audioFileUrl: string | null;
  language: string | null;
  summary: string | null;
  careType: CareType | string;
  recordedAt: string | null;
  createdAt: string | null;
}

export interface CreateCareJourneyInput {
  patientId: number;
  visitId?: number | null;
  recordedBy: string;
  transcriptionText: string;
  careType: CareType | string;
  language?: string;
}

/** Fields the PATCH endpoint accepts — transcript stays untouched, only the AI summary is editable. */
export interface UpdateCareJourneyInput {
  summary?: string;
  careType?: CareType | string;
  recordedBy?: string;
}
