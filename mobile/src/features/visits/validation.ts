import { DATE_HINT, isRealDate, todayLocal } from '@/utils/dates';
import type { Validation } from '@/utils/validation';

import type { VisitInput } from './types';

export type VisitValues = {
  facility: string;
  date: string;
  reason: string;
  diagnosis: string;
  treatment: string;
  notes: string;
};
export type VisitErrors = { date?: string; form?: string };

export function validateVisit(v: VisitValues): Validation<VisitInput, VisitErrors> {
  const date = v.date.trim();

  if (!isRealDate(date)) return { input: null, errors: { date: `${DATE_HINT}, e.g. 2026-02-14.` } };
  if (date > todayLocal()) return { input: null, errors: { date: 'The visit date cannot be in the future.' } };
  if (!v.facility.trim() && !v.reason.trim()) {
    return { input: null, errors: { form: 'Add the facility or the reason for the visit.' } };
  }

  return {
    input: {
      facilityName: v.facility.trim(),
      visitDate: date,
      reason: v.reason.trim(),
      diagnosis: v.diagnosis.trim(),
      treatment: v.treatment.trim(),
      notes: v.notes.trim(),
    },
    errors: {},
  };
}
