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
  createAllergy,
  deleteAllergy,
  updateAllergy,
  type AllergyStatus,
  type Severity,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getToken } from '@/lib/auth-storage';

const SEVERITIES: Severity[] = ['mild', 'moderate', 'severe'];
const STATUSES: AllergyStatus[] = ['active', 'resolved'];

const isSeverity = (v?: string): v is Severity => SEVERITIES.includes(v as Severity);
const isStatus = (v?: string): v is AllergyStatus => STATUSES.includes(v as AllergyStatus);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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

export default function AllergyFormScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    allergen?: string;
    reaction?: string;
    severity?: string;
    status?: string;
  }>();
  const id = params.id;
  const isEdit = Boolean(id);

  const { signOut } = useAuth();
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const [allergen, setAllergen] = useState(params.allergen ?? '');
  const [reaction, setReaction] = useState(params.reaction ?? '');
  const [severity, setSeverity] = useState<Severity | null>(isSeverity(params.severity) ? params.severity : null);
  const [status, setStatus] = useState<AllergyStatus>(isStatus(params.status) ? params.status : 'active');
  const [allergenError, setAllergenError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Returns true if the failure was an auth problem (and we've already signed out).
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
    if (!allergen.trim()) {
      setAllergenError('Allergen is required.');
      return;
    }
    setAllergenError('');

    setSaving(true);
    try {
      const token = await getToken();
      if (!token) {
        await signOutRef.current();
        return;
      }
      const input = { allergen: allergen.trim(), reaction: reaction.trim(), severity, status };
      if (id) await updateAllergy(token, id, input);
      else await createAllergy(token, input);
      router.back();
    } catch (err) {
      if (await handleAuthFailure(err)) return;
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete allergy', `Remove "${allergen}" from your records?`, [
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
      await deleteAllergy(token, id);
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
          <ThemedText type="title">{isEdit ? 'Edit allergy' : 'Add allergy'}</ThemedText>
        </ThemedView>

        <ThemedView style={{ gap: Spacing.three }}>
          <Input
            label="Allergen"
            placeholder="e.g. Penicillin, peanuts"
            value={allergen}
            onChangeText={setAllergen}
            error={allergenError}
          />
          <Input
            label="Reaction (optional)"
            placeholder="e.g. Rash, swelling"
            value={reaction}
            onChangeText={setReaction}
          />

          <ThemedView style={{ gap: Spacing.two }}>
            <ThemedText type="smallBold">Severity (optional)</ThemedText>
            <ThemedView style={styles.chipRow}>
              {SEVERITIES.map((s) => (
                <Chip
                  key={s}
                  label={capitalize(s)}
                  selected={severity === s}
                  onPress={() => setSeverity(severity === s ? null : s)}
                />
              ))}
            </ThemedView>
          </ThemedView>

          <ThemedView style={{ gap: Spacing.two }}>
            <ThemedText type="smallBold">Status</ThemedText>
            <ThemedView style={styles.chipRow}>
              {STATUSES.map((s) => (
                <Chip key={s} label={capitalize(s)} selected={status === s} onPress={() => setStatus(s)} />
              ))}
            </ThemedView>
          </ThemedView>

          {formError ? (
            <ThemedText themeColor="error" type="small">
              ⚠ {formError}
            </ThemedText>
          ) : null}

          <Button title={isEdit ? 'Save changes' : 'Save allergy'} onPress={handleSave} loading={saving} />
        </ThemedView>

        {isEdit ? (
          <Pressable
            onPress={confirmDelete}
            disabled={deleting || saving}
            accessibilityRole="button"
            accessibilityLabel="Delete this allergy"
            style={{ alignItems: 'center', padding: Spacing.two }}>
            <ThemedText themeColor="error">{deleting ? 'Deleting…' : 'Delete this allergy'}</ThemedText>
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