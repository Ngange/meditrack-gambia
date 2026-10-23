import type { Allergy, AllergyInput } from '../types/records';
import { createRecordApi } from './records';

export const allergiesApi = createRecordApi<Allergy, AllergyInput>('allergies', 'allergy');
