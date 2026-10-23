import { DATE_HINT, isRealDate } from '@/utils/dates';
import type { Validation } from '@/utils/validation';

import type { MedicationInput, MedicationStatus } from './types';

export type MedicationValues = {
  name: string;
  dosage: string;
  frequency: string;
  start: string;
  end: string;
  status: MedicationStatus;
  reminders: string[];
};
export type MedicationErrors = { name?: string; start?: string; end?: string };

export function validateMedication(v: MedicationValues): Validation<MedicationInput, MedicationErrors> {
  const errors: MedicationErrors = {};
  const start = v.start.trim();
  const end = v.end.trim();

  if (!v.name.trim()) errors.name = 'Medication name is required.';
  if (!isRealDate(start)) errors.start = `${DATE_HINT}, e.g. 2026-02-14.`;
  if (end && !isRealDate(end)) errors.end = `${DATE_HINT}, or leave it empty.`;
  else if (end && isRealDate(start) && end < start) errors.end = 'The end date cannot be before the start date.';

  if (errors.name || errors.start || errors.end) return { input: null, errors };
  return {
    input: {
      medicationName: v.name.trim(),
      dosage: v.dosage.trim(),
      frequency: v.frequency.trim(),
      startDate: start,
      endDate: end,
      status: v.status,
      reminderTimes: v.reminders,
    },
    errors,
  };
}
