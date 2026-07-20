# RxNote Mobile — Session Handoff

Context dump so a new session can continue the Expo mobile app work without re-discovering everything.

## What this is
- **RxNote** mobile app (Expo SDK 57 · React 19 · RN 0.86 · Expo Router · TypeScript · NativeWind v4 · Clerk · TanStack Query). Lives in `apps/mobile/`, **isolated** from the web app (own `node_modules` + `package-lock.json`, npm). The web (Next.js) is at repo root; **no web code imports from `apps/mobile`**.
- UI was redesigned to the **"RxScribe Mobile"** design imported from claude.ai/design (project `f5d838c9-b356-4bc0-b158-e763ccdd81fe`, file `RxScribe Mobile.dc.html`) via the DesignSync MCP (`/design-login`).
- App is pointed at **production** (`https://rxnote.ai`) and runs on a real Android device (Pixel 6, serial `26151FDF6005TG`).

## Design system
- Tokens: `src/theme/rx.ts` + Tailwind `rx-*` colors (`tailwind.config.js`) + `src/global.css`. Warm off-white `#F6F5F3`, coral accent `#E5322D`, ink `#17181A`, borders `#ECEBE7`, success `#1F9D57`. Light-only.
- Fonts: Plus Jakarta Sans (per-weight) + Space Mono, loaded in `src/app/_layout.tsx`.
- Primitives in `src/components/ui/`: `text`, `card`, `avatar`, `chip`, `button`, `controls` (AccentButton, RoundIconButton, Segmented, Toggle, Badge), `waveform`, `soap-card`.

## Screens (clinician group only; `(patient)` group untouched)
- **Home** (`src/app/(clinician)/index.tsx`): greeting + **notification bell** (top-right), "Start a new visit" CTA, **2 stat cards** = `patients` (total, tappable → Patients browser) + `Xh saved this week` (this-week visits × 1h), **Recent Visits (Last 7 days)** list + "See all". All from a single `usePatients()` call (no N+1).
- **Patients browser** (`src/app/patients.tsx`): search (debounced + client filter) + **paginated 20-at-a-time** infinite list (`usePatientsInfinite`), header count right-aligned ("N total"), rows → patient detail.
- **New Visit** (`src/app/new-scribe.tsx`): segmented Existing/New, real patient search (shares `useDebouncedValue` + `filterPatients`), new-patient form, language + template chips, sticky Start CTA.
- **Recording** (`src/app/scribe-session.tsx`): 40% top (patient/timer/waveform) / 60% live transcript; pause/resume; line-by-line fade-in transcript; Stop → Note.
- **Note** (`src/app/note.tsx`): generating spinner → SOAP sections + source transcript; saves the visit.
- **Patient detail** (`src/app/patient/[id].tsx`): header + New visit; tabs Note/Transcript/History; history lists real visits (tap → open that visit); JSON notes rendered via `soap-to-sections.ts` (`parseStoredNote`/`noteSummary`/`plainText`).
- **Chat** (`src/app/(clinician)/chat.tsx`): local canned replies (no mobile agent endpoint yet).
- **Settings** (`src/app/(clinician)/settings.tsx`): real Clerk profile + sign out; AUTOMATION section removed.
- **Auth** (`src/app/(auth)/sign-in.tsx`, `sign-up.tsx`): RxNote-styled; sign-up has separate First/Last name + email-code verification; top-aligned + `behavior="padding"` so keyboard doesn't cover fields.

## Data / real integrations
- `src/features/patients/` — `usePatients` (list+search), `usePatientsInfinite` (20/page), `usePatientVisits`, `useCreatePatient`, types.
- `src/features/scribe/` — `use-scribe-transcription` (Soniox live STT + audio capture), `use-generate-note` (SOAP + save visit), `upload-audio` (presigned S3), `soap-to-sections`, `sample-note`.
- API base `https://rxnote.ai`; client (`src/lib/api-client.ts`) prefixes `/en` for `/api/*` and attaches the Clerk JWT as Bearer.

