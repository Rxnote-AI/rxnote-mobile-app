/**
 * RxScribe Mobile — design tokens.
 *
 * Source of truth for the "RxScribe Mobile" visual language imported from the
 * claude.ai/design project (see docs / design MCP). The app renders this look in
 * light only (the design has no dark variant), so screens should use these values
 * directly rather than the legacy web-mirrored tokens.
 *
 * Colors are plain hex for React Native APIs. Tailwind/NativeWind exposes the same
 * palette under the `rx-*` color names (see tailwind.config.js) — keep them in sync.
 */

export const rx = {
  /** Screen background — warm off-white. */
  bg: '#F6F5F3',
  /** Card / elevated surface. */
  surface: '#FFFFFF',
  /** Primary text — near-black. */
  ink: '#17181A',
  /** Slightly softer ink for body copy inside cards. */
  ink2: '#2A2C31',
  ink3: '#33353B',
  /** Secondary text. */
  muted: '#8A8D94',
  /** Uppercase field labels. */
  label: '#9A9CA3',
  /** Tertiary / chip text. */
  muted2: '#6B6E76',
  /** Hairline card borders. */
  line: '#ECEBE7',
  /** Slightly darker outer border (inputs). */
  line2: '#E4E3DF',
  /** Inner list separators. */
  hairline: '#F2F1ED',
  /** Subtle fill (chips, track, icon buttons). */
  subtle: '#F2F1ED',
  /** Segmented-control track. */
  segTrack: '#EDECE8',
  /** Brand accent (coral-red). */
  accent: '#E5322D',
  /** On-accent text. */
  onAccent: '#FFFFFF',
  /** Accent tint background (~12% accent on white). */
  accentTint: '#FCE7E6',
  /** Disabled accent button. */
  accentMuted: '#D9C6C4',
  /** Success (language detected / ready). */
  success: '#1F9D57',
  successBg: '#E6F5EC',
  /** Chevron / faint icon strokes. */
  faint: '#C6C6C2',
  /** Tab-bar inactive icon. */
  tabInactive: '#9A9CA3',
} as const;

/** Registered font-family names (loaded in app/_layout.tsx via expo-font). */
export const fontFamily = {
  regular: 'PlusJakartaSans',
  medium: 'PlusJakartaSans-Medium',
  semibold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extrabold: 'PlusJakartaSans-ExtraBold',
  mono: 'SpaceMono',
  monoBold: 'SpaceMono-Bold',
} as const;

/** Standard soft shadow used by the accent CTA cards/buttons. */
export function accentShadow(color: string = rx.accent) {
  return {
    shadowColor: color,
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  } as const;
}

/** Neutral card shadow (very subtle). */
export const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
} as const;

export type RxColor = keyof typeof rx;
