import type { Condition, ConditionInput } from '../types/records';
import { createRecordApi } from './records';

export const conditionsApi = createRecordApi<Condition, ConditionInput>('conditions', 'condition');
