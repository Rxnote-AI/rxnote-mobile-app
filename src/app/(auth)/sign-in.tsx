import { useSignIn, useSSO } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccentButton } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import { useWarmUpBrowser } from '@/hooks/use-warm-up-browser';
import { rx } from '@/theme/rx';

// Required for the OAuth redirect to complete when the browser returns to the app.
WebBrowser.maybeCompleteAuthSession();

type Busy = 'google' | 'email' | null;

export default function SignInScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { startSSOFlow } = useSSO();
  const { signIn, setActive, isLoaded } = useSignIn();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  /** Set when Clerk asks for an emailed code instead of accepting the password. */
  const [pendingCode, setPendingCode] = useState(false);
  /** Set when the account has 2FA on and Clerk needs a second-factor code. */
  const [secondFactorStrategy, setSecondFactorStrategy] = useState<
    'phone_code' | 'totp' | 'email_code' | 'backup_code' | null
  >(null);
  /** Masked destination for the second-factor code, e.g. "+1 (•••) •••-1234". */
  const [secondFactorHint, setSecondFactorHint] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const onGoogle = useCallback(async () => {
    setBusy('google');
    setError(null);
    try {
      const { createdSessionId, setActive: activate } = await startSSOFlow({
        strategy: 'oauth_google',
        // Deterministic native redirect (rxnote://sso-callback) — must be allowlisted
        // in the Clerk dashboard (Native applications → redirect URLs).
        redirectUrl: AuthSession.makeRedirectUri({ scheme: 'rxnote', path: 'sso-callback' }),
      });
      if (createdSessionId && activate) {
        await activate({ session: createdSessionId });
        router.replace('/');
      }
    } catch (e: unknown) {
      setError(readClerkError(e, 'Google sign-in failed.'));
    } finally {
      setBusy(null);
    }
  }, [startSSOFlow, router]);

  const onEmail = useCallback(async () => {
    if (!isLoaded) return;
    setBusy('email');
    setError(null);
    try {
      const attempt = await signIn.create({ identifier: email, password });

      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/');
        return;
      }

      // Password didn't finish the sign-in. The usual cause on a Clerk instance
      // with password auth disabled is `needs_first_factor` offering email_code —
      // so fall back to emailing a code rather than dead-ending the user.
      if (attempt.status === 'needs_first_factor') {
        const emailFactor = attempt.supportedFirstFactors?.find(
          (f): f is typeof f & { emailAddressId: string } => f.strategy === 'email_code',
        );
        if (emailFactor) {
          await signIn.prepareFirstFactor({
            strategy: 'email_code',
            emailAddressId: emailFactor.emailAddressId,
          });
          setPendingCode(true);
          return;
        }
        const offered = attempt.supportedFirstFactors?.map((f) => f.strategy).join(', ') || 'none';
        setError(`This account needs a different sign-in method (available: ${offered}).`);
        return;
      }

      if (attempt.status === 'needs_second_factor') {
        const factors = attempt.supportedSecondFactors ?? [];
        const phoneFactor = factors.find(
          (f): f is typeof f & { phoneNumberId: string; safeIdentifier: string } =>
            f.strategy === 'phone_code',
        );
        const totpFactor = factors.find((f) => f.strategy === 'totp');
        const emailFactor = factors.find(
          (f): f is typeof f & { emailAddressId: string; safeIdentifier: string } =>
            f.strategy === 'email_code',
        );
        const backupCodeFactor = factors.find((f) => f.strategy === 'backup_code');

        if (phoneFactor) {
          await signIn.prepareSecondFactor({
            strategy: 'phone_code',
            phoneNumberId: phoneFactor.phoneNumberId,
          });
          setSecondFactorStrategy('phone_code');
          setSecondFactorHint(phoneFactor.safeIdentifier);
          return;
        }
        if (totpFactor) {
          setSecondFactorStrategy('totp');
          setSecondFactorHint(null);
          return;
        }
        if (emailFactor) {
          await signIn.prepareSecondFactor({
            strategy: 'email_code',
            emailAddressId: emailFactor.emailAddressId,
          });
          setSecondFactorStrategy('email_code');
          setSecondFactorHint(emailFactor.safeIdentifier);
          return;
        }
        if (backupCodeFactor) {
          setSecondFactorStrategy('backup_code');
          setSecondFactorHint(null);
          return;
        }

        const offered = factors.map((f) => f.strategy).join(', ') || 'none';
        setError(`This account's two-factor method (${offered}) isn't supported in the app yet.`);
        return;
      }

      // Surface the real status instead of a generic catch-all.
      setError(`Sign-in could not complete (status: ${attempt.status}).`);
    } catch (e: unknown) {
      setError(readClerkError(e, 'Sign-in failed. Check your credentials.'));
    } finally {
      setBusy(null);
    }
  }, [isLoaded, signIn, email, password, setActive, router]);

  /** Completes an email_code first-factor sign-in. */
  const onVerifyCode = useCallback(async () => {
    if (!isLoaded) return;
    setBusy('email');
    setError(null);
    try {
      const attempt = await signIn.attemptFirstFactor({ strategy: 'email_code', code: code.trim() });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/');
      } else {
        setError(`Could not complete sign-in (status: ${attempt.status}).`);
      }
    } catch (e: unknown) {
      setError(readClerkError(e, 'That code did not work.'));
    } finally {
      setBusy(null);
    }
  }, [isLoaded, signIn, code, setActive, router]);

  /** Completes sign-in with a second-factor (2FA) code. */
  const onVerifySecondFactor = useCallback(async () => {
    if (!isLoaded || !secondFactorStrategy) return;
    setBusy('email');
    setError(null);
    try {
      const trimmed = code.trim();
      const params =
        secondFactorStrategy === 'phone_code'
          ? { strategy: 'phone_code' as const, code: trimmed }
          : secondFactorStrategy === 'totp'
            ? { strategy: 'totp' as const, code: trimmed }
            : secondFactorStrategy === 'email_code'
              ? { strategy: 'email_code' as const, code: trimmed }
              : { strategy: 'backup_code' as const, code: trimmed };
      const attempt = await signIn.attemptSecondFactor(params);
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/');
      } else {
        setError(`Could not complete sign-in (status: ${attempt.status}).`);
      }
    } catch (e: unknown) {
      setError(readClerkError(e, 'That code did not work.'));
    } finally {
      setBusy(null);
    }
  }, [isLoaded, signIn, secondFactorStrategy, code, setActive, router]);

  const resetToCredentials = useCallback(() => {
    setPendingCode(false);
    setSecondFactorStrategy(null);
    setSecondFactorHint(null);
    setCode('');
    setError(null);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-rx-bg">
      <KeyboardAvoidingView className="flex-1" behavior="padding" keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingTop: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-8">
            <Text weight="extrabold" className="text-[30px] tracking-tight text-rx-ink">
              RxNote
            </Text>
            <Text weight="medium" className="mt-1 text-[14px] text-rx-muted">
              Sign in to continue
            </Text>
          </View>

          <Pressable
            onPress={onGoogle}
            disabled={busy !== null}
            className="h-[52px] flex-row items-center justify-center gap-2.5 rounded-[16px] border border-rx-line bg-rx-surface active:opacity-80"
          >
            <Ionicons name="logo-google" size={18} color={rx.ink} />
            <Text weight="bold" className="text-[15px] text-rx-ink">
              {busy === 'google' ? 'Connecting…' : 'Continue with Google'}
            </Text>
          </Pressable>

          <Divider />

          {secondFactorStrategy ? (
            <>
              <Text weight="medium" className="mb-4 text-[13.5px] leading-5 text-rx-muted">
                {secondFactorHintText(secondFactorStrategy, secondFactorHint)}
              </Text>
              <AuthField
                label={secondFactorStrategy === 'backup_code' ? 'BACKUP CODE' : 'VERIFICATION CODE'}
                value={code}
                onChangeText={setCode}
                placeholder={secondFactorStrategy === 'backup_code' ? 'xxxxx-xxxxx' : '123456'}
                keyboardType={secondFactorStrategy === 'backup_code' ? 'default' : 'number-pad'}
                autoCapitalize="none"
                autoComplete="one-time-code"
              />
            </>
          ) : pendingCode ? (
            <>
              <Text weight="medium" className="mb-4 text-[13.5px] leading-5 text-rx-muted">
                We emailed a 6-digit code to {email}. Enter it to finish signing in.
              </Text>
              <AuthField
                label="VERIFICATION CODE"
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="number-pad"
                autoComplete="one-time-code"
              />
            </>
          ) : (
            <>
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
                placeholder="••••••••"
                secureTextEntry
                autoComplete="password"
              />
            </>
          )}

          {error ? (
            <Text weight="medium" className="mb-2 text-[13px] text-rx-accent">
              {error}
            </Text>
          ) : null}

          <AccentButton
            className="mt-2 rounded-[16px]"
            label={
              busy === 'email'
                ? secondFactorStrategy || pendingCode
                  ? 'Verifying…'
                  : 'Signing in…'
                : secondFactorStrategy || pendingCode
                  ? 'Verify & continue'
                  : 'Sign in'
            }
            disabled={busy !== null || ((secondFactorStrategy !== null || pendingCode) && code.trim().length < 4)}
            onPress={secondFactorStrategy ? onVerifySecondFactor : pendingCode ? onVerifyCode : onEmail}
          />

          {secondFactorStrategy || pendingCode ? (
            <Pressable onPress={resetToCredentials} className="mt-3 items-center active:opacity-70">
              <Text weight="bold" className="text-[13px] text-rx-muted">
                Use a different account
              </Text>
            </Pressable>
          ) : null}

          <View className="mt-6 flex-row items-center justify-center gap-1.5">
            <Text weight="medium" className="text-[13.5px] text-rx-muted">
              Don&apos;t have an account?
            </Text>
            <Link href="/(auth)/choose-role" asChild>
              <Pressable>
                <Text weight="bold" className="text-[13.5px] text-rx-accent">
                  Sign up
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Labeled input shared by the auth screens. */
export function AuthField({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View className="mb-4">
      <Text weight="extrabold" className="mb-1.5 text-[11px] tracking-wider text-rx-label">
        {label}
      </Text>
      <TextInput
        placeholderTextColor="#B7B7B2"
        className="h-[52px] rounded-[14px] border border-rx-line2 bg-rx-surface px-4 text-[15px] text-rx-ink"
        style={{ fontFamily: 'PlusJakartaSans' }}
        {...props}
      />
    </View>
  );
}

function Divider() {
  return (
    <View className="my-5 flex-row items-center gap-3">
      <View className="h-px flex-1 bg-rx-line" />
      <Text weight="medium" className="text-[13px] text-rx-muted">
        or
      </Text>
      <View className="h-px flex-1 bg-rx-line" />
    </View>
  );
}

function secondFactorHintText(
  strategy: 'phone_code' | 'totp' | 'email_code' | 'backup_code',
  hint: string | null,
): string {
  switch (strategy) {
    case 'phone_code':
      return `We texted a code to ${hint ?? 'your phone'}. Enter it to finish signing in.`;
    case 'totp':
      return 'Enter the 6-digit code from your authenticator app.';
    case 'email_code':
      return `We emailed a verification code to ${hint ?? 'your email'}. Enter it to finish signing in.`;
    case 'backup_code':
      return 'Enter one of your saved backup codes.';
  }
}

/** Pull the human-readable message out of a Clerk error, with a fallback. */
function readClerkError(e: unknown, fallback: string): string {
  const err = e as { errors?: Array<{ message?: string }> };
  return err?.errors?.[0]?.message ?? fallback;
}
