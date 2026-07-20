import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { rx } from '@/theme/rx';

const BASE = [22, 40, 58, 30, 70, 44, 80, 36, 60, 26, 50, 74, 34, 64];
const COUNT = 34;

function Bar({
  height,
  duration,
  delay,
  opacity,
  active,
}: {
  height: number;
  duration: number;
  delay: number;
  opacity: number;
  active: boolean;
}) {
  // Uses the RN Animated API (native driver) — no Reanimated/babel plugin needed.
  const scale = useRef(new Animated.Value(0.28)).current;

  useEffect(() => {
    if (!active) {
      Animated.timing(scale, { toValue: 0.28, duration: 250, useNativeDriver: true }).start();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.28,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, delay, duration, scale]);

  return (
    <Animated.View
      style={{
        width: 3.5,
        height,
        borderRadius: 4,
        backgroundColor: rx.accent,
        opacity,
        transform: [{ scaleY: scale }],
      }}
    />
  );
}

/** Coral waveform — 34 bars pulsing while recording, collapsed when paused. */
export function Waveform({ active = true }: { active?: boolean }) {
  const bars = Array.from({ length: COUNT }).map((_, i) => ({
    height: BASE[i % BASE.length] * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.7))),
    duration: 700 + (i % 5) * 130,
    delay: (i % 7) * 90,
    opacity: 0.45 + 0.55 * Math.abs(Math.cos(i)),
  }));

  return (
    <View className="mb-1.5 h-[88px] w-full flex-row items-center justify-center gap-[3px]">
      {bars.map((b, i) => (
        <Bar key={i} {...b} active={active} />
      ))}
    </View>
  );
}
