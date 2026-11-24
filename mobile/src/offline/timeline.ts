import type { Condition } from '@/features/conditions/types';
import type { MedicalDocument } from '@/features/documents/types';
import type { LabResult } from '@/features/labs/types';
import type { Medication } from '@/features/medications/types';
import type { TimelineEvent } from '@/features/timeline/types';
import type { Visit } from '@/features/visits/types';

// The patient's history as one dated list, newest first, built on the phone from the saved records.
// The same rules as the server's backend/src/utils/timeline.js (a test compares the two):
//  - a visit carries everything linked to it; other records stand alone at their own date;
//  - lab results with no visit, same day and same lab, are shown as one panel.

const KIND_ORDER = { visit: 0, lab_panel: 1, condition: 2, medication: 3, document: 4 } as const;

const dayOf = (v: string) => (typeof v === 'string' ? v.slice(0, 10) : new Date(v).toISOString().slice(0, 10));

function groupByVisit<T extends { visit_id: string | null }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.visit_id) continue;
    const list = map.get(row.visit_id) ?? [];
    list.push(row);
    map.set(row.visit_id, list);
  }
  return map;
}

export function buildTimeline(data: {
  visits: Visit[];
  conditions: Condition[];
  medications: Medication[];
  labResults: LabResult[];
  documents: MedicalDocument[];
}): TimelineEvent[] {
  const { visits, conditions, medications, labResults, documents } = data;
  const events: TimelineEvent[] = [];
  const known = new Set(visits.map((v) => v.visit_id));
  const linked = (row: { visit_id: string | null }) => !!row.visit_id && known.has(row.visit_id);

  const c = groupByVisit(conditions);
  const m = groupByVisit(medications);
  const l = groupByVisit(labResults);
  const d = groupByVisit(documents);

  for (const v of visits) {
    events.push({
      kind: 'visit',
      key: `visit:${v.visit_id}`,
      date: v.visit_date,
      visit: v,
      conditions: c.get(v.visit_id) ?? [],
      medications: m.get(v.visit_id) ?? [],
      lab_results: l.get(v.visit_id) ?? [],
      documents: d.get(v.visit_id) ?? [],
    });
  }
  for (const row of conditions) {
    if (linked(row)) continue;
    events.push({ kind: 'condition', key: `condition:${row.condition_id}`, date: row.diagnosis_date || dayOf(row.created_at), condition: row });
  }
  for (const row of medications) {
    if (linked(row)) continue;
    events.push({ kind: 'medication', key: `medication:${row.medication_id}`, date: row.start_date, medication: row });
  }
  for (const row of documents) {
    if (linked(row)) continue;
    events.push({ kind: 'document', key: `document:${row.document_id}`, date: row.document_date || dayOf(row.upload_date), document: row });
  }

  const panels = new Map<string, Extract<TimelineEvent, { kind: 'lab_panel' }>>();
  for (const row of labResults) {
    if (linked(row)) continue;
    const key = `${row.test_date}|${row.facility_name ?? ''}`;
    if (!panels.has(key)) {
      panels.set(key, { kind: 'lab_panel', key: `lab_panel:${key}`, date: row.test_date, facility_name: row.facility_name ?? null, lab_results: [] });
    }
    panels.get(key)!.lab_results.push(row);
  }
  events.push(...panels.values());

  return events.sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.key < b.key ? -1 : 1),
  );
}
