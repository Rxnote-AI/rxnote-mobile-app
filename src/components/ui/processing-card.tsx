import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { rx } from '@/theme/rx';
import { Text } from './text';

export type ProcessingCardStatus =
  | 'pending'
  | 'processing'
  | 'transcribing'
  | 'generating-soap'
  | 'completed'
  | 'failed';

const LABELS: Record<ProcessingCardStatus, string> = {
  pending: 'Saving transcript…',
  processing: 'Starting…',
  transcribing: 'Processing audio…',
  'generating-soap': 'Generating note…',
  completed: 'Note ready',
  failed: 'Failed',
};

function PulsingDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[style, { width: 8, height: 8, borderRadius: 4, backgroundColor: rx.accent }]}
    />
  );
}

export function ProcessingCard({
  patientName,
  status,
  progress,
  onPress,
}: {
  patientName: string;
  status: ProcessingCardStatus;
  progress: number;
  onPress?: () => void;
}) {
  const isComplete = status === 'completed';
  const isFailed = status === 'failed';
  const isActive = !isComplete && !isFailed;

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-[16px] border px-4 py-[14px] active:opacity-80 ${
        isComplete
          ? 'border-green-200 bg-green-50'
          : isFailed
            ? 'border-red-200 bg-red-50'
            : 'border-rx-accent/20 bg-rx-accent/[0.04]'
      }`}
    >
      {isActive ? (
        <PulsingDot />
      ) : isComplete ? (
        <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
      ) : (
        <Ionicons name="alert-circle" size={18} color={rx.accent} />
      )}
      <View className="min-w-0 flex-1">
        <Text weight="bold" numberOfLines={1} className="text-[13.5px] text-rx-ink">
          {patientName}
        </Text>
        <Text weight="medium" className="text-[11.5px] text-rx-muted">
          {LABELS[status] ?? status}
        </Text>
      </View>
      {isActive ? (
        <View className="items-end">
          <Text weight="bold" className="text-[12px] text-rx-accent">
            {progress}%
          </Text>
          <View className="mt-1 h-[4px] w-[50px] overflow-hidden rounded-full bg-rx-accent/20">
            <View
              className="h-full rounded-full bg-rx-accent"
              style={{ width: `${Math.max(progress, 5)}%` }}
            />
          </View>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={14} color={rx.faint} />
      )}
    </Pressable>
  );
}