## Recording + save flow (matches web storage)
- Live STT via Soniox WebSocket, PCM from `@fugood/react-native-audio-pcm-stream`.
- **Pause/resume** = gate `recordingRef` (keep socket+mic alive); do NOT stop/start the native stream (that repeated re-init was the crash). Long-pause socket drop → resume reopens.
- **Audio file**: the pcm-stream lib's `wavFile` is a no-op, so PCM chunks are accumulated (capped ~25 min), assembled into a WAV on stop (`expo-file-system/legacy`), returned from `stop()`.
- **On Stop**: audio uploaded via presigned S3 (`POST /api/storage/presigned-upload` → PUT `uploadUrl` via `FileSystem.uploadAsync` → `key`), then visit created (`POST /api/visits`) with `transcriptionText`, `soapNote`/`soapNoteJson`, and `audioFileUrl: key`. Audio upload is best-effort (never blocks note save).
- Web equivalent (for reference): `save-transcript` (create) → `process-audio-background` (Inngest) with `preTranscribedText`. Mobile uses the simpler generate-soap + single visit POST; same DB columns.

## Run commands (see `scripts/set-env.js`, `package.json`)
- `npm run android:prod` / `ios:prod` — set prod `.env` + native build/launch.
- `npm run start:prod` — set prod `.env` + Metro (`--clear`); reload an installed dev build.
- `npm run env:prod` / `env:local` — flip `.env` only. `EXPO_PUBLIC_*` inline at bundle time → restart Metro after switching.
- Target device: `ANDROID_SERIAL=<serial> npx expo run:android` (the `--device` flag wants a *name*, not the adb serial).
- Reload installed build over adb: `adb shell am force-stop com.medicalrxnote.mobile` then `adb shell monkey -p com.medicalrxnote.mobile -c android.intent.category.LAUNCHER 1`.

## Gotchas
- **Clerk (prod, clerk.rxnote.ai)**: mobile sign-in needs **Native applications enabled** in the Clerk dashboard. Google SSO needs redirect `rxnote://sso-callback` allowlisted there. (Both done by the user.) Prod publishable key `pk_live_Y2xlcmsucnhub3RlLmFpJA` (public).
- **Android nav bar** white/dark-icons fix lives in native `android/app/src/main/res/values/styles.xml` (`windowLightNavigationBar=true`, `enforceNavigationBarContrast=false`). `app.json` `androidNavigationBar` does NOT emit the contrast flag, so `expo prebuild --clean` re-introduces the grey scrim — re-apply that styles.xml edit after any prebuild. App name in `strings.xml` `app_name`=RxNote.
- **iOS simulator build blocked**: upstream Expo SDK 57 `expo-modules-jsi` `weak let` Swift error. JS bundles fine; only the native iOS build fails. Android works.
- **tsc noise**: `npx tsc --noEmit` shows 3 pre-existing `*.css` / `animated-icon.module.css` module-declaration warnings (also hit untouched files) — ignore those; everything else is clean.
- **Audio cap ~25 min** (in-memory PCM bound); longer visits keep transcribing but audio truncates.
- **Backend note**: a `totalNotes` count was added then **reverted** in `app/[locale]/api/patients/route.ts` — it's back to original; nothing to deploy.

## Open items / to test on device
- Recording end-to-end (needs speaking): pause→resume→pause (no crash), Stop → note saved, and confirm the visit has **audio** attached (`audioFileUrl`).
- Optional: switch mobile to the web's exact Inngest pipeline (`save-transcript` → `process-audio-background`) for server-side background processing.
- Optional: extract a shared `PatientRow` component (New Visit uses select rows; Home/Patients use navigate rows — search/filter/debounce already shared).
- Chat is local-only until a mobile agent endpoint exists.

## Memory files (auto-load each session)
`~/.claude/projects/.../memory/`: `rxscribe-mobile-design.md`, `mobile-prod-run.md`, `mobile-recording-flow.md`, `mobile-app-plan.md`, `api-native-bearer-auth.md`.
