import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
};

export default function RegisterScreen() {
  const { signUp } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const errors: FieldErrors = {};
    if (!firstName.trim()) errors.firstName = 'First name is required.';
    if (!lastName.trim()) errors.lastName = 'Last name is required.';
    if (!email.trim()) errors.email = 'Email is required.';
    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleRegister() {
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await signUp(email.trim(), password, firstName.trim(), lastName.trim());
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
          <ThemedText type="title">Create account</ThemedText>
          <ThemedText themeColor="textSecondary">Start managing your health records</ThemedText>
        </ThemedView>

        <ThemedView style={{ gap: Spacing.three }}>
          <Input
            label="First name"
            placeholder="Amie"
            autoComplete="given-name"
            value={firstName}
            onChangeText={setFirstName}
            error={fieldErrors.firstName}
          />
          <Input
            label="Last name"
            placeholder="Sallah"
            autoComplete="family-name"
            value={lastName}
            onChangeText={setLastName}
            error={fieldErrors.lastName}
          />
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
            placeholder="At least 8 characters"
            secureTextEntry
            autoComplete="password-new"
            value={password}
            onChangeText={setPassword}
            error={fieldErrors.password}
          />

          {formError ? (
            <ThemedText themeColor="error" type="small">
              ⚠ {formError}
            </ThemedText>
          ) : null}

          <Button title="Create account" onPress={handleRegister} loading={loading} />
        </ThemedView>

        <ThemedView style={{ flexDirection: 'row', justifyContent: 'center', gap: Spacing.one }}>
          <ThemedText themeColor="textSecondary">Already have an account?</ThemedText>
          <Link href="/login" replace>
            <ThemedText type="linkPrimary">Log in</ThemedText>
          </Link>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}