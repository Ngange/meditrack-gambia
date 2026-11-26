import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { errorMessage } from '@/api';
import { KeyboardScreen } from '@/components/layout/KeyboardScreen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useDoctor } from '@/context/DoctorContext';
import { useFormState } from '@/hooks/useFormState';

export function DoctorLoginScreen() {
  const { signIn } = useDoctor();
  const { bind, values } = useFormState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function go() {
    if (!values.email.trim() || !values.password) return setError('Enter your email and password.');
    setError('');
    setLoading(true);
    try {
      await signIn(values.email.trim(), values.password); // the root layout then opens the doctor screens
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardScreen centered>
      <ThemedView style={styles.gap}>
        <ThemedText type="title">Doctor log in</ThemedText>
        <ThemedText themeColor="textSecondary">
          Scan a patient&apos;s QR code to see and add to their record. Needs an internet connection.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.form}>
        <Input label="Email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" {...bind('email')} />
        <Input label="Password" secureTextEntry autoComplete="password" {...bind('password')} />
        <FormError message={error} />
        <Button title="Log in" onPress={go} loading={loading} />
      </ThemedView>
      <ThemedView style={styles.row}>
        <Link href="/login" replace>
          <ThemedText type="linkPrimary">Back to patient log in</ThemedText>
        </Link>
      </ThemedView>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.one },
  form: { gap: Spacing.three },
  row: { flexDirection: 'row', justifyContent: 'center' },
});
