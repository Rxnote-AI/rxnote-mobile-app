/**
 * Public runtime config. EXPO_PUBLIC_* vars are inlined at build time by Expo.
 * Set these in apps/mobile/.env (see .env.example). Never put secrets here —
 * only publishable/public values.
 */
export const env = {
  /** Clerk publishable key (same Clerk instance as web). */
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
  /** Base URL of the existing Next.js backend, e.g. https://app.medicalrxnote.com */
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
} as const;

if (__DEV__ && !env.clerkPublishableKey) {
  console.warn(
    '[env] EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set — sign-in will fail. See apps/mobile/.env.example',
  );
}
