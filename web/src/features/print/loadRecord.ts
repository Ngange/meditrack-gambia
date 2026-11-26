import { request } from '../../api/client';
import type { Allergy, Condition, LabResult, MedicalDocument, Medication, Visit } from '../../types/records';

export type FullRecord = {
  allergies: Allergy[];
  conditions: Condition[];
  visits: Visit[];
  medications: Medication[];
  lab_results: LabResult[];
  documents: MedicalDocument[];
};

// Everything in one patient's record, for printing. base is '/records' for the patient themself,
// or '/provider/sessions/<id>/records' for a doctor with the patient open.
export async function loadFullRecord(base: string): Promise<FullRecord> {
  const [allergies, conditions, visits, medications, labs, documents] = await Promise.all([
    request<{ allergies: Allergy[] }>(`${base}/allergies`),
    request<{ conditions: Condition[] }>(`${base}/conditions`),
    request<{ visits: Visit[] }>(`${base}/visits`),
    request<{ medications: Medication[] }>(`${base}/medications`),
    request<{ lab_results: LabResult[] }>(`${base}/lab-results`),
    request<{ documents: MedicalDocument[] }>(`${base}/documents`),
  ]);
  return {
    allergies: allergies.allergies,
    conditions: conditions.conditions,
    visits: visits.visits,
    medications: medications.medications,
    lab_results: labs.lab_results,
    documents: documents.documents,
  };
}
