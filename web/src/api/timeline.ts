import type { TimelinePage } from '../features/timeline/types';
import { request } from './client';

export const PAGE_SIZE = 50;

export const timelineApi = {
  // A page of the history, newest first.
  page(offset = 0) {
    return request<TimelinePage>(`/records/timeline?limit=${PAGE_SIZE}&offset=${offset}`);
  },
};
