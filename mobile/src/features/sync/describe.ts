import type { AnyRecord, WritableType } from '@/offline/types';

export const TYPE_LABEL: Record<WritableType, string> = {
  allergies: 'Allergy',
  conditions: 'Condition',
  visits: 'Visit',
  medications: 'Medication',
  lab_results: 'Lab result',
};

/** The fields worth showing for each kind, in the server's names, with the words the patient sees. */
export const FIELDS: Record<WritableType, [key: string, label: string][]> = {
  allergies: [['allergen', 'Allergen'], ['reaction', 'Reaction'], ['severity', 'Severity'], ['status', 'Status']],
  conditions: [['condition_name', 'Condition'], ['diagnosis_date', 'Diagnosed'], ['status', 'Status'], ['notes', 'Notes']],
  visits: [['facility_name', 'Place'], ['visit_date', 'Date'], ['reason', 'Reason'], ['diagnosis', 'Diagnosis'], ['treatment', 'Treatment'], ['notes', 'Notes']],
  medications: [['medication_name', 'Medicine'], ['dosage', 'Dosage'], ['frequency', 'Frequency'], ['start_date', 'Started'], ['end_date', 'Ended'], ['status', 'Status'], ['reminder_times', 'Reminders']],
  lab_results: [['test_name', 'Test'], ['test_date', 'Date'], ['result', 'Result'], ['reference_range', 'Normal range'], ['facility_name', 'Lab']],
};

const TITLE_KEY: Record<WritableType, string> = {
  allergies: 'allergen',
  conditions: 'condition_name',
  visits: 'visit_date',
  medications: 'medication_name',
  lab_results: 'test_name',
};
// The same, for the details a patient typed (what was sent), which use the form's names.
const INPUT_TITLE_KEY: Record<WritableType, string> = {
  allergies: 'allergen',
  conditions: 'conditionName',
  visits: 'visitDate',
  medications: 'medicationName',
  lab_results: 'testName',
};

const show = (v: unknown) => (Array.isArray(v) ? v.join(', ') : v === null || v === undefined || v === '' ? '—' : String(v));

export const titleOf = (type: WritableType, record: AnyRecord | null) => (record ? show(record[TITLE_KEY[type]]) : '');
export const titleOfInput = (type: WritableType, data: Record<string, unknown> | null) => (data ? show(data[INPUT_TITLE_KEY[type]]) : '');

/** The fields that differ between the patient's version and the server's. */
export function differences(type: WritableType, mine: AnyRecord | null, theirs: AnyRecord) {
  return FIELDS[type]
    .map(([key, label]) => ({ label, mine: show(mine?.[key]), theirs: show(theirs[key]) }))
    .filter((f) => f.mine !== f.theirs);
}

export function lines(type: WritableType, record: AnyRecord) {
  return FIELDS[type].map(([key, label]) => ({ label, value: show(record[key]) })).filter((l) => l.value !== '—');
}

/** "just now", "5 minutes ago", "2 days ago". */
export function ago(iso: string | number | null, now = Date.now()) {
  if (iso === null) return 'never';
  const secs = Math.max(0, Math.round((now - (typeof iso === 'number' ? iso : Date.parse(iso))) / 1000));
  if (secs < 45) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
