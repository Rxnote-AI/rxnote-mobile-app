import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { rx } from '@/theme/rx';

// Care / Records / Ask / Profile. The design specifies three tabs, but the chat
// copilot earns its own: it's a primary surface and every alternative entry point
// (a Care header icon, a Records pill) was easy to miss. Record and Documents stay
// routable-but-hidden, reached from inside Records.
type IconBase = 'heart' | 'document-text' | 'chatbubble-ellipses' | 'person';

function TabIcon({ base, color, focused }: { base: IconBase; color: string; focused: boolean }) {
  const name = (focused ? base : `${base}-outline`) as keyof typeof Ionicons.glyphMap;
  return <Ionicons name={name} size={24} color={color} />;
}

export default function PatientLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

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
          title: 'Care',
          tabBarIcon: ({ color, focused }) => <TabIcon base="heart" color={color as string} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: 'Records',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon base="document-text" color={color as string} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Ask',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon base="chatbubble-ellipses" color={color as string} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <TabIcon base="person" color={color as string} focused={focused} />,
        }}
      />

      {/* Routable, but not tabs. */}
      <Tabs.Screen name="record" options={{ href: null }} />
      <Tabs.Screen name="documents" options={{ href: null }} />
    </Tabs>
  );
}
