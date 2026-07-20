import { View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';

/**
 * Standard screen shell: safe-area + background + horizontal padding.
 * `edges` defaults to ['top'] for screens with NO native header (tab screens). For screens
 * pushed WITH a native header, pass `edges={[]}` — the header already covers the top inset,
 * so applying it again leaves a large gap.
 */
export function Screen({
  className,
  edges = ['top'],
  children,
  ...props
}: ViewProps & { className?: string; edges?: readonly Edge[] }) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={edges}>
      <View className={cn('flex-1 px-4 pt-4', className)} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
}
