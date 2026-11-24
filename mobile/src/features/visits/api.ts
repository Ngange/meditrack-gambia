import { createRecordApi } from '@/api';
import { activeStore } from '@/offline/active';
import { createVisitWithRecords, linked } from '@/offline/local';

import type { LinkedRecords, Visit, VisitBundleInput, VisitBundleResult, VisitInput } from './types';

const base = createRecordApi<Visit, VisitInput>('visits');

export const visitApi = {
  ...base,

  /** Saves the visit and its diagnoses, prescriptions and tests together on the phone: all of them, or none. */
  createWithRecords(bundle: VisitBundleInput): Promise<VisitBundleResult> {
    return createVisitWithRecords(activeStore(), bundle);
  },

  /** What came out of this visit. */
  linked(id: string): Promise<LinkedRecords> {
    return linked(activeStore(), id);
  },
};
