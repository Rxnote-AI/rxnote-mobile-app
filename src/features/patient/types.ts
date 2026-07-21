export interface PatientAccount {
  id: number;
  clerkUserId: string;
  userId: number;
  linkedPatientId: number | null;
  displayName: string;
  phone: string | null;
  email: string;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  linkStatus: 'unlinked' | 'linked' | 'pending';
  isOnboarded: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PatientProfileType = 'self' | 'spouse' | 'child' | 'parent' | 'sibling' | 'pet' | 'other';

export interface PatientProfile {
  id: number;
  accountId: number;
  linkedPatientId: number | null;
  profileType: PatientProfileType;
  name: string;
  relationship: string | null;
  dateOfBirth: string | null;
  sex: string | null;
  species: string | null;
  avatarUrl: string | null;
  allergies: string | null;
  medications: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PatientVisitSummary {
  title: string;
  keyPoints: string[];
  diagnoses: string[];
  nextSteps: string[];
  medications: Array<{ name: string; dosage?: string; instructions?: string }>;
  followUpDate?: string;
  questionsToAsk?: string[];
}

export type PatientVisitStatus = 'recording' | 'processing' | 'completed' | 'failed';

export interface PatientVisit {
  id: number;
  accountId: number;
  profileId: number;
  transcriptionText: string | null;
  audioFileUrl: string | null;
  language: string;
  summary: PatientVisitSummary | null;
  status: PatientVisitStatus;
  errorMessage: string | null;
  visitDate: string;
  doctorName: string | null;
  doctorSpecialty: string | null;
  clinicName: string | null;
  visitReason: string | null;
  sharedWithDoctor: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PatientAppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export interface PatientAppointment {
  id: number;
  accountId: number;
  profileId: number;
  title: string;
  doctorName: string | null;
  clinicName: string | null;
  clinicAddress: string | null;
  scheduledAt: string;
  durationMinutes: number | null;
  purpose: string | null;
  questionsToAsk: string[] | null;
  documentsToCarry: string[] | null;
  status: PatientAppointmentStatus;
  patientVisitId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PatientDocumentType =
  | 'lab_result'
  | 'prescription'
  | 'imaging'
  | 'discharge_summary'
  | 'insurance'
  | 'receipt'
  | 'photo'
  | 'other';

export type PatientDocumentStatus = 'pending_upload' | 'pending' | 'parsing' | 'analysed' | 'failed';

export interface PatientOwnedDocument {
  id: number;
  accountId: number;
  profileId: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  documentType: PatientDocumentType;
  title: string | null;
  documentDate: string | null;
  status: PatientDocumentStatus;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}
