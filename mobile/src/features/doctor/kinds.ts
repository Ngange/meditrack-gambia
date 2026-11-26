import type { KindKey } from '@/doctor/api';

export type Field = {
  key: string; // the server's field name
  label: string;
  type: 'text' | 'multiline' | 'date' | 'choice';
  required?: boolean;
  options?: readonly string[];
  /** The record's own property this field is read from when editing. */
  from: string;
  placeholder?: string;
};

export type Kind = {
  key: KindKey;
  label: string; // "Allergies"
  noun: string; // "allergy"
  fields: Field[];
  title: (r: Record<string, unknown>) => string;
  lines: (r: Record<string, unknown>) => string[];
  /** Server fields an edit must send back unchanged, or the server would clear them. */
  keep?: Record<string, string>;
};

const s = (v: unknown) => (typeof v === 'string' ? v : '');
const join = (...parts: unknown[]) => parts.map(s).filter(Boolean).join(' · ');

export const KINDS: Kind[] = [
  {
    key: 'allergies',
    label: 'Allergies',
    noun: 'allergy',
    fields: [
      { key: 'allergen', from: 'allergen', label: 'Allergen', type: 'text', required: true, placeholder: 'e.g. Penicillin' },
      { key: 'reaction', from: 'reaction', label: 'Reaction (optional)', type: 'text' },
      { key: 'severity', from: 'severity', label: 'Severity (optional)', type: 'choice', options: ['mild', 'moderate', 'severe'] },
      { key: 'status', from: 'status', label: 'Status', type: 'choice', options: ['active', 'resolved'] },
    ],
    title: (r) => s(r.allergen),
    lines: (r) => [join(r.reaction, r.severity, r.status)],
  },
  {
    key: 'conditions',
    label: 'Conditions',
    noun: 'condition',
    fields: [
      { key: 'conditionName', from: 'condition_name', label: 'Condition', type: 'text', required: true },
      { key: 'diagnosisDate', from: 'diagnosis_date', label: 'Diagnosis date (YYYY-MM-DD, optional)', type: 'date' },
      { key: 'status', from: 'status', label: 'Status', type: 'choice', options: ['active', 'chronic', 'resolved'] },
      { key: 'notes', from: 'notes', label: 'Notes (optional)', type: 'multiline' },
    ],
    keep: { visitId: 'visit_id' },
    title: (r) => s(r.condition_name),
    lines: (r) => [join(r.diagnosis_date, r.status), s(r.notes)],
  },
  {
    key: 'visits',
    label: 'Visits',
    noun: 'visit',
    fields: [
      { key: 'visitDate', from: 'visit_date', label: 'Visit date (YYYY-MM-DD)', type: 'date', required: true },
      { key: 'facilityName', from: 'facility_name', label: 'Facility (optional)', type: 'text' },
      { key: 'reason', from: 'reason', label: 'Reason (optional)', type: 'text' },
      { key: 'diagnosis', from: 'diagnosis', label: 'Diagnosis (optional)', type: 'text' },
      { key: 'treatment', from: 'treatment', label: 'Treatment (optional)', type: 'multiline' },
      { key: 'notes', from: 'notes', label: 'Notes (optional)', type: 'multiline' },
    ],
    title: (r) => join(r.visit_date, r.facility_name) || 'Visit',
    lines: (r) => [s(r.reason), s(r.diagnosis), s(r.treatment)],
  },
  {
    key: 'medications',
    label: 'Medications',
    noun: 'medication',
    fields: [
      { key: 'medicationName', from: 'medication_name', label: 'Medication', type: 'text', required: true },
      { key: 'dosage', from: 'dosage', label: 'Dosage (optional)', type: 'text', placeholder: 'e.g. 500 mg' },
      { key: 'frequency', from: 'frequency', label: 'Frequency (optional)', type: 'text', placeholder: 'e.g. twice a day' },
      { key: 'startDate', from: 'start_date', label: 'Start date (YYYY-MM-DD)', type: 'date', required: true },
      { key: 'endDate', from: 'end_date', label: 'End date (YYYY-MM-DD, optional)', type: 'date' },
      { key: 'status', from: 'status', label: 'Status', type: 'choice', options: ['active', 'completed', 'discontinued'] },
    ],
    keep: { visitId: 'visit_id', reminderTimes: 'reminder_times' },
    title: (r) => s(r.medication_name),
    lines: (r) => [join(r.dosage, r.frequency), join(r.start_date, r.status)],
  },
  {
    key: 'lab_results',
    label: 'Lab results',
    noun: 'lab result',
    fields: [
      { key: 'testName', from: 'test_name', label: 'Test', type: 'text', required: true, placeholder: 'e.g. Haemoglobin' },
      { key: 'testDate', from: 'test_date', label: 'Test date (YYYY-MM-DD)', type: 'date', required: true },
      { key: 'result', from: 'result', label: 'Result (optional)', type: 'text' },
      { key: 'referenceRange', from: 'reference_range', label: 'Normal range (optional)', type: 'text' },
      { key: 'facilityName', from: 'facility_name', label: 'Lab (optional)', type: 'text' },
    ],
    keep: { visitId: 'visit_id' },
    title: (r) => s(r.test_name),
    lines: (r) => [join(r.result, r.reference_range && `(${s(r.reference_range)})`), s(r.test_date)],
  },
];

export const kindOf = (key: string) => KINDS.find((k) => k.key === key) ?? KINDS[0];
