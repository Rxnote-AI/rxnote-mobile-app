import type { Patient } from '@/features/patients/types';

/**
 * Word-aware, case-insensitive patient filter — mirrors the server's ILIKE search
 * (every term must match at least one of name / MRN / phone / email). Used for
 * instant client-side feedback while the debounced server query catches up.
 */
export function filterPatients(patients: Patient[], query: string): Patient[] {
  const q = query.trim().toLowerCase();
  if (!q) return patients;
  const terms = q.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return patients.filter((p) => {
    const haystack = [p.name, p.medicalRecordNumber, p.phone, p.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}
