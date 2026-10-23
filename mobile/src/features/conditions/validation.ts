import { DATE_HINT, isRealDate } from '@/utils/dates';
import type { Validation } from '@/utils/validation';

import type { ConditionInput, ConditionStatus } from './types';

export type ConditionValues = { name: string; date: string; notes: string; status: ConditionStatus };
export type ConditionErrors = { name?: string; date?: string };

export function validateCondition(v: ConditionValues): Validation<ConditionInput, ConditionErrors> {
  const errors: ConditionErrors = {};
  const date = v.date.trim();

  if (!v.name.trim()) errors.name = 'Condition name is required.';
  if (date && !isRealDate(date)) errors.date = `${DATE_HINT}, e.g. 2019-03-14.`;

  if (errors.name || errors.date) return { input: null, errors };
  return {
    input: { conditionName: v.name.trim(), diagnosisDate: date, status: v.status, notes: v.notes.trim() },
    errors,
  };
}
