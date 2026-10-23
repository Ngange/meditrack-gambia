import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { KeyboardScreen } from '@/components/layout/KeyboardScreen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFormState } from '@/hooks/useFormState';

import { AuthFooter } from './AuthFooter';
import { useAuthSubmit } from './useAuthSubmit';
import { validateLogin, type LoginErrors } from './validation';

export function LoginScreen() {
  const { signIn } = useAuth();
  const { values, bind } = useFormState({ email: '', password: '' });
  const [errors, setErrors] = useState<LoginErrors>({});
  const { loading, formError, submit } = useAuthSubmit();

  function handleLogin() {
    const found = validateLogin(values);
    setErrors(found);
    if (Object.keys(found).length === 0) void submit(() => signIn(values.email.trim(), values.password));
  }

  return (
    <KeyboardScreen centered>
      <ThemedView style={styles.heading}>
        <ThemedText type="title">MediTrack Gambia</ThemedText>
        <ThemedText themeColor="textSecondary">Log in to your account</ThemedText>
      </ThemedView>

      <ThemedView style={styles.form}>
        <Input
          label="Email"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={errors.email}
          {...bind('email')}
        />
        <Input
          label="Password"
          placeholder="Enter your password"
          secureTextEntry
          autoComplete="password"
          error={errors.password}
          {...bind('password')}
        />
        <FormError message={formError} />
        <Button title="Log in" onPress={handleLogin} loading={loading} />
      </ThemedView>

      <AuthFooter prompt="Don't have an account?" linkLabel="Register" href="/register" />
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: Spacing.one },
  form: { gap: Spacing.three },
});
