import { createRecordApi } from '@/api';
import { activeStore } from '@/offline/active';
import { createLabPanel } from '@/offline/local';

import type { LabPanelInput, LabResult, LabResultInput } from './types';

const base = createRecordApi<LabResult, LabResultInput>('lab_results');

export const labResultApi = {
  ...base,
  /** Saves every result of one lab visit together on the phone: all of them, or none. */
  createMany(input: LabPanelInput): Promise<LabResult[]> {
    return createLabPanel(activeStore(), input);
  },
};
