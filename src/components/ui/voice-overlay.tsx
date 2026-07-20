import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { rx } from '@/theme/rx';

interface Props {
  visible: boolean;
  listening: boolean;
  text: string;
  error: string | null;
  onCancel: () => void;
  onDone: () => void;
}

/** Full-screen "voice mode": speak and watch the live transcript build up. */
export function VoiceOverlay({ visible, listening, text, error, onCancel, onDone }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || !listening) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, listening, pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView className="flex-1 bg-rx-bg">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Pressable
            onPress={onCancel}
            className="h-10 w-10 items-center justify-center rounded-full border border-rx-line bg-rx-surface active:opacity-80"
          >
            <Ionicons name="close" size={20} color={rx.ink} />
          </Pressable>
          <Text weight="extrabold" className="text-[16px] text-rx-ink">
            Voice mode
          </Text>
          <View className="h-10 w-10" />
        </View>

        {/* Live transcript */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 28, paddingVertical: 24, flexGrow: 1, justifyContent: 'center' }}
        >
          {error ? (
            <Text weight="semibold" className="text-center text-[15px] leading-6 text-rx-accent">
              {error}
            </Text>
          ) : text ? (
            <Text weight="semibold" className="text-center text-[21px] leading-[30px] text-rx-ink">
              {text}
            </Text>
          ) : (
            <Text weight="medium" className="text-center text-[16px] text-rx-muted">
              {listening ? 'Listening… start speaking' : 'Starting…'}
            </Text>
          )}
        </ScrollView>

        {/* Mic + controls */}
        <View className="items-center pb-4 pt-2">
          <View className="mb-6 h-[92px] w-[92px] items-center justify-center">
            <Animated.View
              className="absolute h-[92px] w-[92px] rounded-full bg-rx-accent"
              style={{ transform: [{ scale: ringScale }], opacity: ringOpacity }}
            />
            <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-rx-accent">
              <Ionicons name="mic" size={30} color="#fff" />
            </View>
          </View>

          <View className="w-full flex-row items-center justify-center gap-3 px-6">
            <Pressable
              onPress={onCancel}
              className="h-12 flex-1 items-center justify-center rounded-full border border-rx-line bg-rx-surface active:opacity-80"
            >
              <Text weight="bold" className="text-[14px] text-rx-ink">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={onDone}
              className="h-12 flex-[1.4] flex-row items-center justify-center gap-2 rounded-full bg-rx-accent active:opacity-90"
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text weight="extrabold" className="text-[14px] text-white">
                Use text
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
