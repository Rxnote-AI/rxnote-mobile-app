import { useUser } from '@clerk/clerk-expo';

import { useActivePersonaStore, type Persona } from '@/features/persona/use-active-persona';

export type AppRole = Persona;

/**
 * Resolves which app persona to show.
 *
 * A single login can be BOTH a clinician and a patient (like Airbnb's
 * host/traveller switch) — clinician data hangs off `users.id`, patient data off
 * `patient_accounts.id`, and the two never overlap. So the persona is a *view*
 * choice, not an identity:
 *
 *   1. An explicit in-app switch wins (persisted in SecureStore).
 *   2. Otherwise fall back to the Clerk metadata role stamped at sign-up.
 *   3. Otherwise clinician — every pre-existing user is one.
 *
 * `publicMetadata` is backend-only and therefore the trustworthy flag;
 * `unsafeMetadata` is client-writable and read only as a first-launch hint
 * before the server has confirmed the patient account.
 *
 * NOTE: this is a UI router only, never access control. Data access is enforced
 * server-side — patient routes resolve via `patient_accounts.clerk_user_id`,
 * clinician routes via `getOrgScopedUser()` — so a forged client role leaks nothing.
 */
export function useRole(): {
  role: AppRole | null;
  isLoaded: boolean;
  /** True when the account has a patient side, so the switcher can be offered. */
  hasPatientAccount: boolean;
  setPersona: (persona: Persona) => void;
} {
  const { user, isLoaded } = useUser();
  const persona = useActivePersonaStore((s) => s.persona);
  const hydrated = useActivePersonaStore((s) => s.hydrated);
  const setPersona = useActivePersonaStore((s) => s.setPersona);

  const publicMeta = user?.publicMetadata as { role?: string; hasPatientAccount?: boolean } | undefined;
  const unsafeMeta = user?.unsafeMetadata as { role?: string } | undefined;
  const hasPatientAccount = publicMeta?.hasPatientAccount === true || publicMeta?.role === 'patient';

  if (!isLoaded || !hydrated) {
    return { role: null, isLoaded: false, hasPatientAccount, setPersona };
  }

  const metadataRole: AppRole =
    publicMeta?.role === 'patient' || unsafeMeta?.role === 'patient' ? 'patient' : 'clinician';

  return {
    role: persona ?? metadataRole,
    isLoaded: true,
    hasPatientAccount,
    setPersona,
  };
}
