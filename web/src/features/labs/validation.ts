import { today } from '../../utils/dates';

export function validateLabResult(values: { testName: string; testDate: string }): string | null {
  if (!values.testName.trim()) return 'Test name is required.';
  if (!values.testDate) return 'Test date is required.';
  if (values.testDate > today()) return 'The test date cannot be in the future.';
  return null;
}
