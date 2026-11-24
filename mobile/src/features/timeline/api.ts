import { activeStore } from '@/offline/active';
import { timelinePage } from '@/offline/local';

import type { TimelinePage } from './types';

export const PAGE_SIZE = 50;

export const timelineApi = {
  /** A page of the history, newest first, built from the phone's saved records. */
  page(offset = 0): Promise<TimelinePage> {
    return timelinePage(activeStore(), offset, PAGE_SIZE);
  },
};
