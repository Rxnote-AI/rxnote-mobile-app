import { Text as RNText, type TextProps } from 'react-native';

import { cn } from '@/lib/cn';

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

/** Plus Jakarta Sans weight → font-family class (see tailwind.config.js). */
export const WEIGHT_CLASS: Record<FontWeight, string> = {
  regular: 'font-sans',
  medium: 'font-sans-medium',
  semibold: 'font-sans-semibold',
  bold: 'font-sans-bold',
  extrabold: 'font-sans-extrabold',
};

type Variant = 'title' | 'heading' | 'body' | 'muted' | 'label';

/** Legacy semantic variants (kept so feature components keep working), RxScribe-styled. */
const VARIANTS: Record<Variant, string> = {
  title: 'text-2xl font-sans-extrabold text-rx-ink tracking-tight',
  heading: 'text-lg font-sans-bold text-rx-ink',
  body: 'text-[15px] font-sans text-rx-ink',
  muted: 'text-[13px] font-sans-medium text-rx-muted',
  label: 'text-[11px] font-sans-extrabold tracking-wide text-rx-label',
};

/**
 * Text primitive. Always applies a Plus Jakarta Sans family so nothing falls back
 * to the system font. Pass `weight` for a quick weight, or override anything via
 * `className` (merged last, so it wins).
 */
export function Text({
  variant,
  weight,
  className,
  ...props
}: TextProps & { variant?: Variant; weight?: FontWeight; className?: string }) {
  return (
    <RNText
      className={cn(
        variant ? VARIANTS[variant] : 'text-[15px] text-rx-ink',
        weight ? WEIGHT_CLASS[weight] : !variant && 'font-sans',
        className,
      )}
      {...props}
    />
  );
}
