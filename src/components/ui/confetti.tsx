import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6'];
const COUNT = 40;

function Particle({ index }: { index: number }) {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(SCREEN_W / 2);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  useEffect(() => {
    const delay = index * 30;
    const targetX = Math.random() * SCREEN_W;
    const targetY = SCREEN_H * (0.3 + Math.random() * 0.6);

    scale.value = withDelay(delay, withTiming(1, { duration: 200 }));
    translateX.value = withDelay(
      delay,
      withTiming(targetX, { duration: 1200, easing: Easing.out(Easing.cubic) }),
    );
    translateY.value = withDelay(
      delay,
      withTiming(targetY, { duration: 1400, easing: Easing.in(Easing.quad) }),
    );
    rotate.value = withDelay(
      delay,
      withTiming(360 * (Math.random() > 0.5 ? 1 : -1), { duration: 1400 }),
    );
    opacity.value = withDelay(delay + 900, withTiming(0, { duration: 500 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const color = COLORS[index % COLORS.length];
  const size = 6 + Math.random() * 6;
  const isCircle = index % 3 === 0;

  return (
    <Animated.View
      style={[
        style,
        {
          position: 'absolute',
          width: size,
          height: isCircle ? size : size * 2.5,
          backgroundColor: color,
          borderRadius: isCircle ? size / 2 : 2,
        },
      ]}
    />
  );
}

export function Confetti({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: COUNT }, (_, i) => (
        <Particle key={i} index={i} />
      ))}
    </View>
  );
}
