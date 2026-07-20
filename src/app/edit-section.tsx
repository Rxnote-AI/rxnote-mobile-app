import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { rx } from '@/theme/rx';

const SECTION_COLORS: Record<string, string> = {
  S: '#f87171',
  O: '#60a5fa',
  A: '#facc15',
  P: '#4ade80',
};

export default function EditSectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    sectionTitle?: string;
    sectionLetter?: string;
    subLabel?: string;
    content?: string;
    sectionIndex?: string;
    subIndex?: string;
  }>();

  const title = params.sectionTitle || 'Edit';
  const letter = params.sectionLetter || '·';
  const subLabel = params.subLabel || '';
  const initialContent = params.content || '';
  const sectionIndex = params.sectionIndex || '0';
  const subIndex = params.subIndex || '0';
  const color = SECTION_COLORS[letter] ?? rx.accent;

  const [text, setText] = useState(initialContent);

  const handleSave = () => {
    const g = globalThis as any;
    if (g.__soapEditCallback) {
      g.__soapEditCallback(sectionIndex, subIndex, text);
    }
    router.back();
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Header */}
      <View className="border-b border-rx-line">
        <View className="flex-row items-center gap-2 px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            className="h-[36px] w-[36px] items-center justify-center rounded-full bg-rx-hairline active:opacity-70"
          >
            <Ionicons name="close" size={20} color={rx.ink} />
          </Pressable>

          {/* Section (letter + title) — centered between the buttons; shrinks + truncates so a long title never crowds Save */}
          <View className="min-w-0 flex-1 flex-row items-center justify-center gap-2">
            <View
              className="h-[24px] w-[24px] items-center justify-center rounded-[8px]"
              style={{ backgroundColor: color }}
            >
              <Text weight="extrabold" className="text-[12px] text-white">
                {letter}
              </Text>
            </View>
            <Text weight="extrabold" numberOfLines={1} className="shrink text-[15px] text-rx-ink">
              {title}
            </Text>
          </View>

          <Pressable
            onPress={handleSave}
            className="h-[36px] w-[36px] items-center justify-center rounded-full bg-rx-accent active:opacity-80"
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Subsection on its own line so it can't overlap the toolbar buttons */}
        {subLabel ? (
          <Text
            weight="semibold"
            numberOfLines={1}
            className="px-4 pb-2.5 text-center text-[12px] text-rx-muted"
          >
            {subLabel}
          </Text>
        ) : null}
      </View>

      {/* Rich text editor */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type here..."
          placeholderTextColor="#B7B7B2"
          multiline
          autoFocus
          textAlignVertical="top"
          style={{
            flex: 1,
            padding: 20,
            fontSize: 16,
            lineHeight: 24,
            backgroundColor: '#FFFFFF',
            fontFamily: 'PlusJakartaSans',
            color: rx.ink,
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
