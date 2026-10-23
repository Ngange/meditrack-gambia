import { createRecordApi } from '@/api';
import { syncReminders } from '@/services/reminders';

import type { Medication, MedicationInput } from './types';

const base = createRecordApi<Medication, MedicationInput>('medications', 'medication');

export const medicationApi = {
  ...base,
  // Every time the list is loaded (including after a save or delete, when the screen regains focus),
  // the phone's reminders are brought in line with it.
  async list() {
    const medications = await base.list();
    void syncReminders(medications);
    return medications;
  },
};
