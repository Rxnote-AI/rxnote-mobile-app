import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, View } from 'react-native';

import { cn } from '@/lib/cn';
import { accentShadow, rx } from '@/theme/rx';
import { Text } from './text';

/** Full-width accent CTA with the coral glow shadow. Dims + disables when not ready. */
export function AccentButton({
  label,
  icon,
  iconRight,
  disabled = false,
  className,
  ...props
}: PressableProps & {
  label: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={disabled ? undefined : accentShadow()}
      className={cn(
        'h-[54px] flex-row items-center justify-center gap-[9px] rounded-[27px] px-5 active:opacity-90',
        disabled ? 'bg-rx-accent-muted' : 'bg-rx-accent',
        className,
      )}
      {...props}
    >
      {icon}
      <Text weight="bold" className="text-[15px] text-white">
        {label}
      </Text>
      {iconRight}
    </Pressable>
  );
}

/** Round white bordered icon button (back / menu / header actions). */
export function RoundIconButton({
  name,
  size = 18,
  color = rx.ink,
  className,
  ...props
}: PressableProps & {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className={cn(
        'h-[38px] w-[38px] items-center justify-center rounded-full border border-rx-line bg-rx-surface active:opacity-80',
        className,
      )}
      {...props}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

type SegmentOption = { value: string; label: string };

/** iOS-style segmented control on a warm track. */
export function Segmented({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentOption[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <View className={cn('flex-row gap-1 rounded-[15px] bg-rx-seg p-1', className)}>
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={on ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } } : undefined}
            className={cn(
              'flex-1 items-center rounded-[12px] py-[9px]',
              on ? 'bg-rx-surface' : 'bg-transparent',
            )}
          >
            <Text weight="bold" className={cn('text-[13px]', on ? 'text-rx-ink' : 'text-rx-muted')}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Custom settings toggle (track + sliding knob). */
export function Toggle({ value, onChange }: { value: boolean; onChange?: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange?.(!value)}
      className={cn(
        'h-7 w-[46px] rounded-full p-[3px]',
        value ? 'bg-rx-accent' : 'bg-[#D8D7D2]',
      )}
      style={{ alignItems: value ? 'flex-end' : 'flex-start' }}
    >
      <View
        className="h-[22px] w-[22px] rounded-full bg-white"
        style={{ shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}
      />
    </Pressable>
  );
}

/** Small rounded label badge (ICD code / note type). */
export function Badge({
  label,
  tone = 'neutral',
  className,
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'success';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-rx-hairline text-rx-muted2',
    accent: 'bg-rx-accent/[0.12] text-rx-accent',
    success: 'bg-rx-success-bg text-rx-success',
  } as const;
  const [bg, text] = tones[tone].split(' ');
  return (
    <View className={cn('rounded-lg px-[9px] py-1', bg, className)}>
      <Text weight="bold" className={cn('text-[11px]', text)}>
        {label}
      </Text>
    </View>
  );
}
