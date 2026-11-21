import { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorNotice } from '@/components/ui/error-notice';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useFocusLoad } from '@/hooks/useFocusLoad';

import { accessApi } from './accessApi';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const digits = (s: string) => s.replace(/\D/g, '').slice(0, 6);

/** "Show my PIN to a doctor": the patient's code, and where they set the PIN a doctor types with it. */
export function AccessCard() {
  const { data, loading, error, retry, setData } = useFocusLoad(accessApi.get);

  const [editing, setEditing] = useState(false);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);

  function close() {
    setEditing(false);
    setPin('');
    setConfirm('');
    setPassword('');
    setFormError('');
  }

  async function save() {
    if (!/^\d{6}$/.test(pin)) return setFormError('The PIN must be exactly 6 digits.');
    if (pin !== confirm) return setFormError('The two PINs do not match.');
    if (!password) return setFormError('Enter your account password.');
    setSaving(true);
    setFormError('');
    try {
      setData(await accessApi.setPin(pin, password));
      setSaved(true);
      close();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ActivityIndicator />;
  if (error || !data) return <ErrorNotice message={error || 'Could not load your access details.'} onRetry={retry} />;

  return (
    <Card>
      <ThemedText type="subtitle" accessibilityRole="header">
        Show my PIN to a doctor
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        A doctor with a MediTrack account can open your records. They need your code and your PIN.
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary" style={styles.gap}>
        Your code
      </ThemedText>
      <ThemedText selectable accessibilityLabel={`Your patient code is ${data.patient_code}`} style={styles.code}>
        {data.patient_code}
      </ThemedText>

      {data.locked_until ? (
        <FormError message={`Doctor access is locked until ${when(data.locked_until)} after too many wrong PINs. Choosing a new PIN ends the lock.`} />
      ) : data.has_pin ? (
        <ThemedText type="small" themeColor="primary">
          PIN set{data.pin_set_at ? ` on ${when(data.pin_set_at)}` : ''}
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          You have not set a PIN yet, so no doctor can open your records. Set one below.
        </ThemedText>
      )}

      {saved && !editing ? (
        <ThemedText type="small">
          PIN saved. Keep it private and tell your doctor yourself. Nobody, including this app, can show it to you again.
        </ThemedText>
      ) : null}

      {editing ? (
        <ThemedView style={styles.form}>
          <Input label="New PIN (6 digits)" secureTextEntry keyboardType="number-pad" maxLength={6} value={pin} onChangeText={(v) => setPin(digits(v))} />
          <Input label="Type it again" secureTextEntry keyboardType="number-pad" maxLength={6} value={confirm} onChangeText={(v) => setConfirm(digits(v))} />
          <Input label="Your account password" secureTextEntry autoComplete="password" value={password} onChangeText={setPassword} />
          <FormError message={formError} />
          <Button title="Save PIN" onPress={save} loading={saving} />
          <Button title="Cancel" variant="secondary" onPress={close} />
        </ThemedView>
      ) : (
        <Button
          title={data.has_pin ? 'Change my PIN' : 'Set my PIN'}
          onPress={() => {
            setSaved(false);
            setEditing(true);
          }}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: Spacing.two },
  code: { fontFamily: 'monospace', fontSize: 28, fontWeight: '700', letterSpacing: 1 },
  form: { gap: Spacing.three, backgroundColor: 'transparent' },
});
