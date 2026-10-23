export const SEVERITIES = ['mild', 'moderate', 'severe'] as const;
export const ALLERGY_STATUSES = ['active', 'resolved'] as const;

export type Severity = (typeof SEVERITIES)[number];
export type AllergyStatus = (typeof ALLERGY_STATUSES)[number];

export type Allergy = {
  allergy_id: string;
  allergen: string;
  reaction: string | null;
  severity: Severity | null;
  status: AllergyStatus;
  created_at: string;
  updated_at: string;
};

export type AllergyInput = {
  allergen: string;
  reaction?: string;
  severity?: Severity | null;
  status?: AllergyStatus;
};
