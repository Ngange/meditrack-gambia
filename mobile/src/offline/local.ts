import type { Condition } from '@/features/conditions/types';
import type { MedicalDocument } from '@/features/documents/types';
import type { LabResult } from '@/features/labs/types';
import type { Medication } from '@/features/medications/types';
import type { TimelinePage } from '@/features/timeline/types';
import type {
  LinkedRecords,
  Visit,
  VisitBundleInput,
  VisitBundleResult,
} from '@/features/visits/types';

import type { LocalStore } from './store';
import { buildTimeline } from './timeline';
import type { AnyRecord, RecordType, WritableType } from './types';

/** What the screens ask for, answered from the phone's own copy. Everything here works with no connection. */

export const listRecords = <T>(store: LocalStore, type: RecordType) => store.list<T>(type);

export async function summary(store: LocalStore) {
  const n = await store.counts();
  const [a, c, m] = await Promise.all([
    store.list<{ status: string }>('allergies'),
    store.list<{ status: string }>('conditions'),
    store.list<{ status: string }>('medications'),
  ]);
  const on = (rows: { status: string }[]) => rows.filter((r) => r.status === 'active' || r.status === 'chronic').length;
  return { active: { allergies: on(a), conditions: on(c), medications: on(m) }, allergies: n.allergies, conditions: n.conditions, visits: n.visits, medications: n.medications, lab_results: n.lab_results, documents: n.documents };
}

export async function timelinePage(store: LocalStore, offset: number, limit: number): Promise<TimelinePage> {
  const [visits, conditions, medications, labResults, documents] = await Promise.all([
    store.list<Visit>('visits'),
    store.list<Condition>('conditions'),
    store.list<Medication>('medications'),
    store.list<LabResult>('lab_results'),
    store.list<MedicalDocument>('documents'),
  ]);
  const all = buildTimeline({ visits, conditions, medications, labResults, documents });
  const timeline = all.slice(offset, offset + limit);
  return { timeline, total: all.length, hasMore: offset + timeline.length < all.length };
}

export async function linked(store: LocalStore, visitId: string): Promise<LinkedRecords> {
  const of = <T extends { visit_id: string | null }>(rows: T[]) => rows.filter((r) => r.visit_id === visitId);
  return {
    conditions: of(await store.list<Condition>('conditions')),
    medications: of(await store.list<Medication>('medications')),
    lab_results: of(await store.list<LabResult>('lab_results')),
    documents: of(await store.list<MedicalDocument>('documents')),
  };
}

/** A visit with its diagnoses, medicines and tests, saved together on the phone. */
export async function createVisitWithRecords(store: LocalStore, b: VisitBundleInput): Promise<VisitBundleResult> {
  const count = 1 + b.conditions.length + b.medications.length + b.labResults.length;
  const made = await store.createMany((ids) => {
    const visitId = ids[0];
    let i = 1;
    const items: { type: WritableType; input: Record<string, unknown> }[] = [{ type: 'visits', input: { ...b.visit } }];
    for (const c of b.conditions) items.push({ type: 'conditions', input: { ...c, status: 'active', diagnosisDate: b.visit.visitDate, visitId } }), i++;
    for (const m of b.medications) items.push({ type: 'medications', input: { ...m, startDate: b.visit.visitDate, status: 'active', visitId } }), i++;
    for (const l of b.labResults) items.push({ type: 'lab_results', input: { ...l, testDate: b.visit.visitDate, facilityName: b.visit.facilityName, visitId } }), i++;
    void i;
    return items;
  }, count);
  const nC = b.conditions.length;
  const nM = b.medications.length;
  return {
    visit: made[0] as unknown as Visit,
    conditions: made.slice(1, 1 + nC) as unknown as Condition[],
    medications: made.slice(1 + nC, 1 + nC + nM) as unknown as Medication[],
    lab_results: made.slice(1 + nC + nM) as unknown as LabResult[],
  };
}

export async function createLabPanel(
  store: LocalStore,
  input: { testDate: string; facilityName?: string; visitId?: string | null; results: { testName: string; result?: string; referenceRange?: string }[] },
): Promise<LabResult[]> {
  const made = await store.createMany(
    () => input.results.map((r) => ({ type: 'lab_results' as const, input: { ...r, testDate: input.testDate, facilityName: input.facilityName, visitId: input.visitId ?? null } })),
    input.results.length,
  );
  return made as unknown as LabResult[];
}

export type { AnyRecord };
