import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  createCondition,
  deleteCondition,
  updateCondition,
  type ConditionStatus,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getToken } from '@/lib/auth-storage';

const STATUSES: ConditionStatus[] = ['active', 'chronic', 'resolved'];
const isStatus = (v?: string): v is ConditionStatus => STATUSES.includes(v as ConditionStatus);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// True only for a real calendar date written as YYYY-MM-DD (rejects 2019-02-30, 2019-2-3, ...).
function isRealDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, { borderColor: selected ? theme.text : 'transparent' }]}>
      <ThemedView type="backgroundElement" style={styles.chipInner}>
        <ThemedText type={selected ? 'smallBold' : 'small'}>{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export default function ConditionFormScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    date?: string;
    notes?: string;
    status?: string;
  }>();
  const id = params.id;
  const isEdit = Boolean(id);

  const { signOut } = useAuth();
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const [name, setName] = useState(params.name ?? '');
  const [date, setDate] = useState(params.date ?? '');
  const [notes, setNotes] = useState(params.notes ?? '');
  const [status, setStatus] = useState<ConditionStatus>(isStatus(params.status) ? params.status : 'active');
  const [nameError, setNameError] = useState('');
  const [dateError, setDateError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleAuthFailure(err: unknown) {
    const s = (err as any).status;
    if (s === 401 || s === 403) {
      await signOutRef.current();
      return true;
    }
    return false;
  }

  async function handleSave() {
    setFormError('');
    let valid = true;
    if (!name.trim()) {
      setNameError('Condition name is required.');
      valid = false;
    } else setNameError('');
    if (date.trim() && !isRealDate(date.trim())) {
      setDateError('Enter a real date in the format YYYY-MM-DD, e.g. 2019-03-14.'); 
    } else setDateError('');
    if (!valid) return;

    setSaving(true);
    try {
      const token = await getToken();
      if (!token) {
        await signOutRef.current();
        return;
      }
      const input = {
        conditionName: name.trim(),
        diagnosisDate: date.trim(),
        status,
        notes: notes.trim(),
      };
      if (id) await updateCondition(token, id, input);
      else await createCondition(token, input);
      router.back();
    } catch (err) {
      if (await handleAuthFailure(err)) return;
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete condition', `Remove "${name}" from your records?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: handleDelete },
    ]);
  }

  async function handleDelete() {
    if (!id) return;
    setFormError('');
    setDeleting(true);
    try {
      const token = await getToken();
      if (!token) {
        await signOutRef.current();
        return;
      }
      await deleteCondition(token, id);
      router.back();
    } catch (err) {
      if (await handleAuthFailure(err)) return;
      setFormError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.three }}
        keyboardShouldPersistTaps="handled">
        <ThemedView style={{ gap: Spacing.one }}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Cancel">
            <ThemedText type="linkPrimary">‹ Cancel</ThemedText>
          </Pressable>
          <ThemedText type="title">{isEdit ? 'Edit condition' : 'Add condition'}</ThemedText>
        </ThemedView>

        <ThemedView style={{ gap: Spacing.three }}>
          <Input
            label="Condition"
            placeholder="e.g. Type 2 diabetes, hypertension"
            value={name}
            onChangeText={setName}
            error={nameError}
          />
          <Input
            label="Date diagnosed (optional)"
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            value={date}
            onChangeText={setDate}
            error={dateError}
          />

          <ThemedView style={{ gap: Spacing.two }}>
            <ThemedText type="smallBold">Status</ThemedText>
            <ThemedView style={styles.chipRow}>
              {STATUSES.map((s) => (
                <Chip key={s} label={capitalize(s)} selected={status === s} onPress={() => setStatus(s)} />
              ))}
            </ThemedView>
          </ThemedView>

          <Input
            label="Notes (optional)"
            placeholder="e.g. Managed with diet and medication"
            value={notes}
            onChangeText={setNotes}
          />

          {formError ? (
            <ThemedText themeColor="error" type="small">
              ⚠ {formError}
            </ThemedText>
          ) : null}

          <Button title={isEdit ? 'Save changes' : 'Save condition'} onPress={handleSave} loading={saving} />
        </ThemedView>

        {isEdit ? (
          <Pressable
            onPress={confirmDelete}
            disabled={deleting || saving}
            accessibilityRole="button"
            accessibilityLabel="Delete this condition"
            style={{ alignItems: 'center', padding: Spacing.two }}>
            <ThemedText themeColor="error">{deleting ? 'Deleting…' : 'Delete this condition'}</ThemedText>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  chip: { borderWidth: 2, borderRadius: Spacing.four },
  chipInner: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.three },
});