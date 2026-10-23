import { isRealDate, today } from '../../utils/dates';

type ProfileValues = { firstName: string; lastName: string; dob: string };

export function validateProfile(values: ProfileValues): string | null {
  if (!values.firstName.trim() || !values.lastName.trim()) return 'First name and last name are required.';
  const dob = values.dob.trim();
  if (dob && !isRealDate(dob)) return 'Enter a real date of birth in the format YYYY-MM-DD, e.g. 1998-07-21.';
  if (dob && dob > today()) return 'Date of birth cannot be in the future.';
  return null;
}
