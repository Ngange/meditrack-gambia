import { ID_KEY, type AnyRecord, type WritableType } from './types';

const text = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

/**
 * What the server would store for this input, in the shape it sends records back in. Used for records
 * saved while offline, so the screens can show them straight away. The server re-checks everything when
 * the change is synced, and its version replaces this one.
 */
export function buildRecord(
  type: WritableType,
  id: string,
  input: Record<string, unknown>,
  now: string,
  existing?: AnyRecord | null,
): AnyRecord {
  const meta = { created_at: existing?.created_at ?? now, updated_at: now };
  const visit_id = (input.visitId as string | null | undefined) ?? null;
  const keep = existing?.entered_by ? { entered_by: existing.entered_by } : {};
  switch (type) {
    case 'allergies':
      return {
        [ID_KEY[type]]: id,
        allergen: text(input.allergen) ?? '',
        reaction: text(input.reaction),
        severity: (input.severity as string | null | undefined) || null,
        status: (input.status as string | undefined) || 'active',
        ...meta,
        ...keep,
      };
    case 'conditions':
      return {
        [ID_KEY[type]]: id,
        condition_name: text(input.conditionName) ?? '',
        diagnosis_date: text(input.diagnosisDate),
        status: (input.status as string | undefined) || 'active',
        notes: text(input.notes),
        visit_id,
        ...meta,
        ...keep,
      };
    case 'visits':
      return {
        [ID_KEY[type]]: id,
        facility_name: text(input.facilityName),
        visit_date: text(input.visitDate) ?? '',
        reason: text(input.reason),
        diagnosis: text(input.diagnosis),
        treatment: text(input.treatment),
        notes: text(input.notes),
        ...meta,
        ...keep,
      };
    case 'medications': {
      const times = Array.isArray(input.reminderTimes) ? [...new Set(input.reminderTimes as string[])].sort() : [];
      return {
        [ID_KEY[type]]: id,
        medication_name: text(input.medicationName) ?? '',
        dosage: text(input.dosage),
        frequency: text(input.frequency),
        start_date: text(input.startDate) ?? '',
        end_date: text(input.endDate),
        status: (input.status as string | undefined) || 'active',
        reminder_times: times,
        visit_id,
        ...meta,
        ...keep,
      };
    }
    case 'lab_results':
      return {
        [ID_KEY[type]]: id,
        test_name: text(input.testName) ?? '',
        test_date: text(input.testDate) ?? '',
        result: text(input.result),
        reference_range: text(input.referenceRange),
        facility_name: text(input.facilityName),
        visit_id,
        ...meta,
        ...keep,
      };
  }
}

/** Newest first, the same order the server lists each kind in. */
export function compareRecords(type: WritableType | 'documents') {
  const s = (v: unknown) => (typeof v === 'string' ? v : '');
  const desc = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0);
  return (a: AnyRecord, b: AnyRecord): number => {
    switch (type) {
      case 'allergies':
        return desc(s(a.created_at), s(b.created_at));
      case 'conditions': {
        // Records with no date go last.
        const da = s(a.diagnosis_date), db = s(b.diagnosis_date);
        if (!da !== !db) return da ? -1 : 1;
        return desc(da, db) || desc(s(a.created_at), s(b.created_at));
      }
      case 'visits':
        return desc(s(a.visit_date), s(b.visit_date)) || desc(s(a.created_at), s(b.created_at));
      case 'lab_results':
        return desc(s(a.test_date), s(b.test_date)) || desc(s(a.created_at), s(b.created_at));
      case 'medications': {
        const aa = a.status === 'active' ? 1 : 0, bb = b.status === 'active' ? 1 : 0;
        if (aa !== bb) return bb - aa;
        return desc(s(a.start_date), s(b.start_date)) || desc(s(a.created_at), s(b.created_at));
      }
      case 'documents': {
        const ka = s(a.document_date) || s(a.upload_date).slice(0, 10);
        const kb = s(b.document_date) || s(b.upload_date).slice(0, 10);
        return desc(ka, kb) || desc(s(a.upload_date), s(b.upload_date));
      }
    }
  };
}
