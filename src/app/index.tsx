import { useAuth } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useRole } from '@/hooks/use-role';
import { palette } from '@/theme/tokens';

/** Entry gate: route by auth state, then by persona (clinician vs patient). */
export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const { role, isLoaded: roleLoaded } = useRole();

  if (!isLoaded || (isSignedIn && !roleLoaded)) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={palette.light.primary} />
      </View>
    );
  }

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  return <Redirect href={role === 'clinician' ? '/(clinician)' : '/(patient)'} />;
}
