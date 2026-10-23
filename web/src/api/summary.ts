import type { Summary } from '../types/records';
import { request } from './client';

export async function getSummary() {
  const data = await request<{ summary: Summary }>('/records/summary');
  return data.summary;
}
