import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { PressableCard } from '@/components/ui/pressable-card';
import { Spacing } from '@/constants/theme';
import { useDoctor } from '@/context/DoctorContext';
import { doctorApi, type OpenSession } from '@/doctor/api';
import { goDoctor } from '@/doctor/nav';
import { useFormState } from '@/hooks/useFormState';

import { clock, useCountdown } from './useCountdown';

const openPatient = (sid: string) => goDoctor('/doctor/patient', { sid });

function OpenRow({ s }: { s: OpenSession }) {
  const left = useCountdown(s.expires_at);
  if (left === 0) return null;
  return (
    <PressableCard label={`Open ${s.patient.first_name} ${s.patient.last_name}`} onPress={() => openPatient(s.session_id)}>
      <ThemedText type="smallBold">
        {s.patient.first_name} {s.patient.last_name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {clock(left)} left
      </ThemedText>
    </PressableCard>
  );
}

export function DoctorHomeScreen() {
  const { doctor, signOut } = useDoctor();
  const [sessions, setSessions] = useState<OpenSession[]>([]);
  const { bind, values } = useFormState({ code: '', pin: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      doctorApi.sessions().then(setSessions).catch(() => {});
    }, []),
  );

  const verified = doctor?.verification_status === 'verified';

  async function openWithPin() {
    setError('');
    setBusy(true);
    try {
      const s = await doctorApi.openByPin(values.code.trim(), values.pin.trim());
      openPatient(s.session_id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="title">Scan</ThemedText>
        <ThemedText themeColor="textSecondary">
          Dr {doctor?.first_name} {doctor?.last_name}
        </ThemedText>

        {!verified ? (
          <Card>
            <ThemedText type="smallBold">Your account is waiting for verification</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              You can open a patient once an administrator has verified your licence.
            </ThemedText>
          </Card>
        ) : null}

        <Button title="Scan patient QR code" onPress={() => goDoctor('/doctor/scan')} disabled={!verified} />
        <ThemedText type="small" themeColor="textSecondary">
          Opens the record for one hour, with no PIN. Every scan is shown in the patient&apos;s access history.
        </ThemedText>

        <Card>
          <ThemedText type="smallBold">No QR code? Use the patient&apos;s code and PIN</ThemedText>
          <Input label="Patient code" autoCapitalize="characters" {...bind('code')} />
          <Input label="PIN" keyboardType="number-pad" secureTextEntry {...bind('pin')} />
          <FormError message={error} />
          <Button title="Open record" variant="secondary" onPress={openWithPin} loading={busy} disabled={!verified} />
        </Card>

        {sessions.length > 0 ? (
          <>
            <ThemedText type="subtitle" accessibilityRole="header">
              Open now
            </ThemedText>
            {sessions.map((s) => (
              <OpenRow key={s.session_id} s={s} />
            ))}
          </>
        ) : null}

        <Button title="Log out" variant="secondary" onPress={signOut} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
});
