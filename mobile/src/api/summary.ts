import { request } from './client';

export type Summary = {
  allergies: number;
  conditions: number;
  visits: number;
  medications: number;
  lab_results: number;
  documents: number;
};

export const getSummary = async () => (await request<{ summary: Summary }>('/records/summary')).summary;
