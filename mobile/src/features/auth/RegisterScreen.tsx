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
import { validateRegister, type RegisterErrors } from './validation';

export function RegisterScreen() {
  const { signUp } = useAuth();
  const { values, bind } = useFormState({ firstName: '', lastName: '', email: '', password: '' });
  const [errors, setErrors] = useState<RegisterErrors>({});
  const { loading, formError, submit } = useAuthSubmit();

  function handleRegister() {
    const found = validateRegister(values);
    setErrors(found);
    if (Object.keys(found).length === 0) {
      void submit(() => signUp(values.email.trim(), values.password, values.firstName.trim(), values.lastName.trim()));
    }
  }

  return (
    <KeyboardScreen centered>
      <ThemedView style={styles.heading}>
        <ThemedText type="title">Create account</ThemedText>
        <ThemedText themeColor="textSecondary">Start managing your health records</ThemedText>
      </ThemedView>

      <ThemedView style={styles.form}>
        <Input label="First name" placeholder="Amie" autoComplete="given-name" error={errors.firstName} {...bind('firstName')} />
        <Input label="Last name" placeholder="Sallah" autoComplete="family-name" error={errors.lastName} {...bind('lastName')} />
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
          placeholder="At least 8 characters"
          secureTextEntry
          autoComplete="password-new"
          error={errors.password}
          {...bind('password')}
        />
        <FormError message={formError} />
        <Button title="Create account" onPress={handleRegister} loading={loading} />
      </ThemedView>

      <AuthFooter prompt="Already have an account?" linkLabel="Log in" href="/login" />
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: Spacing.one },
  form: { gap: Spacing.three },
});
