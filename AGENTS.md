# MedicalRxNote Mobile — Agent Guide

Expo SDK 57 · React 19 · RN 0.86 · Expo Router · TypeScript · NativeWind v4 · Clerk.

**Read the full plan + resume checklist first:** `../../docs/MOBILE_APP_PLAN.md`.
For SDK APIs, use the versioned docs: https://docs.expo.dev/versions/v57.0.0/ (or the Expo MCP).

## Rules
- **English-only.** No i18n / next-intl / Soniox language hints or translation here.
- **Soniox is the only STT provider.**
- **Isolated from web:** this app has its own `node_modules` + `package-lock.json` (npm).
  Do NOT add it to the root pnpm workspace or touch root `package.json` — that would risk the
  production web build. The unified-workspace migration is a separate, flagged step (Phase 1).
- **Design tokens:** `src/theme/tokens.ts` is the source of truth; it mirrors web `app/globals.css`.
  Style via NativeWind classes (`bg-primary`, `text-foreground`, …), not inline color literals.
- **Reusable primitives** live in `src/components/ui/`. Logic in `src/hooks/`, not screens.

## Layout
- `src/app/` — Expo Router routes: `(auth)`, `(clinician)`, `(patient)` groups; `index.tsx` gates by auth+role.
- `src/lib/` — `env`, `token-cache` (SecureStore), `api-client` (`useApiClient`), `query-client`, `cn`.
- `src/components/ui/` — Button, Card, Text, Screen.

## Commands
```bash
cp .env.example .env       # set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY + EXPO_PUBLIC_API_BASE_URL
npx expo start             # dev server (dev client required once native audio is added)
npx tsc --noEmit           # typecheck
npx expo-doctor            # config/dependency health
npx expo export --platform ios --output-dir /tmp/x   # verify the app bundles
```
