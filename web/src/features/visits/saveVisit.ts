import { isAuthError } from '../../api/client';
import { documentsApi } from '../../api/documents';
import { visitsApi } from '../../api/visits';
import type { RecordApi } from '../../api/records';
import type { Visit, VisitInput } from '../../types/records';
import type { CheckedExtras } from './extras';

/** What the visit form hands over: the visit, plus (for a new visit) what came out of it. */
export type VisitFormInput = VisitInput & { extras?: CheckedExtras };

// Saves a visit with its diagnoses, prescriptions and tests (all or nothing), then uploads its
// documents one by one. A document that fails does not undo the visit; the patient is told which
// ones to add again.
async function createVisit({ extras, ...visit }: VisitFormInput): Promise<Visit> {
  if (!extras || extras.isEmpty) return visitsApi.create(visit);

  const saved = await visitsApi.createWithRecords({ visit, ...extras.records });

  const failed: string[] = [];
  for (const doc of extras.documents) {
    try {
      await documentsApi.create({ documentType: doc.type, file: doc.file, documentDate: visit.visitDate, visitId: saved.visit.visit_id });
    } catch (err) {
      if (isAuthError(err)) throw err;
      failed.push(doc.file.name);
    }
  }
  if (failed.length > 0) {
    const many = failed.length > 1;
    window.alert(
      `The visit and its records were saved, but ${many ? 'these documents' : 'this document'} could not be uploaded: ${failed.join(', ')}. ` +
        `You can add ${many ? 'them' : 'it'} again from Documents and link ${many ? 'them' : 'it'} to this visit.`,
    );
  }
  return saved.visit;
}

export const visitFormApi: RecordApi<Visit, VisitFormInput> = {
  list: visitsApi.list,
  create: createVisit,
  update: (id, input) => visitsApi.update(id, input),
  remove: visitsApi.remove,
};
