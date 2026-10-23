import { createRecordApi, request } from '@/api';

import type { LabPanelInput, LabResult, LabResultInput } from './types';

const base = createRecordApi<LabResult, LabResultInput>('lab_results', 'lab_result', 'lab-results');

export const labResultApi = {
  ...base,
  /** Saves every result of one lab visit together: all of them, or none. */
  async createMany(input: LabPanelInput) {
    const res = await request<{ lab_results: LabResult[] }>('/records/lab-results/batch', {
      method: 'POST',
      body: input,
    });
    return res.lab_results;
  },
};
