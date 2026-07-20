import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';

/**
 * White surface with a hairline border. RxScribe uses a 18–20px radius on most
 * cards — override radius/padding via `className` when a screen needs an exact value.
 */
export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn('rounded-[18px] border border-rx-line bg-rx-surface p-4', className)}
      {...props}
    />
  );
}
