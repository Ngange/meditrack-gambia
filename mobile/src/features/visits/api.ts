import { createRecordApi, request } from '@/api';

import type { LinkedRecords, Visit, VisitBundleInput, VisitBundleResult, VisitInput } from './types';

const base = createRecordApi<Visit, VisitInput>('visits', 'visit');

export const visitApi = {
  ...base,

  /** Saves the visit and its diagnoses, prescriptions and tests together: all of them, or none. */
  createWithRecords(bundle: VisitBundleInput) {
    return request<VisitBundleResult>('/records/visits/with-records', { method: 'POST', body: bundle });
  },

  /** What came out of this visit. */
  linked(id: string) {
    return request<LinkedRecords>(`/records/visits/${id}/linked`);
  },
};
