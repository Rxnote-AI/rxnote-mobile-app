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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { env } from '@/lib/env';
import { queryClient } from '@/lib/query-client';
import { ToastProvider } from '@/components/ui/toast';
import { rx } from '@/theme/rx';

SplashScreen.preventAutoHideAsync().catch(() => {});

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
              <Stack.Screen name="new-scribe" />
              <Stack.Screen name="scribe-session" />
              <Stack.Screen name="note" />
              <Stack.Screen name="patient/record-session" />
              <Stack.Screen name="patient/visit/[id]" />
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
