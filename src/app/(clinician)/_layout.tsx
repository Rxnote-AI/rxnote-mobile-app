import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { rx } from '@/theme/rx';

type IconBase = 'home' | 'chatbubble' | 'settings';

function TabIcon({ base, color, focused }: { base: IconBase; color: string; focused: boolean }) {
  const name = (focused ? base : `${base}-outline`) as keyof typeof Ionicons.glyphMap;
  return <Ionicons name={name} size={24} color={color} />;
}

export default function ClinicianLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  // Add the device's bottom inset (Android gesture nav / iOS home indicator) on top of
  // the visual bar height so labels are never clipped by the system navigation.
  const barHeight = 62 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: rx.accent,
        tabBarInactiveTintColor: rx.tabInactive,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: rx.bg },
        tabBarStyle: {
          // Solid white so the bottom inset area (drawn behind the translucent Android
          // nav bar under edge-to-edge) reads as one clean white surface, not grey.
          backgroundColor: '#FFFFFF',
          borderTopColor: '#EEEDE9',
          borderTopWidth: 1,
          height: barHeight,
          paddingTop: 10,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans-Bold',
          fontSize: 10.5,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon base="home" color={color as string} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon base="chatbubble" color={color as string} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon base="settings" color={color as string} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
