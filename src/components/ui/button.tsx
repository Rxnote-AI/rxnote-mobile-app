import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import { cn } from '@/lib/cn';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-rx-accent active:opacity-90',
  secondary: 'bg-rx-subtle active:opacity-90',
  outline: 'border border-rx-line bg-rx-surface active:opacity-80',
  ghost: 'bg-transparent active:opacity-70',
};

const LABEL: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-rx-ink',
  outline: 'text-rx-ink',
  ghost: 'text-rx-accent',
};

const SIZE: Record<Size, string> = {
  sm: 'h-10 px-4 rounded-[13px]',
  md: 'h-[52px] px-5 rounded-[16px]',
  lg: 'h-[54px] px-6 rounded-[27px]',
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className,
  ...props
}: PressableProps & {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center',
        CONTAINER[variant],
        SIZE[size],
        isDisabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : '#E5322D'} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text weight="bold" className={cn('text-[15px]', LABEL[variant])}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
