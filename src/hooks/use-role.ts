import { useUser } from '@clerk/clerk-expo';

export type AppRole = 'clinician' | 'patient';

/**
 * Resolves the app persona.
 *
 * In the existing product, every user is a clinician — roles are Clerk **org roles**
 * (`org:doctor`, `org:nurse`, `org:admin`, …); there is no "patient" role. "Patient" is a
 * NEW mobile-only persona, so we default to `clinician` and only treat an account as a
 * patient when it is explicitly flagged via metadata (`role: 'patient'`). When patient
 * sign-up is built, stamp that flag (or use a separate Clerk instance).
 */
export function useRole(): { role: AppRole | null; isLoaded: boolean } {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return { role: null, isLoaded: false };

  const flag = (user?.publicMetadata?.role ?? user?.unsafeMetadata?.role) as
    | string
    | undefined;
  const role: AppRole = flag === 'patient' ? 'patient' : 'clinician';
  return { role, isLoaded: true };
}
