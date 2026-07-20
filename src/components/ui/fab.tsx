import type { ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';

import { cn } from '@/lib/cn';

/** Floating action button — brand primary, bottom-right, elevated. */
export function Fab({
  icon,
  className,
  ...props
}: PressableProps & { icon: ReactNode; className?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      className={cn(
        'absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary active:opacity-90',
        className,
      )}
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
      {...props}
    >
      {icon}
    </Pressable>
  );
}
