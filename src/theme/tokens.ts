/**
 * MedicalRxNote — Mobile Design Tokens (single source of truth)
 *
 * These MIRROR the web app's `app/globals.css` exactly so mobile and web share one
 * visual language. See docs/MOBILE_APP_PLAN.md §6 + Appendix A.
 *
 * Values are stored as HSL triplets (matching web's CSS custom properties) AND as
 * resolved hex, so:
 *   - `cssVars`  → injected into NativeWind `global.css` (Tailwind reads hsl(var(--x)))
 *   - `palette`  → for React Native code that needs a concrete color string
 *
 * TODO (monorepo migration): extract this file to `packages/design-tokens` and have
 * BOTH the web Tailwind config and mobile NativeWind config import it.
 */

/** Raw HSL triplets — identical to web `globals.css` (`:root` = light, `.dark` = dark). */
export const hslTokens = {
  light: {
    background: '0 0% 100%',
    foreground: '222.2 84% 4.9%',
    card: '0 0% 100%',
    'card-foreground': '222.2 84% 4.9%',
    primary: '0 91% 71%', // Rose #f87171
    'primary-foreground': '0 0% 100%',
    secondary: '210 40% 96.1%',
    'secondary-foreground': '222.2 47.4% 11.2%',
    muted: '210 40% 96.1%',
    'muted-foreground': '215.4 16.3% 46.9%',
    accent: '210 40% 96.1%',
    'accent-foreground': '222.2 47.4% 11.2%',
    border: '214.3 31.8% 91.4%',
    input: '214.3 31.8% 91.4%',
    ring: '0 91% 71%',
  },
  dark: {
    background: '222.2 84% 4.9%',
    foreground: '210 40% 98%',
    card: '222.2 84% 4.9%',
    'card-foreground': '210 40% 98%',
    primary: '0 91% 71%',
    'primary-foreground': '0 0% 100%',
    secondary: '217.2 32.6% 17.5%',
    'secondary-foreground': '210 40% 98%',
    muted: '217.2 32.6% 17.5%',
    'muted-foreground': '215 20.2% 65.1%',
    accent: '217.2 32.6% 17.5%',
    'accent-foreground': '210 40% 98%',
    border: '217.2 32.6% 17.5%',
    input: '217.2 32.6% 17.5%',
    ring: '0 91% 71%',
  },
} as const;

/**
 * Resolved hex — for RN APIs that want a plain color string (StatusBar, gradients, etc.).
 *
 * NOTE: Updated to the "RxScribe Mobile" design language (warm off-white + coral accent).
 * The design is light-only, so `dark` mirrors `light`. New screens should prefer the richer
 * `rx` token set in `theme/rx.ts`; this map is kept for backwards-compatible imports.
 */
const rxScribe = {
  background: '#F6F5F3',
  foreground: '#17181A',
  card: '#FFFFFF',
  primary: '#E5322D', // Coral accent
  primaryForeground: '#FFFFFF',
  secondary: '#F2F1ED',
  muted: '#F2F1ED',
  mutedForeground: '#8A8D94',
  accent: '#E5322D',
  border: '#ECEBE7',
  ring: '#E5322D',
} as const;

export const palette = {
  light: rxScribe,
  dark: rxScribe,
} as const;

/** Border radius — web uses `--radius: 0.5rem` (8px). */
export const radius = {
  sm: 4, // calc(radius - 4px)
  md: 6, // calc(radius - 2px)
  lg: 8, // radius
  full: 9999,
} as const;

/** Font families. Loaded via expo-font (see theme/fonts.ts). Falls back to system. */
export const fonts = {
  sans: 'PlusJakartaSans', // body
  serif: 'Fraunces', // serif accents
} as const;

export type ColorScheme = keyof typeof palette;
export type ColorName = keyof typeof palette.light;
