import type { Validation } from '@/utils/validation';

import type { AllergyInput, AllergyStatus, Severity } from './types';

export type AllergyValues = {
  allergen: string;
  reaction: string;
  severity: Severity | null;
  status: AllergyStatus;
};

export type AllergyErrors = { allergen?: string };

export function validateAllergy(v: AllergyValues): Validation<AllergyInput, AllergyErrors> {
  if (!v.allergen.trim()) return { input: null, errors: { allergen: 'Allergen is required.' } };
  return {
    input: { allergen: v.allergen.trim(), reaction: v.reaction.trim(), severity: v.severity, status: v.status },
    errors: {},
  };
}
