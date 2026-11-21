import { isAuthError } from '@/api';
import { documentApi } from '@/features/documents/api';
import { showMessage } from '@/utils/notify';

import { visitApi } from './api';
import type { CheckedExtras } from './extras';
import type { VisitInput } from './types';

/**
 * Saves a visit with its diagnoses, prescriptions and tests (all or nothing), then uploads its
 * documents one by one. A document that fails does not undo the visit; the patient is told which
 * ones to add again.
 */
export async function saveVisitWithRecords(visit: VisitInput, extras: CheckedExtras) {
  const saved = await visitApi.createWithRecords({ visit, ...extras.records });

  const failed: string[] = [];
  for (const doc of extras.documents) {
    try {
      await documentApi.create({
        documentType: doc.type,
        file: doc.file,
        documentDate: visit.visitDate,
        visitId: saved.visit.visit_id,
      });
    } catch (err) {
      if (isAuthError(err)) throw err;
      failed.push(doc.file.name);
    }
  }

  if (failed.length > 0) {
    showMessage(
      'Visit saved',
      `The visit and its records were saved, but ${failed.length === 1 ? 'this document' : 'these documents'} could not be uploaded: ${failed.join(', ')}. You can add ${failed.length === 1 ? 'it' : 'them'} again from Documents and link ${failed.length === 1 ? 'it' : 'them'} to this visit.`,
    );
  }
}
