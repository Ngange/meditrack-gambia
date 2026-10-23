import { useState } from 'react';
import { Linking, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Stepper } from '@/components/ui/stepper';
import { Spacing } from '@/constants/theme';
import { useReminderPermission } from '@/hooks/useReminderPermission';
import { formatTime, sortTimes } from '@/utils/times';

import { MAX_REMINDERS } from './types';

const PRESETS = [
  { label: 'Morning', time: '08:00' },
  { label: 'Afternoon', time: '13:00' },
  { label: 'Evening', time: '18:00' },
  { label: 'Night', time: '21:00' },
] as const;

type Props = { value: string[]; onChange: (times: string[]) => void };

/** Pick the times of day the phone should remind the patient to take this medicine. */
export function ReminderTimesField({ value, onChange }: Props) {
  const { permission, request } = useReminderPermission();
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);

  const custom = formatTime(hour, minute);
  const full = value.length >= MAX_REMINDERS;

  function add(time: string) {
    if (value.includes(time) || full) return;
    // The first reminder is the moment to ask for notification permission.
    if (value.length === 0 && permission !== 'granted') void request();
    onChange(sortTimes([...value, time]));
  }

  return (
    <ThemedView style={styles.group}>
      <ThemedText type="smallBold">Reminders (optional)</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Your phone will remind you at these times, even without internet. Up to {MAX_REMINDERS} times.
      </ThemedText>

      {value.length > 0 ? (
        <ThemedView style={styles.row}>
          {value.map((time) => (
            <Chip
              key={time}
              label={`${time}  ✕`}
              selected
              onPress={() => onChange(value.filter((t) => t !== time))}
              accessibilityLabel={`Remove reminder at ${time}`}
            />
          ))}
        </ThemedView>
      ) : null}

      <ThemedView style={styles.row}>
        {PRESETS.filter((p) => !value.includes(p.time)).map((p) => (
          <Chip
            key={p.time}
            label={`${p.label} ${p.time}`}
            selected={false}
            onPress={() => add(p.time)}
            accessibilityLabel={`Add ${p.label.toLowerCase()} reminder at ${p.time}`}
          />
        ))}
      </ThemedView>

      <ThemedView style={styles.custom}>
        <Stepper
          label="Hour"
          display={String(hour).padStart(2, '0')}
          onDecrement={() => setHour((h) => (h + 23) % 24)}
          onIncrement={() => setHour((h) => (h + 1) % 24)}
        />
        <Stepper
          label="Minute"
          display={String(minute).padStart(2, '0')}
          onDecrement={() => setMinute((m) => (m + 55) % 60)}
          onIncrement={() => setMinute((m) => (m + 5) % 60)}
        />
      </ThemedView>
      <Button
        title={`Add reminder at ${custom}`}
        variant="secondary"
        onPress={() => add(custom)}
        disabled={full || value.includes(custom)}
      />

      {value.length > 0 && permission === 'denied' ? (
        <ThemedView style={styles.warning}>
          <ThemedText type="small" themeColor="error">
            ⚠ Notifications are turned off for MediTrack, so these reminders will not ring.
          </ThemedText>
          <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button">
            <ThemedText type="linkPrimary">Open phone settings</ThemedText>
          </Pressable>
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  custom: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.one },
  warning: { gap: Spacing.one },
});
