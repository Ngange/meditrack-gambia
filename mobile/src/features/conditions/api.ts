import { createRecordApi } from '@/api';

import type { Condition, ConditionInput } from './types';

export const conditionApi = createRecordApi<Condition, ConditionInput>('conditions', 'condition');
