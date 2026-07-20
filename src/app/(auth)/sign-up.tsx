import { useSignUp, useSSO } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccentButton, RoundIconButton } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import { useWarmUpBrowser } from '@/hooks/use-warm-up-browser';
import { rx } from '@/theme/rx';
import { AuthField } from './sign-in';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { startSSOFlow } = useSSO();
  const { signUp, setActive, isLoaded } = useSignUp();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGoogle = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const { createdSessionId, setActive: activate } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri({ scheme: 'rxnote', path: 'sso-callback' }),
      });
      if (createdSessionId && activate) {
        await activate({ session: createdSessionId });
        router.replace('/');
      }
    } catch (e) {
      setError(readClerkError(e, 'Google sign-up failed.'));
    } finally {
      setBusy(false);
    }
  }, [startSSOFlow, router]);

  const onSubmit = useCallback(async () => {
    if (!isLoaded) return;
    setBusy(true);
    setError(null);
    try {
      await signUp.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: email.trim(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (e) {
      setError(readClerkError(e, 'Could not create your account.'));
    } finally {
      setBusy(false);
    }
  }, [isLoaded, signUp, firstName, lastName, email, password]);

  const onVerify = useCallback(async () => {
    if (!isLoaded) return;
    setBusy(true);
    setError(null);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/');
      } else {
        setError('That code did not verify. Please try again.');
      }
    } catch (e) {
      setError(readClerkError(e, 'Verification failed.'));
    } finally {
      setBusy(false);
    }
  }, [isLoaded, signUp, code, setActive, router]);

  const canSubmit =
    firstName.trim() && lastName.trim() && email.trim() && password.length >= 8;

  return (
    <SafeAreaView className="flex-1 bg-rx-bg">
      <KeyboardAvoidingView className="flex-1" behavior="padding" keyboardVerticalOffset={0}>
        <View className="flex-row items-center gap-[14px] px-5 pt-2">
          <RoundIconButton name="chevron-back" size={20} onPress={() => router.back()} />
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingTop: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {pendingVerification ? (
            <>
              <View className="mb-8">
                <Text weight="extrabold" className="text-[26px] tracking-tight text-rx-ink">
                  Verify your email
                </Text>
                <Text weight="medium" className="mt-1 text-[14px] leading-5 text-rx-muted">
                  We sent a 6-digit code to {email}. Enter it below to finish.
                </Text>
              </View>
              <AuthField
                label="VERIFICATION CODE"
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="number-pad"
                autoComplete="one-time-code"
              />
              {error ? (
                <Text weight="medium" className="mb-2 text-[13px] text-rx-accent">
                  {error}
                </Text>
              ) : null}
              <AccentButton
                className="mt-2 rounded-[16px]"
                label={busy ? 'Verifying…' : 'Verify & continue'}
                disabled={busy || code.trim().length < 4}
                onPress={onVerify}
              />
            </>
          ) : (
            <>
              <View className="mb-8">
                <Text weight="extrabold" className="text-[30px] tracking-tight text-rx-ink">
                  Create your account
                </Text>
                <Text weight="medium" className="mt-1 text-[14px] text-rx-muted">
                  Join RxNote and start documenting faster
                </Text>
              </View>

              <Pressable
                onPress={onGoogle}
                disabled={busy}
                className="h-[52px] flex-row items-center justify-center gap-2.5 rounded-[16px] border border-rx-line bg-rx-surface active:opacity-80"
              >
                <Ionicons name="logo-google" size={18} color={rx.ink} />
                <Text weight="bold" className="text-[15px] text-rx-ink">
                  Continue with Google
                </Text>
              </Pressable>

              <View className="my-5 flex-row items-center gap-3">
                <View className="h-px flex-1 bg-rx-line" />
                <Text weight="medium" className="text-[13px] text-rx-muted">
                  or
                </Text>
                <View className="h-px flex-1 bg-rx-line" />
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <AuthField
                    label="FIRST NAME"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Ramesh"
                    autoCapitalize="words"
                    autoComplete="name-given"
                  />
                </View>
                <View className="flex-1">
                  <AuthField
                    label="LAST NAME"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Rao"
                    autoCapitalize="words"
                    autoComplete="name-family"
                  />
                </View>
              </View>

              <AuthField
                label="EMAIL"
                value={email}
                onChangeText={setEmail}
                placeholder="you@clinic.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <AuthField
                label="PASSWORD"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secureTextEntry
                autoComplete="password-new"
              />

              {error ? (
                <Text weight="medium" className="mb-2 text-[13px] text-rx-accent">
                  {error}
                </Text>
              ) : null}

              <AccentButton
                className="mt-2 rounded-[16px]"
                label={busy ? 'Creating…' : 'Create account'}
                disabled={busy || !canSubmit}
                onPress={onSubmit}
              />

              <View className="mt-6 flex-row items-center justify-center gap-1.5">
                <Text weight="medium" className="text-[13.5px] text-rx-muted">
                  Already have an account?
                </Text>
                <Link href="/(auth)/sign-in" asChild>
                  <Pressable>
                    <Text weight="bold" className="text-[13.5px] text-rx-accent">
                      Sign in
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function readClerkError(e: unknown, fallback: string): string {
  const err = e as { errors?: Array<{ message?: string }> };
  return err?.errors?.[0]?.message ?? fallback;
}
