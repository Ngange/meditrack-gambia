import { DATE_HINT, isRealDate, todayLocal } from '@/utils/dates';
import type { Validation } from '@/utils/validation';

import type { LabResultInput } from './types';

export type LabResultValues = {
  testName: string;
  testDate: string;
  result: string;
  referenceRange: string;
  facility: string;
};
export type LabResultErrors = { testName?: string; testDate?: string };

export function validateLabResult(v: LabResultValues): Validation<LabResultInput, LabResultErrors> {
  const errors: LabResultErrors = {};
  const date = v.testDate.trim();

  if (!v.testName.trim()) errors.testName = 'Test name is required.';
  if (!isRealDate(date)) errors.testDate = `${DATE_HINT}, e.g. 2026-03-02.`;
  else if (date > todayLocal()) errors.testDate = 'The test date cannot be in the future.';

  if (errors.testName || errors.testDate) return { input: null, errors };
  return {
    input: {
      testName: v.testName.trim(),
      testDate: date,
      result: v.result.trim(),
      referenceRange: v.referenceRange.trim(),
      facilityName: v.facility.trim(),
    },
    errors,
  };
}
