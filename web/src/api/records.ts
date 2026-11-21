import { request } from './client';
import { getRecordsBase } from './recordsScope';

// What every record type (allergies, conditions, visits, medications) can do.
export type RecordApi<T, I> = {
  list: () => Promise<T[]>;
  create: (input: I) => Promise<T>;
  update: (id: string, input: I) => Promise<T>;
  remove: (id: string) => Promise<void>;
};

// plural is the key of the list ("allergies"); singular is the key of one item ("allergy").
// path is the URL segment when it differs from plural (lab results answer as lab_results at /records/lab-results).
export function createRecordApi<T, I>(plural: string, singular: string, path = plural): RecordApi<T, I> {
  // Read each time, not once: the same api is used for a patient's own records and for a doctor's open session.
  const url = () => `${getRecordsBase()}/${path}`;

  return {
    async list() {
      const data = await request<Record<string, T[]>>(url());
      return data[plural];
    },
    async create(input) {
      const data = await request<Record<string, T>>(url(), { method: 'POST', body: input });
      return data[singular];
    },
    async update(id, input) {
      const data = await request<Record<string, T>>(`${url()}/${id}`, { method: 'PUT', body: input });
      return data[singular];
    },
    async remove(id) {
      await request<{ deleted: boolean }>(`${url()}/${id}`, { method: 'DELETE' });
    },
  };
}
