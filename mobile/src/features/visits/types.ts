import type { Condition } from '@/features/conditions/types';
import type { MedicalDocument } from '@/features/documents/types';
import type { LabResult } from '@/features/labs/types';
import type { Medication } from '@/features/medications/types';

export type Visit = {
  visit_id: string;
  facility_name: string | null;
  visit_date: string; // YYYY-MM-DD
  reason: string | null;
  diagnosis: string | null;
  treatment: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type VisitInput = {
  facilityName?: string;
  visitDate: string;
  reason?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
};

/** A visit saved together with the diagnoses, prescriptions and tests that came out of it. */
export type VisitBundleInput = {
  visit: VisitInput;
  conditions: { conditionName: string }[];
  medications: { medicationName: string; dosage?: string; frequency?: string }[];
  labResults: { testName: string; result?: string; referenceRange?: string }[];
};

export type VisitBundleResult = { visit: Visit; conditions: Condition[]; medications: Medication[]; lab_results: LabResult[] };

/** Everything linked to one visit. */
export type LinkedRecords = {
  conditions: Condition[];
  medications: Medication[];
  lab_results: LabResult[];
  documents: MedicalDocument[];
};
