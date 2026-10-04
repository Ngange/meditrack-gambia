import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = 'Email is required.';
    if (!password) errors.password = 'Password is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleLogin() {
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.three }}
        keyboardShouldPersistTaps="handled">
        <ThemedView style={{ gap: Spacing.one }}>
          <ThemedText type="title">MediTrack Gambia</ThemedText>
          <ThemedText themeColor="textSecondary">Log in to your account</ThemedText>
        </ThemedView>

        <ThemedView style={{ gap: Spacing.three }}>
          <Input
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            error={fieldErrors.email}
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            error={fieldErrors.password}
          />

          {formError ? (
            <ThemedText themeColor="error" type="small">
              ⚠ {formError}
            </ThemedText>
          ) : null}

          <Button title="Log in" onPress={handleLogin} loading={loading} />
        </ThemedView>

        <ThemedView style={{ flexDirection: 'row', justifyContent: 'center', gap: Spacing.one }}>
          <ThemedText themeColor="textSecondary">Don't have an account?</ThemedText>
          <Link href="/register" replace>
            <ThemedText type="linkPrimary">Register</ThemedText>
          </Link>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}