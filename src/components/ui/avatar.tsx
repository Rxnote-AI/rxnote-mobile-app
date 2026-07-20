import { View } from 'react-native';

import { cn } from '@/lib/cn';
import { Text } from './text';

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '');
  return letters.join('') || '?';
}

type Variant = 'tint' | 'dark';

/**
 * Initials avatar.
 * - `tint` (default): rounded-square, accent-tinted (patient/list rows).
 * - `dark`: near-black circle with white initials (the clinician's own avatar).
 * Pass `initials` to override the computed value, and size/shape via `className`.
 */
export function Avatar({
  name,
  initials,
  variant = 'tint',
  className,
  textClassName,
}: {
  name?: string;
  initials?: string;
  variant?: Variant;
  className?: string;
  textClassName?: string;
}) {
  const label = initials ?? initialsOf(name ?? '?');
  const dark = variant === 'dark';
  return (
    <View
      className={cn(
        'items-center justify-center',
        dark ? 'h-11 w-11 rounded-full bg-rx-ink' : 'h-10 w-10 rounded-[12px] bg-rx-accent-tint',
        className,
      )}
    >
      <Text
        weight="bold"
        className={cn(dark ? 'text-white' : 'text-rx-accent', 'text-[13px]', textClassName)}
      >
        {label}
      </Text>
    </View>
  );
}
