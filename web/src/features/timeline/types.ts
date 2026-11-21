import type { Condition, LabResult, Medication, MedicalDocument, Visit } from '../../types/records';

// One entry on the timeline. A visit carries what came out of it; the others stand alone.
export type TimelineEvent =
  | { kind: 'visit'; key: string; date: string; visit: Visit; conditions: Condition[]; medications: Medication[]; lab_results: LabResult[]; documents: MedicalDocument[] }
  | { kind: 'condition'; key: string; date: string; condition: Condition }
  | { kind: 'medication'; key: string; date: string; medication: Medication }
  | { kind: 'lab_panel'; key: string; date: string; facility_name: string | null; lab_results: LabResult[] }
  | { kind: 'document'; key: string; date: string; document: MedicalDocument };

export type TimelinePage = { timeline: TimelineEvent[]; total: number; hasMore: boolean };
export type TimelineKind = TimelineEvent['kind'];
