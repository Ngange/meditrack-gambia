import { createRecordApi } from '@/api';

import type { Visit, VisitInput } from './types';

export const visitApi = createRecordApi<Visit, VisitInput>('visits', 'visit');
