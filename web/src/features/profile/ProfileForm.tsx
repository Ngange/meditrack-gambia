import { useState, type FormEvent } from 'react';
import { FormRow } from '../../components/forms/FormRow';
import { SelectField } from '../../components/forms/SelectField';
import { TextField } from '../../components/forms/TextField';
import { useFormState } from '../../hooks/useFormState';
import type { MyProfile, ProfileInput } from '../../types/profile';
import { validateProfile } from './validation';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

type ProfileFormProps = {
  profile: MyProfile;
  saving: boolean;
  error: string;
  onSubmit: (input: ProfileInput) => void;
  onCancel: () => void;
};

export function ProfileForm({ profile, saving, error, onSubmit, onCancel }: ProfileFormProps) {
  const { values, bind } = useFormState({
    firstName: profile.first_name,
    lastName: profile.last_name,
    dob: profile.date_of_birth ?? '',
    gender: profile.gender ?? '',
    bloodGroup: profile.blood_group ?? '',
    contactName: profile.emergency_contact_name ?? '',
    contactPhone: profile.emergency_contact_phone ?? '',
  });
  const [localError, setLocalError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validateProfile(values);
    setLocalError(problem ?? '');
    if (problem) return;
    onSubmit({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      dateOfBirth: values.dob.trim(),
      gender: values.gender.trim(),
      bloodGroup: values.bloodGroup,
      emergencyContactName: values.contactName.trim(),
      emergencyContactPhone: values.contactPhone.trim(),
    });
  }

  const shownError = localError || error;

  return (
    <form className="a-form" onSubmit={handleSubmit} noValidate>
      <FormRow>
        <TextField label="First name" maxLength={100} {...bind('firstName')} />
        <TextField label="Last name" maxLength={100} {...bind('lastName')} />
      </FormRow>
      <FormRow>
        <TextField label="Date of birth (optional)" placeholder="YYYY-MM-DD" inputMode="numeric" maxLength={10} {...bind('dob')} />
        <TextField label="Gender (optional)" maxLength={20} {...bind('gender')} />
        <SelectField label="Blood group (optional)" options={BLOOD_GROUPS} raw placeholder="Not set" {...bind('bloodGroup')} />
      </FormRow>
      <FormRow>
        <TextField label="Emergency contact name (optional)" maxLength={150} {...bind('contactName')} />
        <TextField label="Emergency contact phone (optional)" placeholder="+220 ..." inputMode="tel" maxLength={30} {...bind('contactPhone')} />
      </FormRow>

      {shownError ? (
        <p className="a-error" role="alert">
          ⚠ {shownError}
        </p>
      ) : null}

      <div className="a-actions">
        <button type="submit" className="a-btn a-btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className="a-btn" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
