export const CONDITION_STATUSES = ['active', 'resolved', 'chronic'] as const;

export type ConditionStatus = (typeof CONDITION_STATUSES)[number];

export type Condition = {
  condition_id: string;
  condition_name: string;
  diagnosis_date: string | null; // YYYY-MM-DD
  status: ConditionStatus;
  notes: string | null;
  visit_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ConditionInput = {
  conditionName: string;
  diagnosisDate?: string;
  status?: ConditionStatus;
  notes?: string;
  /** The visit this came from (null / missing = none). */
  visitId?: string | null;
};
