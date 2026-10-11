import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { createVisit, deleteVisit, updateVisit } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getToken } from '@/lib/auth-storage';

// True only for a real calendar date written as YYYY-MM-DD (rejects 2026-02-30, 2026-2-3, ...).
function isRealDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// Today in the phone's own timezone, as YYYY-MM-DD (used to pre-fill a new visit).
function todayLocal() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function VisitFormScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    facility?: string;
    date?: string;
    reason?: string;
    diagnosis?: string;
    treatment?: string;
    notes?: string;
  }>();
  const id = params.id;
  const isEdit = Boolean(id);

  const { signOut } = useAuth();
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const [facility, setFacility] = useState(params.facility ?? '');
  const [date, setDate] = useState(params.date ?? (isEdit ? '' : todayLocal()));
  const [reason, setReason] = useState(params.reason ?? '');
  const [diagnosis, setDiagnosis] = useState(params.diagnosis ?? '');
  const [treatment, setTreatment] = useState(params.treatment ?? '');
  const [notes, setNotes] = useState(params.notes ?? '');
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
    setDateError('');
    const d = date.trim();
    if (!isRealDate(d)) {
      setDateError('Enter a real date in the format YYYY-MM-DD, e.g. 2026-02-14.');
      return;
    }
    if (d > todayLocal()) {
      setDateError('The visit date cannot be in the future.');
      return;
    }
    if (!facility.trim() && !reason.trim()) {
      setFormError('Add the facility or the reason for the visit.');
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      if (!token) {
        await signOutRef.current();
        return;
      }
      const input = {
        facilityName: facility.trim(),
        visitDate: d,
        reason: reason.trim(),
        diagnosis: diagnosis.trim(),
        treatment: treatment.trim(),
        notes: notes.trim(),
      };
      if (id) await updateVisit(token, id, input);
      else await createVisit(token, input);
      router.back();
    } catch (err) {
      if (await handleAuthFailure(err)) return;
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete visit', 'Remove this visit from your records?', [
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
      await deleteVisit(token, id);
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
        contentContainerStyle={{ flexGrow: 1, padding: Spacing.four, gap: Spacing.three }}
        keyboardShouldPersistTaps="handled">
        <ThemedView style={{ gap: Spacing.one }}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Cancel">
            <ThemedText type="linkPrimary">‹ Cancel</ThemedText>
          </Pressable>
          <ThemedText type="title">{isEdit ? 'Edit visit' : 'Add visit'}</ThemedText>
        </ThemedView>

        <ThemedView style={{ gap: Spacing.three }}>
          <Input
            label="Date of visit"
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            value={date}
            onChangeText={setDate}
            error={dateError}
          />
          <Input
            label="Clinic or hospital"
            placeholder="e.g. Edward Francis Small Teaching Hospital"
            value={facility}
            onChangeText={setFacility}
          />
          <Input
            label="Reason for visit"
            placeholder="e.g. Routine blood pressure check"
            value={reason}
            onChangeText={setReason}
          />
          <Input
            label="Diagnosis (optional)"
            placeholder="e.g. Hypertension (controlled)"
            value={diagnosis}
            onChangeText={setDiagnosis}
          />
          <Input
            label="Treatment (optional)"
            placeholder="e.g. Continue Amlodipine 5mg daily"
            value={treatment}
            onChangeText={setTreatment}
          />
          <Input label="Notes (optional)" value={notes} onChangeText={setNotes} />

          {formError ? (
            <ThemedText themeColor="error" type="small">
              ⚠ {formError}
            </ThemedText>
          ) : null}

          <Button title={isEdit ? 'Save changes' : 'Save visit'} onPress={handleSave} loading={saving} />
        </ThemedView>

        {isEdit ? (
          <Pressable
            onPress={confirmDelete}
            disabled={deleting || saving}
            accessibilityRole="button"
            accessibilityLabel="Delete this visit"
            style={{ alignItems: 'center', padding: Spacing.two }}>
            <ThemedText themeColor="error">{deleting ? 'Deleting…' : 'Delete this visit'}</ThemedText>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}