import type { Medication, MedicationInput } from '../types/records';
import { createRecordApi } from './records';

export const medicationsApi = createRecordApi<Medication, MedicationInput>('medications', 'medication');
