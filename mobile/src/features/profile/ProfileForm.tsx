import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { updateProfile, errorMessage, isAuthError, type Profile } from '@/api';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip-group';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useFormState } from '@/hooks/useFormState';

import { BLOOD_GROUPS, validateProfile, type BloodGroup, type ProfileErrors } from './validation';

const asBloodGroup = (v: string | null): BloodGroup | null => BLOOD_GROUPS.find((g) => g === v) ?? null;

export function ProfileForm({ profile, onSaved }: { profile: Profile; onSaved: (profile: Profile) => void }) {
  const { values, set, bind } = useFormState({
    firstName: profile.first_name,
    lastName: profile.last_name,
    dob: profile.date_of_birth ?? '',
    gender: profile.gender ?? '',
    bloodGroup: asBloodGroup(profile.blood_group),
    contactName: profile.emergency_contact_name ?? '',
    contactPhone: profile.emergency_contact_phone ?? '',
  });
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setFormError('');
    const result = validateProfile(values);
    setErrors(result.errors);
    if (!result.input) return;

    setSaving(true);
    try {
      onSaved(await updateProfile(result.input));
    } catch (err) {
      if (!isAuthError(err)) setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.form}>
      <Input label="First name" error={errors.firstName} {...bind('firstName')} />
      <Input label="Last name" error={errors.lastName} {...bind('lastName')} />
      <Input
        label="Date of birth (optional)"
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        error={errors.dob}
        {...bind('dob')}
      />
      <Input label="Gender (optional)" placeholder="e.g. Female" {...bind('gender')} />
      <ChipGroup
        label="Blood group (optional)"
        options={BLOOD_GROUPS}
        value={values.bloodGroup}
        onChange={(g) => set('bloodGroup', g)}
        clearable
        format={(g) => g}
      />
      <Input label="Emergency contact name (optional)" {...bind('contactName')} />
      <Input
        label="Emergency contact phone (optional)"
        placeholder="+220 ..."
        keyboardType="phone-pad"
        {...bind('contactPhone')}
      />
      <FormError message={formError} />
      <Button title="Save changes" onPress={handleSave} loading={saving} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
});
