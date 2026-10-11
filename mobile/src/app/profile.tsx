import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { getProfile, updateProfile, type Profile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getToken } from '@/lib/auth-storage';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// True only for a real calendar date written as YYYY-MM-DD (rejects 1998-02-30, 1998-2-3, ...).
function isRealDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// "1998-07-21" -> "21 Jul 1998" (done by hand so it never depends on device locale or timezone)
function formatDate(s: string) {
  const [y, m, d] = s.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText themeColor={value ? undefined : 'textSecondary'}>{value ?? 'Not provided'}</ThemedText>
    </ThemedView>
  );
}

type FieldErrors = { firstName?: string; lastName?: string; dob?: string };

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAuthFailure(err: unknown) {
    const s = (err as any).status;
    if (s === 401 || s === 403) {
      await signOutRef.current();
      return true;
    }
    return false;
  }

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const token = await getToken();
      if (!token) {
        await signOutRef.current();
        return;
      }
      const result = await getProfile(token);
      setProfile(result.profile);
    } catch (err) {
      const s = (err as any).status;
      if (s === 401 || s === 403) {
        await signOutRef.current();
        return;
      }
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit() {
    if (!profile) return;
    setFirstName(profile.first_name);
    setLastName(profile.last_name);
    setDob(profile.date_of_birth ?? '');
    setGender(profile.gender ?? '');
    setBloodGroup(profile.blood_group ?? '');
    setContactName(profile.emergency_contact_name ?? '');
    setContactPhone(profile.emergency_contact_phone ?? '');
    setErrors({});
    setFormError('');
    setEditing(true);
  }

  async function handleSave() {
    setFormError('');
    const next: FieldErrors = {};
    if (!firstName.trim()) next.firstName = 'First name is required.';
    if (!lastName.trim()) next.lastName = 'Last name is required.';
    const d = dob.trim();
    if (d && !isRealDate(d)) {
      next.dob = 'Enter a real date in the format YYYY-MM-DD, e.g. 1998-07-21.';
    } else if (d && d > new Date().toISOString().slice(0, 10)) {
      next.dob = 'Date of birth cannot be in the future.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const token = await getToken();
      if (!token) {
        await signOutRef.current();
        return;
      }
      const result = await updateProfile(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: d,
        gender: gender.trim(),
        bloodGroup,
        emergencyContactName: contactName.trim(),
        emergencyContactPhone: contactPhone.trim(),
      });
      setProfile(result.profile);
      setEditing(false);
    } catch (err) {
      if (await handleAuthFailure(err)) return;
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedView style={{ gap: Spacing.two }}>
            <Pressable
              onPress={() => (editing ? setEditing(false) : router.back())}
              accessibilityRole="button"
              accessibilityLabel={editing ? 'Cancel editing' : 'Go back'}>
              <ThemedText type="linkPrimary">{editing ? '‹ Cancel' : '‹ Back'}</ThemedText>
            </Pressable>
            <ThemedText type="title">{editing ? 'Edit profile' : 'My profile'}</ThemedText>
          </ThemedView>

          {loading ? (
            <ActivityIndicator style={{ marginTop: Spacing.five }} />
          ) : loadError || !profile ? (
            <ThemedView style={{ gap: Spacing.three }}>
              <ThemedText themeColor="error">⚠ {loadError || 'Profile not found.'}</ThemedText>
              <Button title="Try again" onPress={load} />
            </ThemedView>
          ) : editing ? (
            <ThemedView style={{ gap: Spacing.three }}>
              <Input label="First name" value={firstName} onChangeText={setFirstName} error={errors.firstName} />
              <Input label="Last name" value={lastName} onChangeText={setLastName} error={errors.lastName} />
              <Input
                label="Date of birth (optional)"
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                value={dob}
                onChangeText={setDob}
                error={errors.dob}
              />
              <Input label="Gender (optional)" placeholder="e.g. Female" value={gender} onChangeText={setGender} />

              <ThemedView style={{ gap: Spacing.two }}>
                <ThemedText type="smallBold">Blood group (optional)</ThemedText>
                <ThemedView style={styles.chipRow}>
                  {BLOOD_GROUPS.map((g) => (
                    <Chip
                      key={g}
                      label={g}
                      selected={bloodGroup === g}
                      onPress={() => setBloodGroup(bloodGroup === g ? '' : g)}
                    />
                  ))}
                </ThemedView>
              </ThemedView>

              <Input
                label="Emergency contact name (optional)"
                value={contactName}
                onChangeText={setContactName}
              />
              <Input
                label="Emergency contact phone (optional)"
                placeholder="+220 ..."
                keyboardType="phone-pad"
                value={contactPhone}
                onChangeText={setContactPhone}
              />

              {formError ? (
                <ThemedText themeColor="error" type="small">
                  ⚠ {formError}
                </ThemedText>
              ) : null}

              <Button title="Save changes" onPress={handleSave} loading={saving} />
            </ThemedView>
          ) : (
            <ThemedView style={{ gap: Spacing.two }}>
              <Row label="First name" value={profile.first_name} />
              <Row label="Last name" value={profile.last_name} />
              <Row label="Date of birth" value={profile.date_of_birth ? formatDate(profile.date_of_birth) : null} />
              <Row label="Gender" value={profile.gender} />
              <Row label="Blood group" value={profile.blood_group} />
              <Row label="Emergency contact" value={profile.emergency_contact_name} />
              <Row label="Emergency phone" value={profile.emergency_contact_phone} />
              <ThemedView style={{ marginTop: Spacing.two }}>
                <Button title="Edit profile" onPress={startEdit} />
              </ThemedView>
            </ThemedView>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  row: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  chipRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
});