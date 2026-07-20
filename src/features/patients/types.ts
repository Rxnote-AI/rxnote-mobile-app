/** Shape returned by GET /api/patients (see web app/[locale]/api/patients/route.ts). */
export interface Patient {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  dateOfBirth: string | null;
  medicalRecordNumber: string | null;
  age: number | null;
  sex: string | null;
  doctorId: number;
  organizationId: string | null;
  visibility: string;
  createdAt: string;
  createdByName: string | null;
  lastVisit: string | null;
  hasAccess: boolean;
  hasPendingRequest: boolean;
}

/** A visit / clinical note (GET /api/patients/[id]/visits returns Visit[]). */
export interface Visit {
  id: number;
  patientId: number;
  dateOfVisit: string | null;
  soapNote: string | null;
  soapNoteJson?: unknown;
  transcriptionText?: string | null;
  language?: string | null;
  templateId?: number | null;
  additionalNotes: string | null;
  processing_status: string | null;
  createdAt: string | null;
}

export interface PatientsResponse {
  patients: Patient[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}
