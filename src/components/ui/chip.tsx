import { Pressable, type PressableProps } from 'react-native';

import { cn } from '@/lib/cn';
import { Text } from './text';

/**
 * Selectable pill (visit language, note template, sex). RxScribe style: 1.5px border,
 * accent border + faint accent fill + accent text when selected.
 */
export function Chip({
  label,
  selected = false,
  className,
  ...props
}: PressableProps & { label: string; selected?: boolean; className?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        'rounded-[12px] border-[1.5px] px-[15px] py-[9px] active:opacity-80',
        selected ? 'border-rx-accent bg-rx-accent/[0.09]' : 'border-rx-line2 bg-rx-surface',
        className,
      )}
      {...props}
    >
      <Text
        weight="bold"
        className={cn('text-[13px]', selected ? 'text-rx-accent' : 'text-rx-muted2')}
      >
        {label}
      </Text>
    </Pressable>
  );
}
