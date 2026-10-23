import type { Visit, VisitInput } from '../types/records';
import { createRecordApi } from './records';

export const visitsApi = createRecordApi<Visit, VisitInput>('visits', 'visit');
