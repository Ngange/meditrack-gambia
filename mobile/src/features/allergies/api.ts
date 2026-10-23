import { createRecordApi } from '@/api';

import type { Allergy, AllergyInput } from './types';

export const allergyApi = createRecordApi<Allergy, AllergyInput>('allergies', 'allergy');
