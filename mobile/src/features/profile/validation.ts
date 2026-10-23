import type { ProfileInput } from '@/api';
import { DATE_HINT, isRealDate, todayLocal } from '@/utils/dates';
import type { Validation } from '@/utils/validation';

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export type ProfileValues = {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  bloodGroup: BloodGroup | null;
  contactName: string;
  contactPhone: string;
};
export type ProfileErrors = { firstName?: string; lastName?: string; dob?: string };

export function validateProfile(v: ProfileValues): Validation<ProfileInput, ProfileErrors> {
  const errors: ProfileErrors = {};
  const dob = v.dob.trim();

  if (!v.firstName.trim()) errors.firstName = 'First name is required.';
  if (!v.lastName.trim()) errors.lastName = 'Last name is required.';
  if (dob && !isRealDate(dob)) errors.dob = `${DATE_HINT}, e.g. 1998-07-21.`;
  else if (dob && dob > todayLocal()) errors.dob = 'Date of birth cannot be in the future.';

  if (errors.firstName || errors.lastName || errors.dob) return { input: null, errors };
  return {
    input: {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      dateOfBirth: dob,
      gender: v.gender.trim(),
      bloodGroup: v.bloodGroup ?? '',
      emergencyContactName: v.contactName.trim(),
      emergencyContactPhone: v.contactPhone.trim(),
    },
    errors,
  };
}
