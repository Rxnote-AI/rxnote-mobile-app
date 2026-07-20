// Expo Router native-intent handler for incoming deep links.
//
// Clerk's OAuth flow (sign-in.tsx / sign-up.tsx) redirects back to
// `rxnote://sso-callback`. There is no screen for that path, so without this
// handler Expo Router briefly renders the "Unmatched Route" screen while the
// SSO promise resolves in-process. Rewrite the callback (and any other auth
// deep link) to the entry gate `/`, which routes by auth state + role.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  if (path.includes('sso-callback') || path.includes('oauth')) {
    return '/';
  }
  return path;
}
