import '@/global.css';

import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { env } from '@/lib/env';
import { queryClient } from '@/lib/query-client';
import { ToastProvider } from '@/components/ui/toast';
import { rx } from '@/theme/rx';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Expo Router convention: exporting `ErrorBoundary` from the root layout catches any
 * render error in the whole app tree instead of a white-screen crash. Deliberately
 * built from bare RN primitives + inline styles (no NativeWind classes, no custom
 * themed components, no custom fonts) — if the crash originated in the styling/theme
 * layer itself, the fallback must not depend on any of it to render.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F5F3' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', textAlign: 'center', color: '#17181A' }}>
            Something went wrong
          </Text>
          <Text style={{ marginTop: 8, fontSize: 13.5, textAlign: 'center', color: '#8A8D94', lineHeight: 19 }}>
            {__DEV__ ? error.message : 'Your data is safe. Tap below to try again.'}
          </Text>
          <Pressable
            onPress={retry}
            style={{
              marginTop: 24,
              height: 48,
              paddingHorizontal: 28,
              borderRadius: 24,
              backgroundColor: '#E5322D',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans: PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
    'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
    SpaceMono: SpaceMono_400Regular,
    'SpaceMono-Bold': SpaceMono_700Bold,
  });

  // Paint the app window white so the area behind the (translucent, edge-to-edge)
  // Android navigation bar matches the white tab bar instead of showing grey.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#FFFFFF').catch(() => {});
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <ToastProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: rx.bg },
              }}
            >
              <Stack.Screen name="patient/[id]" />
              <Stack.Screen name="patients" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="new-scribe" />
              <Stack.Screen name="scribe-session" />
              <Stack.Screen name="note" />
              <Stack.Screen name="patient/record-session" />
              <Stack.Screen name="patient/visit/[id]" />
              <Stack.Screen name="patient/care-journey/[id]" />
              <Stack.Screen name="patient/care-journey/record" />
              <Stack.Screen name="patient/profiles" />
              <Stack.Screen name="patient/profiles/new" />
              <Stack.Screen name="patient/appointment/new" />
              <Stack.Screen name="patient/appointment/[id]" />
              <Stack.Screen name="patient/document/[id]" />
              <Stack.Screen name="patient/profiles/relation" />
              <Stack.Screen name="patient/visit-added" />
              <Stack.Screen name="patient/provider/new" />
            </Stack>
            </ToastProvider>
            <StatusBar style="dark" />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
