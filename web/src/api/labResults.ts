import type { LabPanelInput, LabResult, LabResultInput } from '../types/records';
import { request } from './client';
import { createRecordApi } from './records';

const base = createRecordApi<LabResult, LabResultInput>('lab_results', 'lab_result', 'lab-results');

export const labResultsApi = {
  ...base,
  /** Saves every result of one lab visit together: all of them, or none. */
  async createMany(input: LabPanelInput) {
    const data = await request<{ lab_results: LabResult[] }>('/records/lab-results/batch', {
      method: 'POST',
      body: input,
    });
    return data.lab_results;
  },
};
