import { fileProblem } from '@/features/documents/validation';
import type { DocumentType, PickedFile } from '@/features/documents/types';

import type { VisitBundleInput } from './types';

// The extra rows on the "add visit" form: what came out of the visit. Each row has an id so the
// right row is updated or removed even when others are added or taken away.
export type DiagnosisDraft = { id: number; name: string };
export type PrescriptionDraft = { id: number; name: string; dosage: string; frequency: string };
export type TestDraft = { id: number; name: string; result: string; range: string };
export type DocumentDraft = { id: number; file: PickedFile; type: DocumentType };

export type Extras = {
  diagnoses: DiagnosisDraft[];
  prescriptions: PrescriptionDraft[];
  tests: TestDraft[];
  documents: DocumentDraft[];
};

let nextId = 1;
export const newId = () => nextId++;

export const emptyExtras = (): Extras => ({ diagnoses: [], prescriptions: [], tests: [], documents: [] });

export type CheckedExtras = {
  error?: string;
  records: Omit<VisitBundleInput, 'visit'>;
  documents: DocumentDraft[];
  /** True when nothing was added, so the plain visit save can be used. */
  isEmpty: boolean;
};

const blank = (...texts: string[]) => texts.every((t) => !t.trim());

/** Turns the typed rows into what the server expects. Completely empty rows are ignored. */
export function checkExtras(extras: Extras): CheckedExtras {
  const records: CheckedExtras['records'] = { conditions: [], medications: [], labResults: [] };
  const fail = (error: string): CheckedExtras => ({ error, records, documents: [], isEmpty: false });

  let n = 0;
  for (const d of extras.diagnoses) {
    n++;
    if (blank(d.name)) continue;
    records.conditions.push({ conditionName: d.name.trim() });
  }
  n = 0;
  for (const p of extras.prescriptions) {
    n++;
    if (blank(p.name, p.dosage, p.frequency)) continue;
    if (blank(p.name)) return fail(`Prescription ${n} needs a medicine name.`);
    records.medications.push({ medicationName: p.name.trim(), dosage: p.dosage.trim(), frequency: p.frequency.trim() });
  }
  n = 0;
  for (const t of extras.tests) {
    n++;
    if (blank(t.name, t.result, t.range)) continue;
    if (blank(t.name)) return fail(`Test ${n} needs a test name.`);
    records.labResults.push({ testName: t.name.trim(), result: t.result.trim(), referenceRange: t.range.trim() });
  }
  for (const d of extras.documents) {
    const problem = fileProblem(d.file);
    if (problem) return fail(`${d.file.name}: ${problem}`);
  }

  const isEmpty =
    records.conditions.length + records.medications.length + records.labResults.length + extras.documents.length === 0;
  return { records, documents: extras.documents, isEmpty };
}
